-- Reward 50 XP for every cumulative 60 minutes of real listening in the app.
--
-- Requires the canonical listening ledger from
--   20261127140000_fix_listening_accounting.sql
-- and the atomic XP function from
--   20261126140000_fix_xp_levels.sql
--
-- Safe to re-run. No temp tables and no DO blocks (pooled SQL runner safe).
--
-- Design:
--   * listening_sessions is the append-only ledger of real playback seconds.
--   * A trigger on that ledger accumulates a per-user remainder. Every time
--     the remainder crosses 3600 seconds it awards exactly 50 XP per hour.
--   * add_xp() keeps profiles.xp, user_stats.total_xp and level in sync, so
--     overlapping 5-second saves can never double-credit a stale value.
--   * Existing users are initialised from the hours they already have, so the
--     reward applies from this migration onwards rather than retroactively.

-- ---------------------------------------------------------------------------
-- 1) Per-user hour remainder
-- ---------------------------------------------------------------------------

create table if not exists public.listening_xp_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credited_hours integer not null default 0 check (credited_hours >= 0),
  seconds_remainder integer not null default 0 check (seconds_remainder >= 0 and seconds_remainder < 3600),
  updated_at timestamptz not null default now()
);

alter table public.listening_xp_state enable row level security;

revoke all on table public.listening_xp_state from anon;
revoke all on table public.listening_xp_state from authenticated;
grant all on table public.listening_xp_state to service_role;

drop policy if exists "own_listening_xp_state_select" on public.listening_xp_state;
create policy "own_listening_xp_state_select"
on public.listening_xp_state for select to authenticated
using (auth.uid() = user_id);
grant select on table public.listening_xp_state to authenticated;

-- Seed existing listening hours without granting retroactive XP.
insert into public.listening_xp_state (user_id, credited_hours, seconds_remainder, updated_at)
select
  user_id,
  floor(coalesce(total_listening_seconds, 0)::numeric / 3600.0)::int,
  0,
  now()
from public.user_stats
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 2) Trigger: every full hour of live listening = +50 XP
-- ---------------------------------------------------------------------------

create or replace function public.listening_sessions_hour_xp()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_user uuid := new.user_id;
  v_remainder integer;
  v_accumulated integer;
  v_hours integer;
begin
  -- Repair rows are historical data, not new listening. Never reward them.
  if coalesce(new.is_legacy, false) or coalesce(new.seconds, 0) <= 0 then
    return new;
  end if;

  insert into public.listening_xp_state (user_id, credited_hours, seconds_remainder, updated_at)
  values (v_user, 0, 0, now())
  on conflict (user_id) do nothing;

  -- Lock the row so two concurrent 5-second saves cannot both count the same hour.
  -- Reduce the remainder in the SAME update: the column CHECK (< 3600) is
  -- validated at the end of the statement, so a raw addition would fail.
  select seconds_remainder into v_remainder
  from public.listening_xp_state
  where user_id = v_user
  for update;

  v_accumulated := v_remainder + new.seconds;
  v_hours := floor(v_accumulated::numeric / 3600.0)::int;

  update public.listening_xp_state
  set seconds_remainder = v_accumulated % 3600,
      credited_hours = credited_hours + v_hours,
      updated_at = now()
  where user_id = v_user;

  if v_hours > 0 then
    -- Atomic award: profiles.xp, user_stats.total_xp and level move together.
    perform public.add_xp(v_user, 50 * v_hours);
  end if;

  return new;
end;
$$;

revoke all on function public.listening_sessions_hour_xp() from public, anon;
grant execute on function public.listening_sessions_hour_xp() to authenticated, service_role;

drop trigger if exists listening_sessions_hour_xp_trigger on public.listening_sessions;
create trigger listening_sessions_hour_xp_trigger
after insert on public.listening_sessions
for each row execute function public.listening_sessions_hour_xp();

-- ---------------------------------------------------------------------------
-- 3) Admin reset must also clear the hour counter
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
  delete from public.listening_xp_state where user_id = p_user_id;
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

-- Verify with:
--   select user_id, credited_hours, seconds_remainder
--   from public.listening_xp_state
--   order by credited_hours desc;
