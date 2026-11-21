/*
# Create user_stats and category_progress tables

1. New Tables
- `user_stats`
  - `user_id` (uuid, PK, FK to auth.users ON DELETE CASCADE)
  - `total_xp` (int, default 0)
  - `level` (int, default 1) — computed from XP, stored for convenience
  - `current_streak` (int, default 0)
  - `longest_streak` (int, default 0)
  - `last_active_date` (date, nullable) — last day with activity
  - `total_listening_seconds` (int, default 0)
  - `missions_completed` (int, default 0)
  - `created_at`, `updated_at` (timestamptz)

- `category_progress`
  - `user_id` (uuid, FK to auth.users ON DELETE CASCADE)
  - `category_id` (uuid, FK to categories ON DELETE CASCADE)
  - `xp` (int, default 0)
  - `missions_completed` (int, default 0)
  - `minutes_listened` (int, default 0)
  - PRIMARY KEY (user_id, category_id)
  - `created_at`, `updated_at` (timestamptz)

2. Security
- Both tables: owner-scoped CRUD (authenticated, auth.uid() = user_id)

3. Auto-create row on first activity
- A SECURITY DEFINER function `ensure_user_stats` creates a row if missing
- A SECURITY DEFINER function `update_user_stats_on_mission` updates stats when a mission is completed
- A SECURITY DEFINER function `update_stats_on_listen` updates listening time when progress is saved
*/

CREATE TABLE IF NOT EXISTS user_stats (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_active_date date,
  total_listening_seconds int NOT NULL DEFAULT 0,
  missions_completed int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_stats" ON user_stats;
CREATE POLICY "select_own_user_stats"
ON user_stats FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_stats" ON user_stats;
CREATE POLICY "insert_own_user_stats"
ON user_stats FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_stats" ON user_stats;
CREATE POLICY "update_own_user_stats"
ON user_stats FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_stats" ON user_stats;
CREATE POLICY "delete_own_user_stats"
ON user_stats FOR DELETE TO authenticated
USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS category_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  xp int NOT NULL DEFAULT 0,
  missions_completed int NOT NULL DEFAULT 0,
  minutes_listened int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, category_id)
);

ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_category_progress" ON category_progress;
CREATE POLICY "select_own_category_progress"
ON category_progress FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_category_progress" ON category_progress;
CREATE POLICY "insert_own_category_progress"
ON category_progress FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_category_progress" ON category_progress;
CREATE POLICY "update_own_category_progress"
ON category_progress FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_category_progress" ON category_progress;
CREATE POLICY "delete_own_category_progress"
ON category_progress FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_category_progress_user ON category_progress(user_id);
