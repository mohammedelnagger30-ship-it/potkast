-- Deep fix for drifting/inflated listening numbers in the admin panel.
--
-- Root causes this migration removes:
--   1. user_stats.total_listening_seconds was written with a client-side
--      read-modify-write, so overlapping saves could overwrite each other.
--   2. The player credited the difference between absolute playback
--      positions, so seeking (or reloading) was counted as listening time.
--   3. listening_history.progress_seconds was overwritten with the current
--      position, so replaying/seeking backwards reduced "furthest progress".
--   4. The admin dashboard used greatest(user_stats, sum(progress_seconds)),
--      mixing credited seconds with episode positions. A data repair could
--      therefore make the displayed number suddenly drop.
--
-- New source of truth: public.listening_sessions is an append-only ledger of
-- real playback seconds. Existing stats are repaired once from listening_history
-- (capped at each episode's real duration) and copied into the ledger. From
-- then on the number only grows. listening_history remains resume/completion
-- state only and is monotonic.
--
-- Safe to re-run. No temp tables and no DO blocks (pooled SQL runner safe).

-- ---------------------------------------------------------------------------
-- 1) Ledger, repair marker and server-side minute remainder
-- ---------------------------------------------------------------------------
create table if not exists public.listening_sessions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  episode_id uuid references public.episodes(id) on delete set null,
  seconds integer not null default 0 check (seconds >= 0),
  category_id uuid references public.categories(id) on delete set null,
  is_legacy boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists listening_sessions_user_created_idx
  on public.listening_sessions (user_id, created_at desc);

create table if not exists public.listening_repair_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  repaired_at timestamptz not null default now()
);

create table if not exists public.listening_minute_remainder (
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  remainder integer not null default 0 check (remainder >= 0 and remainder < 60),
  primary key (user_id, category_id)
);

alter table public.listening_sessions enable row level security;
alter table public.listening_repair_state enable row level security;
alter table public.listening_minute_remainder enable row level security;

revoke all on public.listening_sessions from anon, authenticated;
revoke all on public.listening_repair_state from anon, authenticated;
revoke all on public.listening_minute_remainder from anon, authenticated;
grant select on public.listening_sessions to service_role;
grant select on public.listening_repair_state to service_role;
grant select on public.listening_minute_remainder to service_role;

-- One-time repair: mark users, seed a legacy ledger row, and replace the
-- corrupted user_stats value with a capped sum of real progress. Because the
-- marker insert is ON CONFLICT DO NOTHING, re-running never rewrites new data.
with baseline as (
  select lh.user_id,
         sum(
           case
             when coalesce(e.duration_seconds, 0) > 0
               then least(greatest(coalesce(lh.progress_seconds, 0), 0), e.duration_seconds::bigint)
             else greatest(coalesce(lh.progress_seconds, 0), 0)
           end
         )::bigint as seconds
  from public.listening_history lh
  left join public.episodes e on e.id = lh.episode_id
  group by lh.user_id
),
marked as (
  insert into public.listening_repair_state (user_id)
  select u.id from auth.users u
  on conflict (user_id) do nothing
  returning user_id
),
ledger as (
  insert into public.listening_sessions (user_id, seconds, is_legacy)
  select m.user_id, coalesce(b.seconds, 0)::int, true
  from marked m
  left join baseline b on b.user_id = m.user_id
  returning user_id
),
stats_seed as (
  insert into public.user_stats (user_id, total_listening_seconds, updated_at)
  select l.user_id, 0, now() from ledger l
  on conflict (user_id) do nothing
  returning user_id
)
update public.user_stats s
set total_listening_seconds = coalesce(b.seconds, 0)::int,
    updated_at = now()
from ledger l
left join baseline b on b.user_id = l.user_id
where s.user_id = l.user_id;

