/*
  Add episode favorites support.
  - New table episode_favorites (user_id, episode_id)
  - RLS owner-scoped CRUD
  - Idempotent
*/

BEGIN;

CREATE TABLE IF NOT EXISTS episode_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);

ALTER TABLE episode_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_episode_favorites" ON episode_favorites;
CREATE POLICY "select_own_episode_favorites"
ON episode_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_episode_favorites" ON episode_favorites;
CREATE POLICY "insert_own_episode_favorites"
ON episode_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_episode_favorites" ON episode_favorites;
CREATE POLICY "delete_own_episode_favorites"
ON episode_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_episode_favorites_user_id ON episode_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_favorites_episode_id ON episode_favorites(episode_id);

COMMIT;
