-- Some clients (old APK builds, browser tabs and external media controls)
-- wrote listening_history.progress_seconds directly without ever setting
-- `completed`. The home card therefore showed 0 even after a listener had
-- finished several episodes.
--
-- Keep the 90% rule authoritative in the database and repair the rows that
-- already crossed it. This only changes the sticky UI completion flag; it does
-- not credit XP or listening time (those stay in the append-only ledger).

create or replace function public.sync_listening_completion()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $fn$
declare
  v_duration integer;
begin
  select e.duration_seconds into v_duration
  from public.episodes e
  where e.id = new.episode_id;

  if coalesce(v_duration, 0) > 0
     and coalesce(new.progress_seconds, 0) >= floor(v_duration * 0.9)::integer then
    new.completed := true;
  end if;

  return new;
end;
$fn$;

drop trigger if exists listening_history_completion on public.listening_history;
create trigger listening_history_completion
before insert or update of progress_seconds on public.listening_history
for each row execute function public.sync_listening_completion();

-- One-time repair for history already stored by those clients. Updating only
-- `completed` means neither the legacy-seconds trigger nor the XP ledger fires.
update public.listening_history lh
set completed = true
from public.episodes e
where e.id = lh.episode_id
  and coalesce(e.duration_seconds, 0) > 0
  and coalesce(lh.progress_seconds, 0) >= floor(e.duration_seconds * 0.9)::integer
  and coalesce(lh.completed, false) = false;