-- ---------------------------------------------------------------------------
-- 2) Single safe write path for the player
-- ---------------------------------------------------------------------------
create or replace function public.record_listening_progress(
  p_episode_id uuid,
  p_position_seconds integer,
  p_listened_seconds integer,
  p_completed boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_user uuid := auth.uid();
  v_position int := greatest(coalesce(p_position_seconds, 0), 0);
  v_seconds int := greatest(coalesce(p_listened_seconds, 0), 0);
  v_done boolean := coalesce(p_completed, false);
  v_category uuid;
  v_acc int;
  v_minutes int;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.episodes where id = p_episode_id) then
    return jsonb_build_object('success', false, 'reason', 'unknown episode');
  end if;

  -- Resume/completion state is monotonic: never let a replay or a seek
  -- backwards erase the furthest position or a completed flag.
  insert into public.listening_history (user_id, episode_id, progress_seconds, completed, updated_at)
  values (v_user, p_episode_id, v_position, v_done, now())
  on conflict (user_id, episode_id) do update
    set progress_seconds = greatest(public.listening_history.progress_seconds, excluded.progress_seconds),
        completed = public.listening_history.completed or excluded.completed,
        updated_at = now();

  if v_seconds > 0 then
    select p.category_id into v_category
    from public.episodes e
    join public.podcasts p on p.id = e.podcast_id
    where e.id = p_episode_id;

    -- Append-only audit trail. This is what admin reads, so a stale client
    -- cannot roll the number backwards.
    insert into public.listening_sessions (user_id, episode_id, seconds, category_id, is_legacy)
    values (v_user, p_episode_id, v_seconds, v_category, false);

    -- Atomic increment for every other screen that reads user_stats.
    insert into public.user_stats (user_id, total_listening_seconds, updated_at)
    values (v_user, v_seconds, now())
    on conflict (user_id) do update
      set total_listening_seconds = greatest(coalesce(public.user_stats.total_listening_seconds, 0), 0) + v_seconds,
          updated_at = now();

    if v_category is not null then
      insert into public.category_progress (user_id, category_id, xp, missions_completed, minutes_listened)
      values (v_user, v_category, 0, 0, 0)
      on conflict (user_id, category_id) do nothing;

      insert into public.listening_minute_remainder (user_id, category_id, remainder)
      values (v_user, v_category, 0)
      on conflict (user_id, category_id) do nothing;

      update public.listening_minute_remainder
      set remainder = remainder + v_seconds
      where user_id = v_user and category_id = v_category
      returning remainder into v_acc;

      v_minutes := floor(v_acc / 60.0)::int;
      update public.listening_minute_remainder
      set remainder = v_acc % 60
      where user_id = v_user and category_id = v_category;

      if v_minutes > 0 then
        update public.category_progress
        set minutes_listened = coalesce(minutes_listened, 0) + v_minutes,
            updated_at = now()
        where user_id = v_user and category_id = v_category;
      end if;
    end if;
  end if;

  return jsonb_build_object('success', true, 'creditedSeconds', v_seconds);
end;
$fn$;

revoke all on function public.record_listening_progress(uuid, integer, integer, boolean) from public, anon;
grant execute on function public.record_listening_progress(uuid, integer, integer, boolean) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) Canonical admin dashboard (patches the legacy payload in place)
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_dashboard_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_dashboard jsonb;
  v_users jsonb;
  v_total_seconds bigint;
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  v_dashboard := public.admin_get_dashboard();

  with canon as (
    select user_id, sum(seconds)::bigint as seconds
    from public.listening_sessions
    group by user_id
  )
  select coalesce(jsonb_agg(
           u.value || jsonb_build_object('listeningSeconds', coalesce(c.seconds, 0))
         ), '[]'::jsonb)
  into v_users
  from jsonb_array_elements(v_dashboard->'users') as u(value)
  left join canon c on c.user_id = (u.value->>'id')::uuid;

  v_dashboard := jsonb_set(v_dashboard, '{users}', coalesce(v_users, '[]'::jsonb));

  select coalesce(sum(seconds), 0) into v_total_seconds from public.listening_sessions;
  v_dashboard := jsonb_set(
    v_dashboard,
    '{totals,listeningHours}',
    to_jsonb(round(v_total_seconds::numeric / 3600.0, 1))
  );

  return v_dashboard;
