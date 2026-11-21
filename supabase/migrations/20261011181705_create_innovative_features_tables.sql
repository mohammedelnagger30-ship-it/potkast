/*
# Create tables for innovative features

## New Tables:
1. wheel_spins — tracks daily wheel spins (one per day per user)
2. user_achievements — tracks unlocked achievements per user
3. journal_entries — daily reflection notes with mood
4. life_wheel_assessments — 8 life area ratings (1-10) per assessment
5. learning_paths — curated multi-week journeys
6. learning_path_steps — ordered steps in a learning path (podcast, mission, tip)
7. user_path_enrollments — tracks user enrollment and progress in paths
8. user_path_step_progress — tracks completion of individual path steps
9. episode_bookmarks — bookmarks on episodes with timestamp and note
10. episode_notes — personal notes on episodes
11. leaderboard_opt_outs — users who hid themselves from leaderboard

## Security:
- All user-scoped tables have owner-based RLS (auth.uid() = user_id)
- learning_paths and learning_path_steps are public read (authenticated), no client writes
- leaderboard_opt_outs is owner-scoped
*/

-- 1. Wheel spins
CREATE TABLE IF NOT EXISTS wheel_spins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  spin_date date NOT NULL DEFAULT CURRENT_DATE,
  reward_type text NOT NULL CHECK (reward_type IN ('xp', 'tip', 'mission', 'streak_shield')),
  reward_amount int NOT NULL DEFAULT 0,
  reward_detail text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, spin_date)
);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_wheel_spins" ON wheel_spins;
CREATE POLICY "select_own_wheel_spins" ON wheel_spins FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_wheel_spins" ON wheel_spins;
CREATE POLICY "insert_own_wheel_spins" ON wheel_spins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_wheel_spins" ON wheel_spins;
CREATE POLICY "delete_own_wheel_spins" ON wheel_spins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_user ON wheel_spins(user_id);

-- 2. User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_achievements" ON user_achievements;
CREATE POLICY "select_own_achievements" ON user_achievements FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_achievements" ON user_achievements;
CREATE POLICY "insert_own_achievements" ON user_achievements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_achievements" ON user_achievements;
CREATE POLICY "delete_own_achievements" ON user_achievements FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- 3. Journal entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  mood text NOT NULL DEFAULT 'neutral' CHECK (mood IN ('great', 'good', 'neutral', 'down', 'stressed')),
  content text NOT NULL DEFAULT '',
  linked_mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  linked_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_journal" ON journal_entries;
CREATE POLICY "select_own_journal" ON journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_journal" ON journal_entries;
CREATE POLICY "insert_own_journal" ON journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_journal" ON journal_entries;
CREATE POLICY "update_own_journal" ON journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_journal" ON journal_entries;
CREATE POLICY "delete_own_journal" ON journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_entries(user_id, entry_date DESC);

-- 4. Life wheel assessments
CREATE TABLE IF NOT EXISTS life_wheel_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  spiritual int NOT NULL DEFAULT 5 CHECK (spiritual BETWEEN 1 AND 10),
  health int NOT NULL DEFAULT 5 CHECK (health BETWEEN 1 AND 10),
  career int NOT NULL DEFAULT 5 CHECK (career BETWEEN 1 AND 10),
  finance int NOT NULL DEFAULT 5 CHECK (finance BETWEEN 1 AND 10),
  relationships int NOT NULL DEFAULT 5 CHECK (relationships BETWEEN 1 AND 10),
  mental int NOT NULL DEFAULT 5 CHECK (mental BETWEEN 1 AND 10),
  growth int NOT NULL DEFAULT 5 CHECK (growth BETWEEN 1 AND 10),
  fun int NOT NULL DEFAULT 5 CHECK (fun BETWEEN 1 AND 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE life_wheel_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_life_wheel" ON life_wheel_assessments;
CREATE POLICY "select_own_life_wheel" ON life_wheel_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_life_wheel" ON life_wheel_assessments;
CREATE POLICY "insert_own_life_wheel" ON life_wheel_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_life_wheel" ON life_wheel_assessments;
CREATE POLICY "delete_own_life_wheel" ON life_wheel_assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_life_wheel_user ON life_wheel_assessments(user_id, created_at DESC);

-- 5. Learning paths
CREATE TABLE IF NOT EXISTS learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  duration_weeks int NOT NULL DEFAULT 4,
  difficulty text NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  cover_emoji text NOT NULL DEFAULT '🎯',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_learning_paths" ON learning_paths;
CREATE POLICY "select_learning_paths" ON learning_paths FOR SELECT TO authenticated USING (true);

-- 6. Learning path steps
CREATE TABLE IF NOT EXISTS learning_path_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  step_order int NOT NULL DEFAULT 0,
  title text NOT NULL,
  description text DEFAULT '',
  step_type text NOT NULL CHECK (step_type IN ('podcast', 'mission', 'tip', 'reflection')),
  linked_episode_id uuid REFERENCES episodes(id) ON DELETE SET NULL,
  linked_mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
  tip_text text,
  xp_reward int NOT NULL DEFAULT 10,
  UNIQUE(path_id, step_order)
);

ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_path_steps" ON learning_path_steps;
CREATE POLICY "select_path_steps" ON learning_path_steps FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_path_steps_order ON learning_path_steps(path_id, step_order);

