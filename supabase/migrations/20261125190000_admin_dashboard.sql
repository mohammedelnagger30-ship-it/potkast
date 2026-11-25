/*
  Admin control panel.

  - `admin_emails`: allowlist of accounts allowed to open /admin. Emails are
    matched against the caller's JWT claim, so a normal user cannot grant
    themselves access by editing a profile.
  - `admin_is_admin()`: tiny helper used by the UI guard.
  - `admin_get_dashboard()`: one SECURITY DEFINER RPC that returns everything
    the admin screen needs (users + emails, progress, activity, catalog stats).
  - `admin_*` action RPCs: every one re-checks `admin_is_admin()` before doing
    anything, so keeping the anon key in the browser is safe.

  Run this file in the Supabase SQL editor (or `supabase db push`).
  Then sign up / sign in in the app with the admin email below.
*/

-- ============================================================
-- 1. Admin allowlist
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text PRIMARY KEY,
  label text NOT NULL DEFAULT 'مدير الموقع',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon or authenticated:
-- normal users cannot even see who the admins are. The SECURITY DEFINER
-- functions below (owned by postgres) can read it.
REVOKE ALL ON public.admin_emails FROM anon, authenticated;
GRANT SELECT ON public.admin_emails TO service_role;

-- The admin account. The password is never stored in this repo — create the
-- account from /auth in the app with this email and your password.
INSERT INTO public.admin_emails (email, label, active)
VALUES ('mohammedibrahim12@gmail.com', 'مدير الموقع', true)
ON CONFLICT (email) DO UPDATE SET active = true, label = excluded.label;

