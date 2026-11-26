-- Professional notification delivery: settings for every user, user-controlled
-- notification types, local reminder time, idempotent daily delivery and push
-- subscription storage. Safe to re-run; no temp tables / DO blocks.
--
-- Requires the tables from:
--   20261010050643_create_notifications_table.sql
--   20261011180555_create_tips_and_notif_settings.sql

-- ---------------------------------------------------------------------------
-- 1) Settings completeness and per-type preferences
-- ---------------------------------------------------------------------------

alter table public.notification_settings
  add column if not exists timezone text not null default 'UTC',
  add column if not exists types_enabled text[] not null default
    '{tip,reminder,streak_lost,mission_assigned,mission_completed,achievement,new_episode,app_update,admin}',
  add column if not exists device_token text,
  add column if not exists push_platform text not null default 'web';

-- The digest used to silently skip users who never opened the settings page.
insert into public.notification_settings (user_id, reminder_time, timezone)
select u.id, coalesce(p.reminder_time, '08:00'), 'UTC'
from auth.users as u
left join public.profiles as p on p.id = u.id
on conflict (user_id) do nothing;

create or replace function public.ensure_notification_settings_for_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $fn$
begin
  insert into public.notification_settings (user_id, reminder_time)
  values (
    new.id,
    coalesce((select reminder_time from public.profiles where id = new.id), '08:00')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$fn$;

revoke all on function public.ensure_notification_settings_for_user() from public, anon;
drop trigger if exists on_auth_user_created_notification_settings on auth.users;
create trigger on_auth_user_created_notification_settings
  after insert on auth.users
  for each row execute function public.ensure_notification_settings_for_user();

-- ---------------------------------------------------------------------------
-- 2) One delivery per type per local day, even if the function is retried
-- ---------------------------------------------------------------------------

create table if not exists public.notification_deliveries (
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, type, sent_on)
);

alter table public.notification_deliveries enable row level security;
revoke all on table public.notification_deliveries from anon;
revoke all on table public.notification_deliveries from authenticated;
grant select on table public.notification_deliveries to authenticated;
grant all on table public.notification_deliveries to service_role;

-- Enqueue an in-app notification and return the push subscription in one call.
-- p_force is used for explicit test notifications only.
create or replace function public.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_link text default null,
  p_day date default current_date,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_inserted integer;
  v_subscription jsonb;
  v_platform text;
begin
  if not p_force and not exists (
    select 1
    from public.notification_settings as s
    where s.user_id = p_user_id
      and coalesce(s.types_enabled, '{}'::text[]) @> array[p_type]
  ) then
    return jsonb_build_object('success', false, 'reason', 'disabled');
  end if;

  insert into public.notification_deliveries (user_id, type, sent_on)
  values (p_user_id, p_type, p_day)
  on conflict do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 and not p_force then
    return jsonb_build_object('success', false, 'reason', 'duplicate');
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, coalesce(p_body, ''), p_link);

  select push_subscription, push_platform
  into v_subscription, v_platform
  from public.notification_settings
  where user_id = p_user_id;

  return jsonb_build_object(
    'success', true,
    'pushSubscription', coalesce(v_subscription, 'null'::jsonb),
    'pushPlatform', coalesce(v_platform, 'web')
  );
end;
$fn$;

revoke all on function public.enqueue_notification(uuid, text, text, text, text, date, boolean)
  from public, anon, authenticated;
grant execute on function public.enqueue_notification(uuid, text, text, text, text, date, boolean)
  to service_role;

-- Realtime: the client subscribes to its own notification rows. Add the table
-- to the publication only once (helper avoids DO blocks in pooled runners).
create or replace function public.enable_notifications_realtime()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object or undefined_object then null;
end;
$fn$;

revoke all on function public.enable_notifications_realtime() from public, anon;
grant execute on function public.enable_notifications_realtime() to service_role;
select public.enable_notifications_realtime();
drop function if exists public.enable_notifications_realtime();

-- ---------------------------------------------------------------------------
-- 3) Event notifications (mission assigned/completed, achievement unlocked)
--    The Edge Function drains unsent rows as push messages after each run.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists push_sent boolean not null default false;

create index if not exists notifications_push_pending_idx
  on public.notifications (push_sent, created_at desc);

create or replace function public.create_notification_event(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default '',
  p_link text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $fn$
begin
  -- A signed-in user may only create events for themselves. The Edge Function
  -- calls this as service_role, where auth.uid() is NULL.
  if p_user_id <> coalesce(auth.uid(), p_user_id) then
    return;
  end if;

  if not exists (
    select 1
    from public.notification_settings as s
    where s.user_id = p_user_id
      and coalesce(s.types_enabled, '{}'::text[]) @> array[p_type]
  ) then
    return;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, coalesce(p_body, ''), p_link);
end;
$fn$;