end;
$fn$;

revoke all on function public.admin_get_dashboard_v2() from public, anon;
grant execute on function public.admin_get_dashboard_v2() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4) Lifetime listening report, now backed by the ledger
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_dashboard_with_listening()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_dashboard jsonb;
  v_report jsonb;
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  v_dashboard := public.admin_get_dashboard_v2();

  with ledger as (
    select user_id, sum(greatest(seconds, 0))::bigint as lifetime_seconds
    from public.listening_sessions
    group by user_id
  ),
  history as (
    select lh.user_id,
           sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as progress_seconds,
           min(lh.updated_at) as first_listen_at,
           max(lh.updated_at) as last_listen_at,
           count(*) filter (where greatest(coalesce(lh.progress_seconds, 0), 0) > 0) as episodes_started,
           count(*) filter (where lh.completed) as episodes_completed,
           count(distinct lh.updated_at::date) as active_days
    from public.listening_history lh
    group by lh.user_id
  ),
  stats as (
    select user_id, greatest(coalesce(total_listening_seconds, 0), 0)::bigint as stats_seconds
    from public.user_stats
  ),
  per_category as (
    select s.user_id,
           coalesce(c.name_ar, 'بيانات سابقة') as category,
           sum(greatest(s.seconds, 0))::bigint as seconds
    from public.listening_sessions s
    left join public.categories c on c.id = s.category_id
    where s.seconds > 0
    group by 1, 2
  ),
  category_json as (
    select user_id,
           jsonb_agg(jsonb_build_object('category', category, 'seconds', seconds) order by seconds desc) as items
    from per_category
    group by user_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'userId', pr.id,
    'joinedAt', pr.created_at,
    'lifetimeSeconds', coalesce(l.lifetime_seconds, 0),
    'historySeconds', coalesce(h.progress_seconds, 0),
    'statsSeconds', coalesce(s.stats_seconds, 0),
    'firstListenAt', h.first_listen_at,
    'lastListenAt', h.last_listen_at,
    'episodesStarted', coalesce(h.episodes_started, 0),
    'episodesCompleted', coalesce(h.episodes_completed, 0),
    'activeDays', coalesce(h.active_days, 0),
    'byCategory', coalesce(cj.items, '[]'::jsonb)
  )), '[]'::jsonb)
  into v_report
  from public.profiles pr
  left join ledger l on l.user_id = pr.id
  left join history h on h.user_id = pr.id
  left join stats s on s.user_id = pr.id
  left join category_json cj on cj.user_id = pr.id;

  return v_dashboard || jsonb_build_object('listeningReport', v_report);
end;
$fn$;

revoke all on function public.admin_get_dashboard_with_listening() from public, anon;
grant execute on function public.admin_get_dashboard_with_listening() to authenticated, service_role;

