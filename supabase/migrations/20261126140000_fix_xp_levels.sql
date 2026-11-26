-- One authoritative, atomic XP source and a hard level cap at 20.
--
-- Before this migration three screens did a read-modify-write on profiles.xp
-- (missions, daily wheel, learning paths), so two fast awards could overwrite
-- each other. user_stats.total_xp was updated only for missions, so stores
-- drifted apart, and admin could show level 21+ while the app capped at 20.
--
-- Run this in Supabase SQL Editor (direct writes from the app are blocked).

-- Atomic award: the increment happens in the database, not from a stale client
-- read. profiles.xp and user_stats stay in sync in the same transaction.
CREATE OR REPLACE FUNCTION public.add_xp(p_user_id uuid, p_amount int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_amount int; v_xp int; v_level int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not allowed to change this user XP' USING ERRCODE = '42501';
  END IF;

  v_amount := greatest(coalesce(p_amount, 0), 0);

  SELECT greatest(coalesce(xp, 0), 0) INTO v_xp
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
  END IF;

  v_xp := v_xp + v_amount;
  v_level := least(20, greatest(1, floor(sqrt(v_xp::numeric / 50.0))::int + 1));

  UPDATE public.profiles
  SET xp = v_xp, updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.user_stats (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, v_xp, v_level, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = excluded.total_xp,
        level = excluded.level,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'xp', v_xp, 'level', v_level);
END;
$$;

REVOKE ALL ON FUNCTION public.add_xp(uuid, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_xp(uuid, integer) TO authenticated, service_role;

-- Admin-set XP uses the same cap.
CREATE OR REPLACE FUNCTION public.admin_set_user_xp(p_user_id uuid, p_xp int)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_xp int; v_level int;
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  v_xp := greatest(coalesce(p_xp, 0), 0);
  v_level := least(20, greatest(1, floor(sqrt(v_xp::numeric / 50.0))::int + 1));

  UPDATE public.profiles SET xp = v_xp, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.user_stats (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, v_xp, v_level, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = excluded.total_xp, level = excluded.level, updated_at = now();

  RETURN jsonb_build_object('success', true, 'xp', v_xp, 'level', v_level);
END;
$$;

-- Repair existing drift: profiles.xp is the value shown across the app and
-- used by the leaderboard/admin, so user_stats is reconciled from it.
UPDATE public.user_stats s
SET total_xp = greatest(coalesce(p.xp, 0), 0),
    level = least(20, greatest(1, floor(sqrt(greatest(coalesce(p.xp, 0), 0)::numeric / 50.0))::int + 1)),
    updated_at = now()
FROM public.profiles p
WHERE s.user_id = p.id;

INSERT INTO public.user_stats (user_id, total_xp, level, updated_at)
SELECT p.id,
       greatest(coalesce(p.xp, 0), 0),
       least(20, greatest(1, floor(sqrt(greatest(coalesce(p.xp, 0), 0)::numeric / 50.0))::int + 1)),
       now()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_stats s WHERE s.user_id = p.id
);