revoke all on function public.create_notification_event(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.create_notification_event(uuid, text, text, text, text)
  to authenticated, service_role;

create or replace function public.notify_mission_event()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_type text;
  v_title text;
  v_body text;
begin
  if tg_op = 'INSERT' then
    v_type := 'mission_assigned';
    v_title := 'مهمة جديدة لك';
    select title into v_body from public.missions where id = new.mission_id;
  elsif tg_op = 'UPDATE' and new.status = 'completed'
        and coalesce(old.status, '') <> 'completed' then
    v_type := 'mission_completed';
    v_title := 'أكملت مهمة!';
    select title into v_body from public.missions where id = new.mission_id;
    v_body := 'أكملت: ' || coalesce(v_body, '');
  else
    return null;
  end if;

  perform public.create_notification_event(
    new.user_id, v_type, v_title, coalesce(v_body, ''), '/missions'
  );
  return null;
end;
$fn$;

drop trigger if exists notify_mission_event_trigger on public.user_missions;
create trigger notify_mission_event_trigger
  after insert or update of status on public.user_missions
  for each row execute function public.notify_mission_event();

create or replace function public.notify_achievement_event()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $fn$
begin
  perform public.create_notification_event(
    new.user_id, 'achievement', 'إنجاز جديد!',
    coalesce(new.achievement_id, 'إنجاز'), '/achievements'
  );
  return null;
end;
$fn$;

drop trigger if exists notify_achievement_event_trigger on public.user_achievements;
create trigger notify_achievement_event_trigger
  after insert on public.user_achievements
  for each row execute function public.notify_achievement_event();

-- ---------------------------------------------------------------------------
-- 4) Cron calls every 5 minutes so the user's chosen HH:MM is respected.
--    Set app.cron_secret and the CRON_SECRET Edge Function secret to lock it.
-- ---------------------------------------------------------------------------

create or replace function public.trigger_daily_digest()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $digest$
begin
  return net.http_post(
    url := 'https://qmbblyzathrfvyqtisur.supabase.co/functions/v1/daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_kjKBayc9CPDKiZmkG_jSSw_63vi_chU',
      'Authorization', 'Bearer sb_publishable_kjKBayc9CPDKiZmkG_jSSw_63vi_chU',
      'x-sada-cron-secret', coalesce(current_setting('app.cron_secret', true), '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$digest$;

revoke all on function public.trigger_daily_digest() from public;
grant execute on function public.trigger_daily_digest() to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'sada-daily-digest';
select cron.schedule(
  'sada-daily-digest',
  '*/5 * * * *',
  'select public.trigger_daily_digest();'
);

-- Admin reset must also clear the delivery ledger and push token.
create or replace function public.admin_reset_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  delete from public.listening_history where user_id = p_user_id;
  delete from public.listening_sessions where user_id = p_user_id;
  delete from public.listening_minute_remainder where user_id = p_user_id;
  delete from public.listening_xp_state where user_id = p_user_id;
  delete from public.listening_repair_state where user_id = p_user_id;
  delete from public.notification_deliveries where user_id = p_user_id;
  delete from public.user_missions where user_id = p_user_id;
  delete from public.category_progress where user_id = p_user_id;
  delete from public.favorites where user_id = p_user_id;
  delete from public.episode_favorites where user_id = p_user_id;
  delete from public.host_follows where user_id = p_user_id;
  delete from public.user_achievements where user_id = p_user_id;
  delete from public.journal_entries where user_id = p_user_id;
  delete from public.life_wheel_assessments where user_id = p_user_id;
  delete from public.wheel_spins where user_id = p_user_id;
  delete from public.user_path_enrollments where user_id = p_user_id;
  delete from public.user_path_step_progress where user_id = p_user_id;
  delete from public.episode_bookmarks where user_id = p_user_id;
  delete from public.episode_notes where user_id = p_user_id;
  delete from public.leaderboard_opt_outs where user_id = p_user_id;
  delete from public.notifications where user_id = p_user_id;

  update public.profiles set xp = 0, updated_at = now() where id = p_user_id;
  insert into public.user_stats (user_id, total_xp, level, updated_at)
  values (p_user_id, 0, 1, now())
  on conflict (user_id) do update set
    total_xp = 0, level = 1, current_streak = 0, longest_streak = 0,
    last_active_date = NULL, total_listening_seconds = 0, missions_completed = 0,
    updated_at = now();

  update public.notification_settings
  set device_token = null, push_enabled = false, push_subscription = null,
      last_tip_sent_on = null, last_reminder_sent_on = null,
      last_streak_notice_on = null, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$fn$;

revoke all on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_reset_user(uuid) to authenticated, service_role;

-- Verify with:
--   select count(*) as settings_rows from public.notification_settings;
--   select jobname, schedule from cron.job where jobname = 'sada-daily-digest';
