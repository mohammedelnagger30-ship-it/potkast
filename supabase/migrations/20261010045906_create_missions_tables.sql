/*
# Create missions tables for Nammy

1. New Tables
- `missions`
  - `id` (uuid, primary key)
  - `title` (text, not null) — mission title in Arabic
  - `description` (text) — what to do and why
  - `category_id` (uuid, FK to categories) — which interest area
  - `difficulty` (text) — one of: easy, medium, hard
  - `xp_reward` (int) — XP points awarded on completion
  - `duration_minutes` (int) — estimated time to complete
  - `type` (text) — one of: daily, weekly, challenge
  - `linked_episode_id` (uuid, FK to episodes, nullable) — optional podcast episode to listen to
  - `created_at` (timestamptz)

- `user_missions`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users ON DELETE CASCADE)
  - `mission_id` (uuid, FK to missions ON DELETE CASCADE)
  - `status` (text) — one of: pending, in_progress, completed
  - `started_at` (timestamptz, nullable)
  - `completed_at` (timestamptz, nullable)
  - `notes` (text, nullable) — reflection note
  - `assigned_date` (date) — the day this mission was assigned (for daily auto-assign dedup)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, mission_id, assigned_date) to prevent duplicate assignments per day

2. Security
- `missions`: public read (TO anon, authenticated), no client writes
- `user_missions`: owner-scoped CRUD (authenticated only, auth.uid() = user_id)
  - user_id defaults to auth.uid() so inserts work without passing it

3. Indexes
- `user_missions.user_id` — for listing a user's missions
- `user_missions.assigned_date` — for checking today's assignments
- `user_missions.status` — for filtering by status
*/

CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  difficulty text NOT NULL DEFAULT 'easy',
  xp_reward int NOT NULL DEFAULT 50,
  duration_minutes int DEFAULT 10,
  type text NOT NULL DEFAULT 'daily',
  linked_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_missions" ON missions;
CREATE POLICY "read_missions"
ON missions FOR SELECT
TO anon, authenticated
USING (true);

CREATE TABLE IF NOT EXISTS user_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, mission_id, assigned_date)
);

ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_user_missions" ON user_missions;
CREATE POLICY "select_own_user_missions"
ON user_missions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_missions" ON user_missions;
CREATE POLICY "insert_own_user_missions"
ON user_missions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_missions" ON user_missions;
CREATE POLICY "update_own_user_missions"
ON user_missions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_missions" ON user_missions;
CREATE POLICY "delete_own_user_missions"
ON user_missions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_assigned_date ON user_missions(assigned_date);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_category_id ON missions(category_id);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
