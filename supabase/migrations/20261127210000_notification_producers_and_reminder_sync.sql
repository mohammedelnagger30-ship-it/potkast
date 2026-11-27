-- Keep the daily reminder time consistent everywhere, and make every
-- notification producer respect the user's per-type choices.

-- notification_settings.reminder_time is the canonical value used by the
-- scheduled digest. profiles.reminder_time stays as a mirrored preference for
-- the profile/onboarding forms.
create or replace function public.sync_reminder_time()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $fn$
begin
  if tg_table_name = 'notification_settings' then
    update public.profiles
       set reminder_time = new.reminder_time
     where id = new.user_id
       and reminder_time is distinct from new.reminder_time;
  else
    insert into public.notification_settings (user_id, reminder_time)
    values (new.id, coalesce(new.reminder_time, '08:00'))
    on conflict (user_id) do update
      set reminder_time = excluded.reminder_time
    where public.notification_settings.reminder_time is distinct from excluded.reminder_time;
  end if;
  return null;
end;
$fn$;

revoke all on function public.sync_reminder_time() from public, anon;

drop trigger if exists sync_reminder_time_from_settings on public.notification_settings;
create trigger sync_reminder_time_from_settings
  after insert or update of reminder_time on public.notification_settings
  for each row execute function public.sync_reminder_time();

drop trigger if exists sync_reminder_time_from_profile on public.profiles;
create trigger sync_reminder_time_from_profile
  after insert or update of reminder_time on public.profiles
  for each row execute function public.sync_reminder_time();

-- Admin notifications must honour the same per-type switches as every other
-- producer. Users without a settings row keep the previous default (all on).
create or replace function public.admin_send_notification(
  p_user_id uuid, p_title text, p_body text, p_link text default null
)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $fn$
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'العنوان مطلوب';
  end if;

  if exists (
    select 1 from public.notification_settings s
    where s.user_id = p_user_id
      and not (coalesce(s.types_enabled, '{}'::text[]) @> array['admin']::text[])
  ) then
    return jsonb_build_object('success', true, 'sent', 0, 'reason', 'disabled');
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, 'admin', left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link);

  return jsonb_build_object('success', true, 'sent', 1);
end;
$fn$;

create or replace function public.admin_broadcast_notification(
  p_title text, p_body text, p_link text default null
)
returns jsonb language plpgsql security definer
set search_path = public, auth, pg_temp
as $fn$
declare v_count int;
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;
  if p_title is null or btrim(p_title) = '' then
    raise exception 'العنوان مطلوب';
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select u.id, 'admin', left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link
  from auth.users u
  where not exists (
    select 1 from public.notification_settings s
    where s.user_id = u.id
      and not (coalesce(s.types_enabled, '{}'::text[]) @> array['admin']::text[])
  );

  get diagnostics v_count = row_count;
  return jsonb_build_object('success', true, 'sent', v_count);
end;
$fn$;

-- New episodes notify followers of the podcast's host.
create or replace function public.notify_new_episode()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_host_id uuid;
  v_host_name text;
  v_podcast_title text;
  v_follower record;
begin
  select p.host_id, p.title
    into v_host_id, v_podcast_title
    from public.podcasts p
   where p.id = new.podcast_id;

  if v_host_id is null then
    return null;
  end if;

  select name_ar into v_host_name from public.hosts where id = v_host_id;

  for v_follower in
    select user_id from public.host_follows where host_id = v_host_id
  loop
    perform public.create_notification_event(
      v_follower.user_id,
      'new_episode',
      'حلقة جديدة من ' || coalesce(v_host_name, v_podcast_title, 'سدى'),
      coalesce(new.title, ''),
      '/podcasts/' || new.podcast_id::text
    );
  end loop;

  return null;
end;
$fn$;

drop trigger if exists notify_new_episode_trigger on public.episodes;
create trigger notify_new_episode_trigger
  after insert on public.episodes
  for each row execute function public.notify_new_episode();