-- ============================================================
-- 2. Access check
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT coalesce((
    SELECT true
    FROM public.admin_emails e
    WHERE e.active
      AND lower(e.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ), false);
$$;

REVOKE ALL ON FUNCTION public.admin_is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_is_admin() TO authenticated, service_role;

-- ============================================================
-- 3. Full dashboard payload
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_get_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_users jsonb;
  v_totals jsonb;
  v_activity jsonb;
  v_levels jsonb;
  v_interests jsonb;
  v_recent jsonb;
  v_top_podcasts jsonb;
  v_top_hosts jsonb;
  v_admins jsonb;
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  -- Per-user aggregation -------------------------------------------------
  WITH base AS (
    SELECT
      p.id,
      p.name,
      p.avatar,
      p.interests,
      p.daily_goal_minutes,
      p.reminder_time,
      p.onboarded,
      p.xp,
      p.created_at,
      p.updated_at,
      u.email,
      u.last_sign_in_at,
      u.email_confirmed_at,
      u.banned_until
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
  ),
  listen AS (
    SELECT user_id,
           count(*) AS episodes_started,
           count(*) FILTER (WHERE completed) AS episodes_completed,
           coalesce(sum(progress_seconds), 0)::bigint AS progress_seconds,
           max(updated_at) AS last_listen_at
    FROM public.listening_history GROUP BY user_id
  ),
  missions AS (
    SELECT user_id,
           count(*) FILTER (WHERE status = 'completed') AS missions_completed,
           count(*) FILTER (WHERE status = 'assigned') AS missions_pending,
           max(completed_at) AS last_mission_at
    FROM public.user_missions GROUP BY user_id
  ),
  favs AS (
    SELECT user_id, count(*) AS podcast_favorites FROM public.favorites GROUP BY user_id
  ),
  ep_favs AS (
    SELECT user_id, count(*) AS episode_favorites FROM public.episode_favorites GROUP BY user_id
  ),
  follows AS (
    SELECT user_id, count(*) AS hosts_followed FROM public.host_follows GROUP BY user_id
  ),
  achievements AS (
    SELECT user_id, count(*) AS achievements FROM public.user_achievements GROUP BY user_id
  ),
  journals AS (
    SELECT user_id, count(*) AS journal_entries, max(created_at) AS last_journal_at
    FROM public.journal_entries GROUP BY user_id
  ),
  wheels AS (
    SELECT user_id, count(*) AS wheel_spins FROM public.wheel_spins GROUP BY user_id
  ),
  paths AS (
    SELECT user_id, count(*) AS paths_enrolled FROM public.user_path_enrollments GROUP BY user_id
  ),
  bookmarks AS (
    SELECT user_id, count(*) AS bookmarks FROM public.episode_bookmarks GROUP BY user_id
  ),
  notes AS (
    SELECT user_id, count(*) AS episode_notes FROM public.episode_notes GROUP BY user_id
  ),
  notifs AS (
    SELECT user_id, count(*) AS notifications, max(created_at) AS last_notification_at
    FROM public.notifications GROUP BY user_id
  ),
  stats AS (
    SELECT user_id,
           total_xp,
           level,
           current_streak,
           longest_streak,
           last_active_date,
           total_listening_seconds,
           missions_completed AS stats_missions_completed,
           updated_at AS stats_updated_at
    FROM public.user_stats
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'email', b.email,
      'name', coalesce(nullif(btrim(coalesce(b.name, '')), ''), split_part(b.email, '@', 1)),
      'avatar', b.avatar,
      'interests', to_jsonb(coalesce(b.interests, '{}'::text[])),
      'dailyGoalMinutes', b.daily_goal_minutes,
      'reminderTime', b.reminder_time,
      'onboarded', b.onboarded,
      'emailConfirmed', b.email_confirmed_at IS NOT NULL,
      'banned', b.banned_until IS NOT NULL AND b.banned_until > now(),
      'isAdmin', EXISTS (
        SELECT 1 FROM public.admin_emails e
        WHERE e.active AND lower(e.email) = lower(coalesce(b.email, ''))
      ),
      'xp', greatest(coalesce(b.xp, 0), 0),
      'level', greatest(1, floor(sqrt(greatest(coalesce(b.xp, 0), 0)::numeric / 50.0))::int + 1),
      'streak', coalesce(s.current_streak, 0),
      'longestStreak', coalesce(s.longest_streak, 0),
      'listeningSeconds', greatest(coalesce(s.total_listening_seconds, 0), coalesce(l.progress_seconds, 0)::int),
      'episodesStarted', coalesce(l.episodes_started, 0),
      'episodesCompleted', coalesce(l.episodes_completed, 0),
      'missionsCompleted', coalesce(m.missions_completed, 0),
      'missionsPending', coalesce(m.missions_pending, 0),
      'podcastFavorites', coalesce(f.podcast_favorites, 0),
      'episodeFavorites', coalesce(ef.episode_favorites, 0),
      'hostsFollowed', coalesce(fo.hosts_followed, 0),
      'achievements', coalesce(a.achievements, 0),
      'journalEntries', coalesce(j.journal_entries, 0),
      'wheelSpins', coalesce(w.wheel_spins, 0),
      'pathsEnrolled', coalesce(pa.paths_enrolled, 0),
      'bookmarks', coalesce(bm.bookmarks, 0),
      'episodeNotes', coalesce(n.episode_notes, 0),
      'notifications', coalesce(nf.notifications, 0),
      'createdAt', b.created_at,
      'updatedAt', b.updated_at,
      'lastSignInAt', b.last_sign_in_at,
      'lastActiveAt', greatest(
        b.last_sign_in_at,
        l.last_listen_at,
        m.last_mission_at,
        j.last_journal_at,
        nf.last_notification_at,
        s.last_active_date::timestamptz,
        b.updated_at
      )
    ) ORDER BY greatest(coalesce(b.xp, 0), 0) DESC
  ), '[]'::jsonb)
  INTO v_users
  FROM base b
  LEFT JOIN listen l ON l.user_id = b.id
  LEFT JOIN missions m ON m.user_id = b.id
  LEFT JOIN favs f ON f.user_id = b.id
  LEFT JOIN ep_favs ef ON ef.user_id = b.id
  LEFT JOIN follows fo ON fo.user_id = b.id
  LEFT JOIN achievements a ON a.user_id = b.id
  LEFT JOIN journals j ON j.user_id = b.id
  LEFT JOIN wheels w ON w.user_id = b.id
  LEFT JOIN paths pa ON pa.user_id = b.id
  LEFT JOIN bookmarks bm ON bm.user_id = b.id
  LEFT JOIN notes n ON n.user_id = b.id
  LEFT JOIN notifs nf ON nf.user_id = b.id
  LEFT JOIN stats s ON s.user_id = b.id;

  -- Headline numbers -----------------------------------------------------
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM auth.users),
    'profiles', (SELECT count(*) FROM public.profiles),
    'onboarded', (SELECT count(*) FROM public.profiles WHERE onboarded),
    'admins', (SELECT count(*) FROM public.admin_emails WHERE active),
    'activeToday', (
      SELECT count(DISTINCT user_id) FROM (
        SELECT user_id, updated_at AS at FROM public.listening_history
        UNION ALL SELECT user_id, completed_at FROM public.user_missions WHERE completed_at IS NOT NULL
        UNION ALL SELECT user_id, created_at FROM public.journal_entries
        UNION ALL SELECT id, last_sign_in_at FROM auth.users
      ) e WHERE e.at >= current_date AND e.at < current_date + 1
    ),
    'activeWeek', (
      SELECT count(DISTINCT user_id) FROM (
        SELECT user_id, updated_at AS at FROM public.listening_history
        UNION ALL SELECT user_id, completed_at FROM public.user_missions WHERE completed_at IS NOT NULL
        UNION ALL SELECT user_id, created_at FROM public.journal_entries
        UNION ALL SELECT id, last_sign_in_at FROM auth.users
      ) e WHERE e.at >= now() - interval '7 days'
    ),
    'listeningHours', coalesce((
      SELECT round(sum(coalesce(total_listening_seconds, 0)) / 3600.0, 1) FROM public.user_stats
    ), 0),
    'missionsCompleted', (SELECT count(*) FROM public.user_missions WHERE status = 'completed'),
    'episodesCompleted', (SELECT count(*) FROM public.listening_history WHERE completed),
    'totalXp', coalesce((SELECT sum(greatest(coalesce(xp, 0), 0)) FROM public.profiles), 0),
    'hosts', (SELECT count(*) FROM public.hosts),
    'podcasts', (SELECT count(*) FROM public.podcasts),
    'episodes', (SELECT count(*) FROM public.episodes),
    'categories', (SELECT count(*) FROM public.categories),
    'notifications', (SELECT count(*) FROM public.notifications),
    'journalEntries', (SELECT count(*) FROM public.journal_entries),
    'achievementsUnlocked', (SELECT count(*) FROM public.user_achievements)
  ) INTO v_totals;

  -- Last 30 days of activity --------------------------------------------
  WITH days AS (
    SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day
  ),
  listened AS (
    SELECT updated_at::date AS day, count(*) AS c FROM public.listening_history GROUP BY 1
  ),
  completed AS (
    SELECT completed_at::date AS day, count(*) AS c FROM public.user_missions
    WHERE completed_at IS NOT NULL GROUP BY 1
  ),
  act AS (
    SELECT at::date AS day, count(DISTINCT user_id) AS c FROM (
      SELECT user_id, updated_at AS at FROM public.listening_history
      UNION ALL SELECT user_id, completed_at FROM public.user_missions WHERE completed_at IS NOT NULL
      UNION ALL SELECT user_id, created_at FROM public.journal_entries
    ) e GROUP BY 1
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'day', to_char(d.day, 'YYYY-MM-DD'),
    'label', to_char(d.day, 'DD/MM'),
    'listens', coalesce(li.c, 0),
    'missions', coalesce(co.c, 0),
    'activeUsers', coalesce(ac.c, 0)
  ) ORDER BY d.day), '[]'::jsonb)
  INTO v_activity
  FROM days d
  LEFT JOIN listened li ON li.day = d.day
  LEFT JOIN completed co ON co.day = d.day
  LEFT JOIN act ac ON ac.day = d.day;

  -- Level distribution (same formula as src/lib/gamification.ts) ---------
  -- The per-level counts are computed in a separate query level: Postgres
  -- does not allow count() to be nested directly inside jsonb_agg().
  WITH levels AS (
    SELECT greatest(1, least(20, floor(sqrt(greatest(coalesce(xp, 0), 0)::numeric / 50.0))::int + 1)) AS level
    FROM public.profiles
  ),
  level_counts AS (
    SELECT g.level, count(l.level) AS c
    FROM generate_series(1, 20) g(level)
    LEFT JOIN levels l ON l.level = g.level
    GROUP BY g.level
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('level', level, 'count', c) ORDER BY level), '[]'::jsonb)
  INTO v_levels
  FROM level_counts;

  -- Interest distribution ------------------------------------------------
  SELECT coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'count', t.c) ORDER BY t.c DESC), '[]'::jsonb)
  INTO v_interests
  FROM (
    SELECT unnest(coalesce(interests, '{}'::text[])) AS name, count(*) AS c
    FROM public.profiles GROUP BY 1
  ) t;

  -- Recent activity feed -------------------------------------------------
  WITH users AS (
    SELECT p.id,
           coalesce(nullif(btrim(coalesce(p.name, '')), ''), split_part(u.email, '@', 1)) AS name,
           u.email
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
  ),
  events AS (
    SELECT 'listen' AS type, 'استماع حلقة' AS label, e.title AS item, us.name, us.email, l.updated_at AS at
    FROM public.listening_history l JOIN public.episodes e ON e.id = l.episode_id JOIN users us ON us.id = l.user_id
    UNION ALL
    SELECT 'mission', 'مهمة مكتملة', m.title, us.name, us.email, um.completed_at
    FROM public.user_missions um JOIN public.missions m ON m.id = um.mission_id JOIN users us ON us.id = um.user_id
    WHERE um.completed_at IS NOT NULL
    UNION ALL
    SELECT 'favorite', 'إضافة للمفضلة', p.title, us.name, us.email, f.created_at
    FROM public.favorites f JOIN public.podcasts p ON p.id = f.podcast_id JOIN users us ON us.id = f.user_id
    UNION ALL
    SELECT 'journal', 'تسجيل يوميات', 'تأمل يومي', us.name, us.email, j.created_at
    FROM public.journal_entries j JOIN users us ON us.id = j.user_id
    UNION ALL
    SELECT 'signup', 'حساب جديد', us.email, us.name, us.email, us2.created_at
    FROM auth.users us2 JOIN users us ON us.id = us2.id
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'type', type, 'label', label, 'item', item, 'name', name, 'email', email, 'at', at
  ) ORDER BY at DESC), '[]'::jsonb)
  INTO v_recent
  FROM (SELECT * FROM events ORDER BY at DESC LIMIT 25) top_events;

  -- Most played content --------------------------------------------------
  -- Counts are precomputed in derived tables so the outer jsonb_agg() never
  -- wraps another aggregate call.
  WITH top_podcasts AS (
    SELECT p.*, (SELECT count(*) FROM public.episodes e WHERE e.podcast_id = p.id) AS episode_count
    FROM public.podcasts p
    ORDER BY p.plays_count DESC
    LIMIT 8
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'title', p.title, 'hostName', p.host_name,
    'coverUrl', p.cover_url, 'plays', p.plays_count, 'episodes', p.episode_count
  ) ORDER BY p.plays_count DESC), '[]'::jsonb)
  INTO v_top_podcasts
  FROM top_podcasts p;

  WITH top_hosts AS (
    SELECT h.*, (SELECT count(*) FROM public.host_follows hf WHERE hf.host_id = h.id) AS follower_count
    FROM public.hosts h
    ORDER BY h.followers_count DESC
    LIMIT 8
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id, 'name', h.name_ar, 'slug', h.slug,
    'photoUrl', h.photo_url, 'specialty', h.specialty_ar, 'followers', h.follower_count
  ) ORDER BY h.follower_count DESC), '[]'::jsonb)
  INTO v_top_hosts
  FROM top_hosts h;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'email', e.email, 'label', e.label, 'active', e.active, 'createdAt', e.created_at
  ) ORDER BY e.email), '[]'::jsonb)
  INTO v_admins
  FROM public.admin_emails e;

  RETURN jsonb_build_object(
    'generatedAt', now(),
    'isAdmin', true,
    'totals', v_totals,
    'users', v_users,
    'activity', v_activity,
    'levels', v_levels,
    'interests', v_interests,
    'recentActivity', v_recent,
    'topPodcasts', v_top_podcasts,
    'topHosts', v_top_hosts,
    'admins', v_admins
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_dashboard() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_dashboard() TO authenticated, service_role;

-- ============================================================
-- 4. Admin actions (each one re-checks access)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_send_notification(
  p_user_id uuid, p_title text, p_body text, p_link text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'العنوان مطلوب';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  VALUES (p_user_id, 'admin', left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  p_title text, p_body text, p_link text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_count int;
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'العنوان مطلوب';
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, link)
  SELECT u.id, 'admin', left(p_title, 200), left(coalesce(p_body, ''), 1000), p_link
  FROM auth.users u;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'sent', v_count);
END;
$$;

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
  v_level := greatest(1, floor(sqrt(v_xp::numeric / 50.0))::int + 1);

  UPDATE public.profiles SET xp = v_xp, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.user_stats (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, v_xp, v_level, now())
  ON CONFLICT (user_id) DO UPDATE
    SET total_xp = excluded.total_xp, level = excluded.level, updated_at = now();

  RETURN jsonb_build_object('success', true, 'xp', v_xp, 'level', v_level);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reset_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.listening_history WHERE user_id = p_user_id;
  DELETE FROM public.user_missions WHERE user_id = p_user_id;
  DELETE FROM public.category_progress WHERE user_id = p_user_id;
  DELETE FROM public.favorites WHERE user_id = p_user_id;
  DELETE FROM public.episode_favorites WHERE user_id = p_user_id;
  DELETE FROM public.host_follows WHERE user_id = p_user_id;
  DELETE FROM public.user_achievements WHERE user_id = p_user_id;
  DELETE FROM public.journal_entries WHERE user_id = p_user_id;
  DELETE FROM public.life_wheel_assessments WHERE user_id = p_user_id;
  DELETE FROM public.wheel_spins WHERE user_id = p_user_id;
  DELETE FROM public.user_path_enrollments WHERE user_id = p_user_id;
  DELETE FROM public.user_path_step_progress WHERE user_id = p_user_id;
  DELETE FROM public.episode_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.episode_notes WHERE user_id = p_user_id;
  DELETE FROM public.leaderboard_opt_outs WHERE user_id = p_user_id;
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  UPDATE public.profiles SET xp = 0, updated_at = now() WHERE id = p_user_id;
  INSERT INTO public.user_stats (user_id, total_xp, level, updated_at)
  VALUES (p_user_id, 0, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp = 0, level = 1, current_streak = 0, longest_streak = 0,
    last_active_date = NULL, total_listening_seconds = 0, missions_completed = 0,
    updated_at = now();

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_ban(p_user_id uuid, p_banned boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك حظر حسابك أنت';
  END IF;

  UPDATE auth.users
  SET banned_until = CASE WHEN p_banned THEN now() + interval '100 years' ELSE NULL END
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'banned', p_banned);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_email text;
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'لا يمكنك حذف حسابك أنت';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'المستخدم غير موجود');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.admin_emails e
    WHERE e.active AND lower(e.email) = lower(v_email)
  ) THEN
    RAISE EXCEPTION 'لا يمكن حذف حساب أدمن';
  END IF;

  -- All public tables reference auth.users with ON DELETE CASCADE.
  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_admin_email(p_email text, p_active boolean DEFAULT true)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF NOT public.admin_is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'إيميل غير صالح';
  END IF;
  IF NOT p_active AND v_email = lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'لا يمكنك إلغاء صلاحيتك أنت';
  END IF;

  INSERT INTO public.admin_emails (email, label, active)
  VALUES (v_email, 'مدير الموقع', p_active)
  ON CONFLICT (email) DO UPDATE SET active = excluded.active;

  RETURN jsonb_build_object('success', true, 'email', v_email, 'active', p_active);
END;
$$;

REVOKE ALL ON FUNCTION
  public.admin_send_notification(uuid, text, text, text),
  public.admin_broadcast_notification(text, text, text),
  public.admin_set_user_xp(uuid, integer),
  public.admin_reset_user(uuid),
  public.admin_set_user_ban(uuid, boolean),
  public.admin_delete_user(uuid),
  public.admin_set_admin_email(text, boolean)
FROM public, anon;

GRANT EXECUTE ON FUNCTION
  public.admin_send_notification(uuid, text, text, text),
  public.admin_broadcast_notification(text, text, text),
  public.admin_set_user_xp(uuid, integer),
  public.admin_reset_user(uuid),
  public.admin_set_user_ban(uuid, boolean),
  public.admin_delete_user(uuid),
  public.admin_set_admin_email(text, boolean)
TO authenticated, service_role;
