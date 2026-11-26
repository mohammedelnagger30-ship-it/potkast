-- Server-side daily mission assignment + daily digest scheduling.
-- Safe to re-run: functions are replaced and cron jobs are recreated by name.
-- Dates use UTC to match the app's today calculation (new Date().toISOString().split('T')[0]).

set search_path = public, extensions;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Assign 3 daily missions to every profile that has none assigned for today.
-- Missions matching the profile interests are preferred, then random fillers.
create or replace function public.assign_daily_missions()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $assign$
declare
  v_today date := (now() at time zone 'UTC')::date;
  v_user record;
  v_inserted integer := 0;
  v_count integer;
begin
  for v_user in
    select id, coalesce(interests, '{}'::text[]) as interests
    from public.profiles
  loop
    if exists (
      select 1
      from public.user_missions
      where user_id = v_user.id
        and assigned_date = v_today
    ) then
      continue;
    end if;

    insert into public.user_missions (user_id, mission_id, status, assigned_date)
    select v_user.id, m.id, 'pending', v_today
    from public.missions as m
    left join public.categories as c on c.id = m.category_id
    where m.type = 'daily'
    order by
      coalesce((
        select bool_or(
          case lower(x.val)
            when 'spiritual' then 'روحاني / ديني'
            when 'science' then 'العلوم'
            when 'culture' then 'ثقافة وأدب'
            when 'health' then 'الصحة واللياقة'
            when 'career' then 'المسيرة المهنية'
            when 'finance' then 'المال والاستثمار'
            when 'relationships' then 'العلاقات والأسرة'
            when 'mental' then 'الصحة النفسية'
            when 'leadership' then 'القيادة'
            when 'technology' then 'التقنية'
            else null
          end = c.name_ar
        )
        from unnest(v_user.interests) as x(val)
      ), false) desc,
      random()
    limit 3;

    get diagnostics v_count = row_count;
    v_inserted := v_inserted + v_count;
  end loop;

  return v_inserted;
end;
$assign$;

revoke all on function public.assign_daily_missions() from public;
grant execute on function public.assign_daily_missions() to authenticated;

-- Invoke the daily-digest edge function from Postgres. verify_jwt = false in
-- supabase/config.toml, so the publishable key is enough to reach the function.
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
      'Authorization', 'Bearer sb_publishable_kjKBayc9CPDKiZmkG_jSSw_63vi_chU'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$digest$;

revoke all on function public.trigger_daily_digest() from public;

-- (Re)schedule both jobs. pg_cron times are UTC, same as the app and digest.
do $jobs$
begin
  begin
    perform cron.unschedule('sada-assign-daily-missions');
  exception when others then null;
  end;

  perform cron.schedule(
    'sada-assign-daily-missions',
    '5 * * * *',
    'select public.assign_daily_missions();'
  );

  begin
    perform cron.unschedule('sada-daily-digest');
  exception when others then null;
  end;

  perform cron.schedule(
    'sada-daily-digest',
    '10 * * * *',
    'select public.trigger_daily_digest();'
  );
end;
$jobs$;

-- Assign today's missions immediately for existing users (idempotent).
select public.assign_daily_missions();

-- Verify with:
-- select jobid, jobname, schedule, command from cron.job order by jobname;
