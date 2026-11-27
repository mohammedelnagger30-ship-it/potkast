-- A historical catch-up row was added to the listening ledger without the
-- matching user_stats update, so a user could see a different number in the
-- admin lifetime report (ledger) than in their own stats snapshot.
--
-- The ledger remains the source of truth. Re-run safely: only rows that differ
-- from the ledger sum are touched, and no XP is awarded (the hourly XP state
-- is driven by new non-legacy ledger inserts, not by this repair).

update public.user_stats s
set total_listening_seconds = coalesce((
  select sum(greatest(ls.seconds, 0))::bigint
  from public.listening_sessions ls
  where ls.user_id = s.user_id
), 0)::int,
    updated_at = now()
where s.total_listening_seconds is distinct from coalesce((
  select sum(greatest(ls.seconds, 0))::bigint
  from public.listening_sessions ls
  where ls.user_id = s.user_id
), 0)::int;
