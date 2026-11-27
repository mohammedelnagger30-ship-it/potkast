-- The canonical listening RPC updated listening_minute_remainder in two steps:
--   UPDATE SET remainder = remainder + v_seconds;  -- can become >= 60
--   UPDATE SET remainder = v_acc % 60;
-- The table has CHECK (remainder >= 0 AND remainder < 60), so the first UPDATE
-- failed whenever a save crossed a minute boundary (e.g. 55 + 30 = 85). The
-- whole RPC then rolled back: the seconds were not credited and the resume
-- position was not saved. This looked like "listening stopped counting".
--
-- Compute the total in memory and write only the reduced value, exactly like
-- the hourly XP remainder already does.

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
  v_old_remainder int;
  v_total int;
  v_minutes int;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.episodes where id = p_episode_id) then
    return jsonb_build_object('success', false, 'reason', 'unknown episode');
  end if;

  -- The legacy-credit trigger must skip this write: the exact delta is added
  -- to the ledger explicitly below. The setting lasts only for this transaction.
  perform set_config('app.listening_rpc', 'on', true);

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

      -- Lock the row so concurrent 5-second saves cannot lose a delta, and
      -- write only the reduced value so the CHECK constraint is never violated
      -- by an intermediate remainder >= 60.
      select remainder into v_old_remainder
      from public.listening_minute_remainder
      where user_id = v_user and category_id = v_category
      for update;

      v_total := coalesce(v_old_remainder, 0) + v_seconds;
      v_minutes := floor(v_total::numeric / 60.0)::int;

      update public.listening_minute_remainder
      set remainder = v_total % 60
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
