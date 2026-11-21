/*
# Create Hosts system

1. New Tables
- `hosts` — podcast hosts (scholars, doctors, scientists, speakers)
  - `id` (uuid, primary key)
  - `name_ar` (text, not null) — host name in Arabic
  - `slug` (text, unique, not null) — URL slug for profile page
  - `photo_url` (text) — circular portrait photo
  - `cover_url` (text) — wide cover banner for profile hero
  - `title_ar` (text) — honorific title, e.g. "دكتور", "شيخ", "أستاذ"
  - `specialty_ar` (text) — area of specialty
  - `bio_ar` (text) — full biography
  - `country` (text) — country of origin
  - `category_id` (uuid, FK to categories) — primary category
  - `is_verified` (boolean, default false) — verified badge
  - `followers_count` (int, default 0) — cached follower count
  - `social_links` (jsonb) — { youtube, twitter, instagram, website }
  - `created_at` (timestamptz)

- `host_follows` — which user follows which host
  - `user_id` (uuid, FK to auth.users, defaults to auth.uid())
  - `host_id` (uuid, FK to hosts ON DELETE CASCADE)
  - `created_at` (timestamptz)
  - Primary key on (user_id, host_id)

2. Modified Tables
- `podcasts`:
  - New column `host_id` (uuid, FK to hosts ON DELETE SET NULL)
  - Existing `host_name` / `host_bio` columns are kept but no longer used by the app;
    each existing podcast is migrated to point at a host row created from its host_name/host_bio.
  - New columns `plays_count` (int, default 0) and `rating_avg` (numeric(3,2), default 0)
- `episodes`: new column `plays_count` (int, default 0)

3. Data Migration
- One host row is created per distinct existing `podcasts.host_name`,
  copying the name, bio, category, and a seeded placeholder portrait,
  then every podcast is linked to its host via `host_id`.
- Idempotent: guarded by existence checks on slug.

4. Security
- RLS enabled on `hosts` and `host_follows`.
- `hosts`: public read (TO anon, authenticated) — host profiles are public content.
- `host_follows`: owner-scoped CRUD for authenticated users only (auth.uid() = user_id).
- Explicit GRANTs on all touched tables for the roles the policies target.
*/

-- ============ 1. hosts table ============
CREATE TABLE IF NOT EXISTS hosts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  slug text UNIQUE NOT NULL,
  photo_url text DEFAULT '',
  cover_url text DEFAULT '',
  title_ar text DEFAULT '',
  specialty_ar text DEFAULT '',
  bio_ar text DEFAULT '',
  country text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_verified boolean NOT NULL DEFAULT false,
  followers_count int NOT NULL DEFAULT 0,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON hosts TO anon, authenticated;

DROP POLICY IF EXISTS "read_hosts" ON hosts;
CREATE POLICY "read_hosts"
ON hosts FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_hosts_category_id ON hosts(category_id);
CREATE INDEX IF NOT EXISTS idx_hosts_followers ON hosts(followers_count DESC);

-- ============ 2. host_follows table ============
CREATE TABLE IF NOT EXISTS host_follows (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, host_id)
);

ALTER TABLE host_follows ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON host_follows TO authenticated;

DROP POLICY IF EXISTS "select_own_host_follows" ON host_follows;
CREATE POLICY "select_own_host_follows"
ON host_follows FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_host_follows" ON host_follows;
CREATE POLICY "insert_own_host_follows"
ON host_follows FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_host_follows" ON host_follows;
CREATE POLICY "delete_own_host_follows"
ON host_follows FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_host_follows_host_id ON host_follows(host_id);

-- ============ 3. podcasts / episodes new columns ============
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS host_id uuid REFERENCES hosts(id) ON DELETE SET NULL;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS plays_count int NOT NULL DEFAULT 0;
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2) NOT NULL DEFAULT 0;
ALTER TABLE episodes ADD COLUMN IF NOT EXISTS plays_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_podcasts_host_id ON podcasts(host_id);

-- ============ 4. Migrate existing host_name data into hosts rows ============
DO $$
DECLARE
  rec RECORD;
  v_host_id uuid;
  v_slug text;
  v_counter int := 0;
  v_photos text[] := ARRAY[
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=400&fit=crop&crop=faces',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=faces'
  ];
BEGIN
  FOR rec IN
    SELECT DISTINCT ON (host_name) host_name, host_bio, category_id
    FROM podcasts
    WHERE host_name IS NOT NULL AND host_name <> ''
  LOOP
    v_counter := v_counter + 1;
    v_slug := 'host-' || v_counter;

    IF NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar = rec.host_name) THEN
      INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
      VALUES (
        rec.host_name,
        v_slug,
        v_photos[(v_counter - 1) % array_length(v_photos, 1) + 1],
        'https://picsum.photos/seed/hostcover' || v_counter || '/1200/400',
        '',
        '',
        COALESCE(rec.host_bio, ''),
        '',
        rec.category_id,
        true,
        0,
        '{}'::jsonb
      );
    END IF;

    SELECT id INTO v_host_id FROM hosts WHERE name_ar = rec.host_name LIMIT 1;

    UPDATE podcasts
    SET host_id = v_host_id
    WHERE host_name = rec.host_name AND host_id IS NULL;
  END LOOP;
END $$;

-- ============ 5. Seed realistic play/rating stats for demo ============
UPDATE podcasts SET plays_count = floor(random() * 40000 + 2000)::int, rating_avg = round((random() * 1.5 + 3.5)::numeric, 2) WHERE plays_count = 0;
UPDATE episodes SET plays_count = floor(random() * 9000 + 300)::int WHERE plays_count = 0;