create or replace function public.admin_get_user_listening(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $fn$
declare
  v_summary jsonb;
  v_episodes jsonb;
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  with ledger as (
    select sum(greatest(seconds, 0))::bigint as lifetime_seconds
    from public.listening_sessions
    where user_id = p_user_id
  ),
  history as (
    select sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as progress_seconds,
           min(lh.updated_at) as first_listen_at,
           max(lh.updated_at) as last_listen_at,
           count(*) filter (where greatest(coalesce(lh.progress_seconds, 0), 0) > 0) as episodes_started,
           count(*) filter (where lh.completed) as episodes_completed,
           count(distinct lh.updated_at::date) as active_days
    from public.listening_history lh
    where lh.user_id = p_user_id
  ),
  stats as (
    select greatest(coalesce(total_listening_seconds, 0), 0)::bigint as stats_seconds
    from public.user_stats
    where user_id = p_user_id
  ),
  per_category as (
    select coalesce(c.name_ar, 'بيانات سابقة') as category,
           sum(greatest(s.seconds, 0))::bigint as seconds
    from public.listening_sessions s
    left join public.categories c on c.id = s.category_id
    where s.user_id = p_user_id and s.seconds > 0
    group by 1
  ),
  category_json as (
    select jsonb_agg(jsonb_build_object('category', category, 'seconds', seconds) order by seconds desc) as items
    from per_category
  )
  select jsonb_build_object(
    'userId', p_user_id,
    'joinedAt', (select created_at from public.profiles where id = p_user_id),
    'lifetimeSeconds', coalesce(l.lifetime_seconds, 0),
    'historySeconds', coalesce(h.progress_seconds, 0),
    'statsSeconds', coalesce(s.stats_seconds, 0),
    'firstListenAt', h.first_listen_at,
    'lastListenAt', h.last_listen_at,
    'episodesStarted', coalesce(h.episodes_started, 0),
    'episodesCompleted', coalesce(h.episodes_completed, 0),
    'activeDays', coalesce(h.active_days, 0),
    'byCategory', coalesce(cj.items, '[]'::jsonb)
  )
  into v_summary
  from (select 1) as one
  left join ledger l on true
  left join history h on true
  left join stats s on true
  left join category_json cj on true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'episodeId', e.id,
    'title', e.title,
    'podcastTitle', p.title,
    'category', coalesce(c.name_ar, 'غير مصنّف'),
    'durationSeconds', coalesce(e.duration_seconds, 0),
    'progressSeconds', greatest(coalesce(lh.progress_seconds, 0), 0),
    'percent', case
      when coalesce(e.duration_seconds, 0) > 0
      then least(100, round(100.0 * greatest(coalesce(lh.progress_seconds, 0), 0) / e.duration_seconds))::int
      else 0
    end,
    'completed', coalesce(lh.completed, false),
    'updatedAt', lh.updated_at
  ) order by greatest(coalesce(lh.progress_seconds, 0), 0) desc), '[]'::jsonb)
  into v_episodes
  from public.listening_history lh
  join public.episodes e on e.id = lh.episode_id
  left join public.podcasts p on p.id = e.podcast_id
  left join public.categories c on c.id = p.category_id
  where lh.user_id = p_user_id;

  return jsonb_build_object('summary', v_summary, 'episodes', coalesce(v_episodes, '[]'::jsonb));
end;
$fn$;

revoke all on function public.admin_get_user_listening(uuid) from public, anon;
grant execute on function public.admin_get_user_listening(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) Admin reset must clear the ledger too
-- ---------------------------------------------------------------------------
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
  delete from public.listening_repair_state where user_id = p_user_id;
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

  return jsonb_build_object('success', true);
end;
$fn$;

revoke all on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_reset_user(uuid) to authenticated, service_role;

-- Optional manual sync if user_stats ever drifts from the ledger.
create or replace function public.rebuild_listening_time_from_sessions()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $fn$
declare v_count integer;
begin
  if not public.admin_is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.user_stats s
  set total_listening_seconds = coalesce(c.seconds, 0)::int,
      updated_at = now()
  from (
    select user_id, sum(greatest(seconds, 0))::bigint as seconds
    from public.listening_sessions
    group by user_id
  ) c
  where s.user_id = c.user_id;

  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke all on function public.rebuild_listening_time_from_sessions() from public, anon;
grant execute on function public.rebuild_listening_time_from_sessions() to authenticated, service_role;

-- Verification (run in SQL editor after applying):
-- select (select count(*) from public.listening_sessions where is_legacy) as legacy_rows,
--        (select count(*) from public.listening_sessions where not is_legacy) as live_rows;
-- select user_id, sum(seconds) as listening_seconds
-- from public.listening_sessions group by 1 order by 2 desc;
