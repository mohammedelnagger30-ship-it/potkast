-- Remove Mustafa Hosny presenter and all related content from catalog.
-- Idempotent. Run in Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
  v_host_id uuid := 'abe32afe-c6ba-4ebe-8b6f-5fc72afc3868'::uuid;
  v_podcast_ids uuid[] := ARRAY[
    '051ca534-aa82-4afb-866e-e376cf205918'::uuid,
    '69b1d3af-b52f-4f57-8161-e51fc0e9bb54'::uuid,
    '61af2925-a46b-42a0-904e-12df31895cca'::uuid,
    'c63dd2bb-6419-4fc8-884e-04cb319dd798'::uuid,
    '0fd27932-c467-4364-bf52-5837c44abc04'::uuid,
    '26e03615-7cfe-4aaa-b64b-b0ca39b746c2'::uuid,
    '4457247b-2edd-4286-a987-b0e6564a406d'::uuid,
    'd47cbf98-c2ec-439e-a973-3235451838e0'::uuid,
    '767fb90d-c94a-4a35-bd85-70713d64cc9b'::uuid,
    'a92c1fe1-b68d-4dd0-b013-c35b6b822c5c'::uuid
  ];
  v_episode_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(e.id), ARRAY[]::uuid[]) INTO v_episode_ids
  FROM episodes e
  WHERE e.podcast_id = ANY(v_podcast_ids);

  -- Dependent user/content rows
  DELETE FROM episode_favorites ef WHERE ef.episode_id = ANY(v_episode_ids);
  DELETE FROM listening_history lh WHERE lh.episode_id = ANY(v_episode_ids);
  DELETE FROM user_path_step_progress ups
  USING learning_path_steps lps
  WHERE ups.step_id = lps.id AND lps.linked_episode_id = ANY(v_episode_ids);

  UPDATE learning_path_steps SET linked_episode_id = NULL WHERE linked_episode_id = ANY(v_episode_ids);

  DELETE FROM favorites f WHERE f.podcast_id = ANY(v_podcast_ids);
  DELETE FROM episodes e WHERE e.podcast_id = ANY(v_podcast_ids);
  DELETE FROM podcasts p WHERE p.id = ANY(v_podcast_ids) OR p.host_id = v_host_id;

  -- Host follows/references if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='host_follows') THEN
    EXECUTE 'DELETE FROM host_follows WHERE host_id = $1' USING v_host_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_followed_hosts') THEN
    EXECUTE 'DELETE FROM user_followed_hosts WHERE host_id = $1' USING v_host_id;
  END IF;

  DELETE FROM hosts h WHERE h.id = v_host_id OR h.slug = 'mustafa-hosny';
END $$;

COMMIT;
