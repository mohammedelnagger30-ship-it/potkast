-- Dedupe Yasser Al Hazimi: keep full host (yasser-hizimi), remove duplicate host/podcast.
-- Idempotent. Run in Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
  v_keep_host uuid := '75474ef0-7037-4424-b0c2-23c22d94dda9'::uuid; -- yasser-hizimi
  v_dup_host  uuid := '998f0385-c2d2-470e-9ba0-d43b614df3f5'::uuid; -- yasser-alhazimi
  v_dup_pod   uuid := 'a3875752-ce56-4ede-847c-05332ae7b483'::uuid; -- duplicate "دورة الشخصية القوية"
  v_keep_pod  uuid := 'b4a07d09-39a2-4e34-9c2a-e04215eb455f'::uuid; -- canonical under keep host
BEGIN
  -- Move any non-duplicate podcasts from duplicate host to keep host (defensive)
  UPDATE podcasts
  SET host_id = v_keep_host,
      host_name = COALESCE(NULLIF(host_name, ''), 'ياسر الحزيمي')
  WHERE host_id = v_dup_host
    AND id <> v_dup_pod
    AND NOT EXISTS (SELECT 1 FROM podcasts p2 WHERE p2.id = podcasts.id AND p2.host_id = v_keep_host);

  -- Remap duplicate-episode references to canonical episodes by normalized title within keep podcast
  IF EXISTS (SELECT 1 FROM podcasts WHERE id = v_keep_pod) AND EXISTS (SELECT 1 FROM podcasts WHERE id = v_dup_pod) THEN
    -- listening_history
    UPDATE listening_history lh
    SET episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE lh.episode_id = dep.id
      AND dep.podcast_id = v_dup_pod
      AND NOT EXISTS (
        SELECT 1 FROM listening_history lh2
        WHERE lh2.user_id = lh.user_id AND lh2.episode_id = kep.id
      );

    DELETE FROM listening_history lh
    USING episodes dep
    WHERE lh.episode_id = dep.id AND dep.podcast_id = v_dup_pod;

    -- episode_favorites
    UPDATE episode_favorites ef
    SET episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE ef.episode_id = dep.id
      AND dep.podcast_id = v_dup_pod
      AND NOT EXISTS (
        SELECT 1 FROM episode_favorites ef2
        WHERE ef2.user_id = ef.user_id AND ef2.episode_id = kep.id
      );

    DELETE FROM episode_favorites ef
    USING episodes dep
    WHERE ef.episode_id = dep.id AND dep.podcast_id = v_dup_pod;

    -- learning_path_steps linked episodes
    UPDATE learning_path_steps lps
    SET linked_episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE lps.linked_episode_id = dep.id
      AND dep.podcast_id = v_dup_pod;

    UPDATE learning_path_steps lps
    SET linked_episode_id = NULL
    FROM episodes dep
    WHERE lps.linked_episode_id = dep.id
      AND dep.podcast_id = v_dup_pod;
  END IF;

  -- Favorites on duplicate podcast: move to canonical if missing, else delete
  UPDATE favorites f
  SET podcast_id = v_keep_pod
  WHERE f.podcast_id = v_dup_pod
    AND NOT EXISTS (
      SELECT 1 FROM favorites f2 WHERE f2.user_id = f.user_id AND f2.podcast_id = v_keep_pod
    );
  DELETE FROM favorites WHERE podcast_id = v_dup_pod;

  -- Host follows: move dup host followers to keep host
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='host_follows') THEN
    EXECUTE '
      INSERT INTO host_follows (user_id, host_id, created_at)
      SELECT user_id, $1, created_at
      FROM host_follows WHERE host_id = $2
      ON CONFLICT DO NOTHING
    ' USING v_keep_host, v_dup_host;
    EXECUTE 'DELETE FROM host_follows WHERE host_id = $1' USING v_dup_host;
  END IF;

  -- Remove duplicate podcast episodes/podcast
  DELETE FROM episodes WHERE podcast_id = v_dup_pod;
  DELETE FROM podcasts WHERE id = v_dup_pod;

  -- Any remaining podcasts under dup host: reassign to keep host
  UPDATE podcasts SET host_id = v_keep_host, host_name = COALESCE(NULLIF(host_name,''),'ياسر الحزيمي') WHERE host_id = v_dup_host;

  -- Remove duplicate host
  DELETE FROM hosts WHERE id = v_dup_host;

  -- Normalize keep host display
  UPDATE hosts
  SET name_ar = 'ياسر الحزيمي',
      slug = 'yasser-hizimi',
      title_ar = COALESCE(NULLIF(title_ar,''), 'كاتب ومتحدث'),
      specialty_ar = COALESCE(NULLIF(specialty_ar,''), 'القيادة وتطوير الذات')
  WHERE id = v_keep_host;
END $$;

COMMIT;