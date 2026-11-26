-- Repair daily mission assignment after the catalogue was replaced.
--
-- Problem: a user who already had `user_missions` rows for today was skipped by
-- assign_daily_missions(), even when those rows pointed at archived missions.
-- The daily tab hid them but the stats card still counted them, so the page
-- showed "3 مهام اليوم" together with an empty list.
--
-- This version counts only active daily missions, fills missing difficulty
-- levels, cleans up unfinished rows that point at archived missions, and then
-- reassigns. Completed rows are never deleted.
--
-- Safe to re-run. No temp tables or DO blocks, so any SQL runner works.

create or replace function public.assign_daily_missions()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $assign$
declare
  v_today date := (now() at time zone 'UTC')::date;
  v_user record;
  v_level text;
  v_daily_count integer;
  v_rows integer;
  v_total integer := 0;
begin
  for v_user in
    select id, coalesce(interests, '{}'::text[]) as interests
    from public.profiles
  loop
    select count(*) into v_daily_count
    from public.user_missions as um
    join public.missions as m on m.id = um.mission_id
    where um.user_id = v_user.id
      and um.assigned_date = v_today
      and m.type = 'daily';

    if v_daily_count >= 3 then
      continue;
    end if;

    foreach v_level in array array['easy', 'medium', 'hard'] loop
      if exists (
        select 1
        from public.user_missions as um
        join public.missions as m on m.id = um.mission_id
        where um.user_id = v_user.id
          and um.assigned_date = v_today
          and m.type = 'daily'
          and m.difficulty = v_level
      ) then
        continue;
      end if;

      insert into public.user_missions (user_id, mission_id, status, assigned_date)
      select v_user.id, m.id, 'pending', v_today
      from public.missions as m
      left join public.categories as c on c.id = m.category_id
      where m.type = 'daily'
        and m.difficulty = v_level
        and not exists (
          select 1 from public.user_missions as um
          where um.user_id = v_user.id
            and um.assigned_date = v_today
            and um.mission_id = m.id
        )
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
      limit 1;

      get diagnostics v_rows = row_count;
      v_daily_count := v_daily_count + v_rows;
      v_total := v_total + v_rows;
    end loop;

    if v_daily_count < 3 then
      insert into public.user_missions (user_id, mission_id, status, assigned_date)
      select v_user.id, m.id, 'pending', v_today
      from public.missions as m
      left join public.categories as c on c.id = m.category_id
      where m.type = 'daily'
        and not exists (
          select 1 from public.user_missions as um
          where um.user_id = v_user.id
            and um.assigned_date = v_today
            and um.mission_id = m.id
        )
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
      limit 3 - v_daily_count;

      get diagnostics v_rows = row_count;
      v_total := v_total + v_rows;
    end if;
  end loop;

  return v_total;
end;
$assign$;

revoke all on function public.assign_daily_missions() from public;
grant execute on function public.assign_daily_missions() to authenticated, service_role;

-- Drop only unfinished rows that point at archived missions from the old pool.
-- Completed rows stay in the history so XP and stats are never lost.
delete from public.user_missions as um
using public.missions as m
where m.id = um.mission_id
  and m.type = 'archived'
  and um.assigned_date = (now() at time zone 'UTC')::date
  and um.status in ('pending', 'in_progress');

-- Give everyone a fresh balanced set for today (idempotent).
select public.assign_daily_missions();

-- Verify with:
-- select um.user_id, count(*) filter (where m.type = 'daily') as daily,
--        count(*) filter (where m.type = 'archived') as archived
-- from public.user_missions um join public.missions m on m.id = um.mission_id
-- where um.assigned_date = (now() at time zone 'UTC')::date
-- group by 1 order by 1;
