-- Repair for 20261127160000_professional_notifications.sql.
-- Earlier versions of that migration referenced notification columns that do
-- not exist, so its final admin_reset_user() statement could fail. This file
-- is safe to run on a fresh or partially migrated database.

alter table public.notification_settings
  add column if not exists timezone text not null default 'UTC',
  add column if not exists types_enabled text[] not null default
    '{tip,reminder,streak_lost,mission_assigned,mission_completed,achievement,new_episode,app_update,admin}',
  add column if not exists device_token text,
  add column if not exists push_platform text not null default 'web';

-- The digest Edge Function needs full service_role access to these tables.
grant all on table public.notification_settings to service_role;
grant all on table public.notifications to service_role;

alter table public.notification_settings
  drop constraint if exists notification_settings_reminder_time_check;
alter table public.notification_settings
  add constraint notification_settings_reminder_time_check
  check (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on table public.app_secrets from anon, authenticated;
grant all on table public.app_secrets to service_role;

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
  set device_token = null, push_platform = 'web', push_enabled = false,
      push_subscription = null, updated_at = now()
  where user_id = p_user_id;

  return jsonb_build_object('success', true);
end;
$fn$;

revoke all on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_reset_user(uuid) to authenticated, service_role;

-- Verify with:
--   select user_id, reminder_time, timezone, push_platform,
--          coalesce(array_length(types_enabled, 1), 0) as types
--   from public.notification_settings limit 5;
