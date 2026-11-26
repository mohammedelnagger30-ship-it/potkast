-- Lifetime listening analytics for the admin panel.
--
-- The users table shows one number for "الاستماع". This migration makes that
-- number explicitly cumulative since the user first opened the app, and adds
-- the supporting report (first/last listen, active days, per-category and
-- per-episode breakdown) without changing the existing dashboard payload.
--
-- Safe to re-run. Depends on 20261125190000_admin_dashboard.sql.
-- No temp tables or DO blocks, so it works on pooled SQL runners.

-- ---------------------------------------------------------------------------
-- 1) Dashboard wrapper that adds a per-user lifetime listening summary
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

  v_dashboard := public.admin_get_dashboard();

  with history as (
    select lh.user_id,
           sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as history_seconds,
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
    select lh.user_id,
           coalesce(c.name_ar, 'غير مصنّف') as category,
           sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as seconds
    from public.listening_history lh
    join public.episodes e on e.id = lh.episode_id
    join public.podcasts p on p.id = e.podcast_id
    left join public.categories c on c.id = p.category_id
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
    'lifetimeSeconds', greatest(coalesce(s.stats_seconds, 0), coalesce(h.history_seconds, 0)),
    'historySeconds', coalesce(h.history_seconds, 0),
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
  left join history h on h.user_id = pr.id
  left join stats s on s.user_id = pr.id
  left join category_json cj on cj.user_id = pr.id;

  return v_dashboard || jsonb_build_object('listeningReport', v_report);
end;
$fn$;

revoke all on function public.admin_get_dashboard_with_listening() from public, anon;
grant execute on function public.admin_get_dashboard_with_listening() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Full listening report for one user (opened from the user detail modal)
-- ---------------------------------------------------------------------------
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

  with history as (
    select sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as history_seconds,
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
    select coalesce(c.name_ar, 'غير مصنّف') as category,
           sum(greatest(coalesce(lh.progress_seconds, 0), 0))::bigint as seconds
    from public.listening_history lh
    join public.episodes e on e.id = lh.episode_id
    join public.podcasts p on p.id = e.podcast_id
    left join public.categories c on c.id = p.category_id
    where lh.user_id = p_user_id
    group by 1
  ),
  category_json as (
    select jsonb_agg(jsonb_build_object('category', category, 'seconds', seconds) order by seconds desc) as items
    from per_category
  )
  select jsonb_build_object(
    'userId', p_user_id,
    'joinedAt', (select created_at from public.profiles where id = p_user_id),
    'lifetimeSeconds', greatest(coalesce(s.stats_seconds, 0), coalesce(h.history_seconds, 0)),
    'historySeconds', coalesce(h.history_seconds, 0),
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

-- Verify in the SQL editor (the RPC itself needs the admin JWT from the app):
-- select pr.id,
--        greatest(coalesce(s.total_listening_seconds, 0), coalesce(h.total, 0)) as lifetime_seconds
-- from public.profiles pr
-- left join public.user_stats s on s.user_id = pr.id
-- left join (select user_id, sum(greatest(coalesce(progress_seconds, 0), 0))::bigint as total
--            from public.listening_history group by 1) h on h.user_id = pr.id
-- order by lifetime_seconds desc;
