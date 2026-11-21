/*
# Create podcast tables for Nammy

1. New Tables
- `categories`
  - `id` (uuid, primary key)
  - `name_ar` (text, not null) — category name in Arabic
  - `icon` (text) — lucide icon name for the category
  - `color` (text) — hex color for category chips/badges
  - `created_at` (timestamptz)

- `podcasts`
  - `id` (uuid, primary key)
  - `title` (text, not null) — podcast show title
  - `description` (text) — show description
  - `host_name` (text) — name of the host
  - `host_bio` (text) — short bio of the host
  - `category_id` (uuid, FK to categories) — category the podcast belongs to
  - `type` (text) — one of: religious, scientific, cultural, motivational, professional
  - `cover_url` (text) — cover image URL
  - `audience_level` (text) — one of: beginner, intermediate, expert
  - `created_at` (timestamptz)

- `episodes`
  - `id` (uuid, primary key)
  - `podcast_id` (uuid, FK to podcasts ON DELETE CASCADE)
  - `title` (text, not null)
  - `description` (text)
  - `audio_url` (text) — URL to the audio file
  - `duration_seconds` (int) — episode length in seconds
  - `published_at` (timestamptz) — publication date

- `favorites`
  - `user_id` (uuid, FK to auth.users ON DELETE CASCADE)
  - `podcast_id` (uuid, FK to podcasts ON DELETE CASCADE)
  - `created_at` (timestamptz)
  - Primary key on (user_id, podcast_id)

- `listening_history`
  - `user_id` (uuid, FK to auth.users ON DELETE CASCADE)
  - `episode_id` (uuid, FK to episodes ON DELETE CASCADE)
  - `progress_seconds` (int, default 0) — playback position
  - `completed` (boolean, default false)
  - `updated_at` (timestamptz)
  - Primary key on (user_id, episode_id)

2. Security
- `categories`: public read (TO anon, authenticated), no writes from client
- `podcasts`: public read, no writes from client
- `episodes`: public read, no writes from client
- `favorites`: owner-scoped CRUD (authenticated only, auth.uid() = user_id)
- `listening_history`: owner-scoped CRUD (authenticated only, auth.uid() = user_id)
  - user_id columns default to auth.uid() so client inserts work

3. Indexes
- `episodes.podcast_id` — for joining episodes to podcasts
- `favorites.user_id` — for listing user's favorites
- `listening_history.user_id` — for listing user's history
- `podcasts.category_id` — for filtering by category
*/

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  icon text DEFAULT '',
  color text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_categories" ON categories;
CREATE POLICY "read_categories"
ON categories FOR SELECT
TO anon, authenticated
USING (true);

-- Podcasts
CREATE TABLE IF NOT EXISTS podcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  host_name text DEFAULT '',
  host_bio text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  type text DEFAULT 'motivational',
  cover_url text DEFAULT '',
  audience_level text DEFAULT 'beginner',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_podcasts" ON podcasts;
CREATE POLICY "read_podcasts"
ON podcasts FOR SELECT
TO anon, authenticated
USING (true);

-- Episodes
CREATE TABLE IF NOT EXISTS episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  podcast_id uuid REFERENCES podcasts(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  audio_url text DEFAULT '',
  duration_seconds int DEFAULT 0,
  published_at timestamptz DEFAULT now()
);

ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_episodes" ON episodes;
CREATE POLICY "read_episodes"
ON episodes FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_episodes_podcast_id ON episodes(podcast_id);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  podcast_id uuid NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, podcast_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites"
ON favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites"
ON favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites"
ON favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- Listening history
CREATE TABLE IF NOT EXISTS listening_history (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  progress_seconds int NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);

ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_history" ON listening_history;
CREATE POLICY "select_own_history"
ON listening_history FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "upsert_own_history" ON listening_history;
CREATE POLICY "upsert_own_history"
ON listening_history FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_history" ON listening_history;
CREATE POLICY "update_own_history"
ON listening_history FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_history" ON listening_history;
CREATE POLICY "delete_own_history"
ON listening_history FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_listening_history_user_id ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);