-- 7. User path enrollments
CREATE TABLE IF NOT EXISTS user_path_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  enrolled_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, path_id)
);

ALTER TABLE user_path_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_enrollments" ON user_path_enrollments;
CREATE POLICY "select_own_enrollments" ON user_path_enrollments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_enrollments" ON user_path_enrollments;
CREATE POLICY "insert_own_enrollments" ON user_path_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_enrollments" ON user_path_enrollments;
CREATE POLICY "update_own_enrollments" ON user_path_enrollments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_enrollments" ON user_path_enrollments;
CREATE POLICY "delete_own_enrollments" ON user_path_enrollments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 8. User path step progress
CREATE TABLE IF NOT EXISTS user_path_step_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES learning_path_steps(id) ON DELETE CASCADE,
  completed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, step_id)
);

ALTER TABLE user_path_step_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_step_progress" ON user_path_step_progress;
CREATE POLICY "select_own_step_progress" ON user_path_step_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_step_progress" ON user_path_step_progress;
CREATE POLICY "insert_own_step_progress" ON user_path_step_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_step_progress" ON user_path_step_progress;
CREATE POLICY "delete_own_step_progress" ON user_path_step_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. Episode bookmarks
CREATE TABLE IF NOT EXISTS episode_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  timestamp_seconds int NOT NULL DEFAULT 0,
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE episode_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_bookmarks" ON episode_bookmarks;
CREATE POLICY "select_own_bookmarks" ON episode_bookmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_bookmarks" ON episode_bookmarks;
CREATE POLICY "insert_own_bookmarks" ON episode_bookmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_bookmarks" ON episode_bookmarks;
CREATE POLICY "update_own_bookmarks" ON episode_bookmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_bookmarks" ON episode_bookmarks;
CREATE POLICY "delete_own_bookmarks" ON episode_bookmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON episode_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_episode ON episode_bookmarks(episode_id);

-- 10. Episode notes
CREATE TABLE IF NOT EXISTS episode_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE episode_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_ep_notes" ON episode_notes;
CREATE POLICY "select_own_ep_notes" ON episode_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ep_notes" ON episode_notes;
CREATE POLICY "insert_own_ep_notes" ON episode_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ep_notes" ON episode_notes;
CREATE POLICY "update_own_ep_notes" ON episode_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ep_notes" ON episode_notes;
CREATE POLICY "delete_own_ep_notes" ON episode_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ep_notes_user ON episode_notes(user_id);

-- 11. Leaderboard opt-outs
CREATE TABLE IF NOT EXISTS leaderboard_opt_outs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  opted_out_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard_opt_outs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "select_own_opt_out" ON leaderboard_opt_outs;
CREATE POLICY "select_own_opt_out" ON leaderboard_opt_outs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_opt_out" ON leaderboard_opt_outs;
CREATE POLICY "insert_own_opt_out" ON leaderboard_opt_outs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_opt_out" ON leaderboard_opt_outs;
CREATE POLICY "delete_own_opt_out" ON leaderboard_opt_outs FOR DELETE TO authenticated USING (auth.uid() = user_id);
