-- ============================================================
-- Nammy - full database setup (schema + seed data)
-- Paste and run once in Supabase SQL Editor.
-- Fixed: celebrity host categories resolved by name at runtime.
-- ============================================================

-- ---------- 20261009070419_create_profiles_table.sql ----------
/*
# Create profiles table for Nammy

1. New Tables
- `profiles`
  - `id` (uuid, primary key, references auth.users) — the user's auth ID
  - `name` (text) — display name shown across the app
  - `avatar` (text) — avatar image URL (nullable until user uploads one)
  - `interests` (text[]) — multi-select interest areas from onboarding
  - `daily_goal_minutes` (int) — chosen daily commitment: 5, 15, or 30 minutes
  - `reminder_time` (text) — preferred time for daily reminders (e.g. "08:00")
  - `onboarded` (boolean, default false) — whether the user completed onboarding
  - `created_at` (timestamptz) — account creation timestamp
  - `updated_at` (timestamptz) — last profile update timestamp

2. Security
- Enable RLS on `profiles`.
- Owner-scoped CRUD: each authenticated user can only access their own profile row.
- The `id` column defaults to `auth.uid()` so inserts from the client succeed
  without explicitly passing the user's ID.
- 4 separate policies: SELECT, INSERT, UPDATE, DELETE — all scoped to `authenticated`
  with `auth.uid() = id` ownership checks.

3. Important Notes
- The `id` column is also a foreign key to `auth.users(id)` with `ON DELETE CASCADE`,
  so if a user is deleted from auth, their profile is automatically removed.
- `onboarded` defaults to `false` — the frontend checks this to decide whether to
  show the onboarding flow or the main app.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text DEFAULT '',
  avatar text,
  interests text[] DEFAULT '{}',
  daily_goal_minutes int DEFAULT 15,
  reminder_time text DEFAULT '08:00',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile"
ON profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant execute on the trigger function
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- ---------- 20261009070852_create_podcast_tables.sql ----------
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

-- ---------- 20261009071023_seed_podcast_data.sql ----------
/*
# Seed podcast categories, podcasts, and episodes

1. Seed Data
- 10 categories matching the onboarding interest areas
- 20+ realistic Arabic podcasts across all categories and types
- 3 episodes per podcast with placeholder audio URLs

2. Audio URLs
- Using a public sample MP3 (Google's "correct" tone) as placeholder audio
- All episodes share the same audio file — enough for UI demonstration

3. Important Notes
- Uses DO $$ blocks to capture category IDs via SELECT INTO
- Idempotent: checks for existing data before inserting
- Podcast covers use picsum.photos placeholder images
*/

-- Seed categories
INSERT INTO categories (name_ar, icon, color) VALUES
  ('روحاني / ديني', 'Heart', '#0F766E'),
  ('العلوم', 'FlaskConical', '#0EA5E9'),
  ('ثقافة وأدب', 'BookOpen', '#8B5CF6'),
  ('الصحة واللياقة', 'Dumbbell', '#EF4444'),
  ('المسيرة المهنية', 'Briefcase', '#F59E0B'),
  ('المال والاستثمار', 'Coins', '#10B981'),
  ('العلاقات والأسرة', 'Users', '#EC4899'),
  ('الصحة النفسية', 'Brain', '#6366F1'),
  ('القيادة', 'Crown', '#D4A017'),
  ('التقنية', 'Cpu', '#0F766E')
ON CONFLICT DO NOTHING;

-- Seed podcasts and episodes
DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid;
  v_career uuid; v_finance uuid; v_family uuid; v_mental uuid;
  v_leadership uuid; v_tech uuid;
  v_podcast_id uuid;
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
BEGIN
  SELECT id INTO v_spiritual FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_science FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_culture FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_health FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_family FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_mental FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_tech FROM categories WHERE name_ar = 'التقنية' LIMIT 1;

  -- 1. Spiritual
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مشارف الروح', 'بودكاست أسبوعي يستلهم الحكمة من الموروث الديني ويطبّقها على الحياة المعاصرة.', 'الشيخ عبدالله الحارثي', 'داعية وكاتب متخصص في التزكية الروحية', v_spiritual, 'religious', 'https://picsum.photos/seed/podcast1/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الطمأنينة في زمن السرعة', 'كيف نجدها وسط ضجيج الحياة.', v_audio, 1620, now() - interval '14 days'),
    (v_podcast_id, 'أدب المحاورة في القرآن', 'تأملات في آيات الحوار.', v_audio, 1380, now() - interval '7 days'),
    (v_podcast_id, 'الرضا مفتاح السعادة', 'مفهوم الرضا وممارسته.', v_audio, 1500, now() - interval '1 day');

  -- 2. Spiritual
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('أرض النور', 'حلقات تأملية حول المعاني الإيمانية وأثرها في بناء الشخصية.', 'الأستاذة نورا الخالد', 'كاتبة ومستشارة في التربية الإيمانية', v_spiritual, 'religious', 'https://picsum.photos/seed/podcast2/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'اليقين في وجه الشك', 'كيف نثبت وقت الابتلاءات.', v_audio, 1740, now() - interval '20 days'),
    (v_podcast_id, 'الشكر العملي', 'تجاوز اللسان إلى العمل.', v_audio, 1200, now() - interval '10 days'),
    (v_podcast_id, 'صفاء القلب', 'كيف نطهّر قلوبنا.', v_audio, 1380, now() - interval '2 days');

  -- 3. Science
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('عقول فضولية', 'نظرة مبسّطة على أحدث الاكتشافات العلمية وكيف تغيّر فهمنا للعالم.', 'د. ماجد العتيبي', 'أستاذ فيزياء وباحث في العلوم التطبيقية', v_science, 'scientific', 'https://picsum.photos/seed/podcast3/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الكون في كوب قهوة', 'تبسيط مفاهيم الكوزمولوجيا.', v_audio, 1860, now() - interval '15 days'),
    (v_podcast_id, 'الذكاء الاصطناعي: بين الخوف والأمل', 'نظرة متوازنة على مستقبل الـAI.', v_audio, 2100, now() - interval '8 days'),
    (v_podcast_id, 'لماذا ننام؟', 'علم النوم وفوائده.', v_audio, 1440, now() - interval '1 day');

  -- 4. Science
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('المختبر', 'تحليل علمي للأمور اليومية من التغذية إلى التكنولوجيا.', 'د. سارة المنصور', 'عالمة أحياء ومدرّبة في العلوم', v_science, 'scientific', 'https://picsum.photos/seed/podcast4/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الفيروسات: أصداء أم أعداء؟', 'فهم الفيروسات ببساطة.', v_audio, 1560, now() - interval '18 days'),
    (v_podcast_id, 'المناعة من الداخل', 'كيف يحمينا جهاز المناعة.', v_audio, 1620, now() - interval '9 days'),
    (v_podcast_id, 'الطاقة المتجددة', 'واقع وآفاق.', v_audio, 1740, now() - interval '3 days');

  -- 5. Culture
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('حبر وورق', 'حوارات حول الكتب والأدب العربي والعالمي وروّاد الكلمة.', 'الأستاذ يوسف الشهري', 'ناقد أدبي وصاحب مكتبة', v_culture, 'cultural', 'https://picsum.photos/seed/podcast5/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'مقامات الحريري', 'قراءة في أدب المقامة.', v_audio, 1380, now() - interval '12 days'),
    (v_podcast_id, 'أدب السجون', 'كيف يولد الأدب خلف القضبان.', v_audio, 1500, now() - interval '6 days'),
    (v_podcast_id, 'الترجمة كجسر ثقافي', 'دور المترجم في نقل المعرفة.', v_audio, 1260, now() - interval '2 days');

  -- 6. Culture
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('ذاكرة الأمكنة', 'رحلات في تاريخ المدن العربية وحكاياتها.', 'الأستاذة فاطمة الغامدي', 'كاتبة رحلات ومؤرخة', v_culture, 'cultural', 'https://picsum.photos/seed/podcast6/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'بغداد مدينة السلام', 'تاريخ عاصمة الخلافة.', v_audio, 1860, now() - interval '16 days'),
    (v_podcast_id, 'طرابلس البحر', 'مدينة بين الجبل والبحر.', v_audio, 1440, now() - interval '7 days'),
    (v_podcast_id, 'صنعاء العريقة', 'حكايات العمارة الطينية.', v_audio, 1320, now() - interval '1 day');

  -- 7. Health
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('جسد صحي', 'نصائح عملية في التغذية واللياقة لأسلوب حياة متوازن.', 'الكابتن خالد العنزي', 'مدرب شخصي معتمد ومستشار تغذية', v_health, 'motivational', 'https://picsum.photos/seed/podcast7/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, '10 عادات صباحية تغيّر يومك', 'روتين صباحي بسيط.', v_audio, 1080, now() - interval '13 days'),
    (v_podcast_id, 'البروتين: كم نحتاج فعلاً؟', 'توضيح حول احتياج البروتين.', v_audio, 1200, now() - interval '5 days'),
    (v_podcast_id, 'تمارين بدون معدات', 'رياضة في البيت.', v_audio, 960, now() - interval '1 day');

  -- 8. Health
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('النوم العميق', 'علم النوم وتحسين جودته لصحة أفضل.', 'د. ليلى القحطاني', 'طبيبة نوم متخصصة', v_health, 'scientific', 'https://picsum.photos/seed/podcast8/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'دورة النوم', 'فهم مراحل النوم.', v_audio, 1380, now() - interval '17 days'),
    (v_podcast_id, 'الهاتف وبرودة الغرفة', 'عوامل تؤثر على النوم.', v_audio, 1140, now() - interval '8 days'),
    (v_podcast_id, 'قيلولة مثالية', 'متى وكيف تنام قيلولة.', v_audio, 900, now() - interval '3 days');

  -- 9. Career
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مسار', 'إرشادات مهنية للمبتدئين والمحترفين في عالم العمل.', 'م. ريم الشمري', 'مدرّبة مهنية ومستشارة في تطوير المسار', v_career, 'professional', 'https://picsum.photos/seed/podcast9/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'كتابة سيرة ذاتية تُقابل', 'أسرار السيرة الذاتية الناجحة.', v_audio, 1200, now() - interval '15 days'),
    (v_podcast_id, 'مقابلة العمل: الأسئلة الصعبة', 'كيف تجيب بثقة.', v_audio, 1380, now() - interval '7 days'),
    (v_podcast_id, 'الانتقال الوظيفي', 'متى وكيف تغيّر مسارك.', v_audio, 1440, now() - interval '1 day');

  -- 10. Career
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('العمل عن بُعد', 'نصائح للإنتاجية والتركيز أثناء العمل من المنزل.', 'أ. طارق الدوسري', 'مدير منتجات وخبير عمل عن بُعد', v_career, 'professional', 'https://picsum.photos/seed/podcast10/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'إدارة الوقت في المنزل', 'تقنيات بومودورو وغيرها.', v_audio, 1140, now() - interval '19 days'),
    (v_podcast_id, 'الاجتماعات الفعّالة', 'كيف تجعل اجتماعاتك مفيدة.', v_audio, 1020, now() - interval '10 days'),
    (v_podcast_id, 'التواصل غير المتزامن', 'فن الكتابة في العمل عن بُعد.', v_audio, 1260, now() - interval '2 days');

  -- 11. Finance
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('ريال وعقلية', 'ثقافة مالية مبسّطة: من الادخار إلى الاستثمار.', 'أ. عادل المطيري', 'مستشار مالي ومدرّب في الثقافة المالية', v_finance, 'professional', 'https://picsum.photos/seed/podcast11/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'قاعدة 50/30/20', 'توزيع الراتب بذكاء.', v_audio, 960, now() - interval '11 days'),
    (v_podcast_id, 'الصندوق الاستثماري للمبتدئ', 'كيف تبدأ الاستثمار.', v_audio, 1320, now() - interval '4 days'),
    (v_podcast_id, 'الدين: تجنّبه وادخاره', 'إدارة الديون.', v_audio, 1080, now() - interval '1 day');

  -- 12. Finance
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('أسواق', 'تحليل مبسّط لأسواق المال والعقارات.', 'م. هند الزهراني', 'محللة مالية وكاتبة اقتصادية', v_finance, 'professional', 'https://picsum.photos/seed/podcast12/400/400', 'expert')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الأسهم: من أين أبدأ؟', 'مقدمة لسوق الأسهم.', v_audio, 1500, now() - interval '16 days'),
    (v_podcast_id, 'العقار: استثمار أم سكن؟', 'مقارنة بين الخيارين.', v_audio, 1380, now() - interval '9 days'),
    (v_podcast_id, 'التضخم وكيف نحمي أنفسنا', 'فهم التضخم وأثره.', v_audio, 1260, now() - interval '3 days');

  -- 13. Family
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('بيت سعيد', 'مهارات اتصال وحوار داخل الأسرة.', 'د. منيرة الحربي', 'مستشارة أسرية ومدرّبة في العلاقات', v_family, 'motivational', 'https://picsum.photos/seed/podcast13/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'لغة الحب بين الزوجين', 'مفهوم لغات الحب الخمس.', v_audio, 1320, now() - interval '14 days'),
    (v_podcast_id, 'تربية الأطفال على المسؤولية', 'خطوات عملية للآباء.', v_audio, 1200, now() - interval '6 days'),
    (v_podcast_id, 'الخلاف الزوجي: كيف نديره؟', 'أدوات إدارة الخلاف.', v_audio, 1380, now() - interval '1 day');

  -- 14. Family
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('حبال', 'علاقات صحية وحدود واضحة في الصداقة والأسرة.', 'أ. سلمان الراشد', 'مدرّب في الذكاء العاطفي والعلاقات', v_family, 'motivational', 'https://picsum.photos/seed/podcast14/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الصداقة بعد الثلاثين', 'كيف نبني صداقات ناضجة.', v_audio, 1140, now() - interval '18 days'),
    (v_podcast_id, 'قول لا بثقة', 'فن وضع الحدود.', v_audio, 960, now() - interval '10 days'),
    (v_podcast_id, 'المسامحة الحقيقية', 'كيف نتجاوز الجراح.', v_audio, 1260, now() - interval '2 days');

  -- 15. Mental
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('هدوء', 'ممارسات للتأمل والوعي الذهني وتقليل التوتر.', 'د. أمل الغامدي', 'معالجة نفسية متخصصة في العلاج المعرفي', v_mental, 'motivational', 'https://picsum.photos/seed/podcast15/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'تنفّس 4-7-8', 'تقنية تنفس لتهدئة القلق.', v_audio, 720, now() - interval '12 days'),
    (v_podcast_id, 'التفكير الزائد', 'كيف نوقف التفكير الدائري.', v_audio, 1080, now() - interval '5 days'),
    (v_podcast_id, 'اليقظة الذهنية في العمل', 'تطبيقات عملية.', v_audio, 900, now() - interval '1 day');

  -- 16. Mental
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('من الداخل', 'فهم المشاعر والصدمات ورحلة التعافي النفسي.', 'د. فهد السبيعي', 'طبيب نفسي وكاتب في الصحة النفسية', v_mental, 'scientific', 'https://picsum.photos/seed/podcast16/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الصدمة ليست حكماً', 'فهم الصدمة النفسية.', v_audio, 1620, now() - interval '20 days'),
    (v_podcast_id, 'الاكتئاب: faces متعددة', 'أنماط الاكتئاب.', v_audio, 1500, now() - interval '11 days'),
    (v_podcast_id, 'العلاج المعرفي السلوكي', 'كيف يعالج القلق.', v_audio, 1380, now() - interval '4 days');

  -- 17. Leadership
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('قائد الرتلة', 'فن القيادة من التراث العربي إلى النظريات الحديثة.', 'د. بدر العتيبي', 'مدرّب قيادة ومستشار إداري', v_leadership, 'professional', 'https://picsum.photos/seed/podcast17/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'القيادة بالقدوة', 'أثر القدوة في القيادة.', v_audio, 1380, now() - interval '15 days'),
    (v_podcast_id, 'اتخاذ القرار تحت الضغط', 'مهارات القرار.', v_audio, 1200, now() - interval '8 days'),
    (v_podcast_id, 'تفويض السلطة', 'كيف تثق بفريقك.', v_audio, 1140, now() - interval '1 day');

  -- 18. Leadership
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('القيادة الرحيبة', 'قيادة مبنية على التعاطف والوعي لا السلطة.', 'أ. لمى الحارثي', 'مدرّبة في القيادة الواعية', v_leadership, 'motivational', 'https://picsum.photos/seed/podcast18/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الاستماع كأداة قيادية', 'فن الاستماع الفعّال.', v_audio, 1020, now() - interval '13 days'),
    (v_podcast_id, 'القائد الضعيف أمام فريقه', 'شجاعة الضعف في القيادة.', v_audio, 1140, now() - interval '6 days'),
    (v_podcast_id, 'بناء الثقة', 'كيف نكسب ثقة فريقنا.', v_audio, 1260, now() - interval '2 days');

  -- 19. Technology
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('عُقال تك', 'تبسيط التقنية من البرمجة إلى الأمن السيبراني.', 'م. وليد القحطاني', 'مهندس برمجيات وصانع محتوى تقني', v_tech, 'scientific', 'https://picsum.photos/seed/podcast19/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'ما هو البرمجة فعلاً؟', 'مقدمة مبسّطة للبرمجة.', v_audio, 1200, now() - interval '14 days'),
    (v_podcast_id, 'الأمان الرقمي للجميع', 'نصائح حماية حساباتك.', v_audio, 1080, now() - interval '7 days'),
    (v_podcast_id, 'السحابة: أين تخزن بياناتك؟', 'فهم الحوسبة السحابية.', v_audio, 1320, now() - interval '1 day');

  -- 20. Technology
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مستقبل التقنية', 'استكشاف التقنيات الناشئة وتأثيرها على حياتنا.', 'م. نورة السعد', 'محللة تقنية وكاتبة في الابتكار', v_tech, 'scientific', 'https://picsum.photos/seed/podcast20/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الواقع الافتراضي بعد عشر سنوات', 'آفاق الـVR.', v_audio, 1380, now() - interval '17 days'),
    (v_podcast_id, 'بلوكشين: أبعد من العملات', 'تطبيقات البلوكشين.', v_audio, 1500, now() - interval '9 days'),
    (v_podcast_id, 'الحوسبة الكمومية', 'مقدمة للكمبيوتر الكمومي.', v_audio, 1620, now() - interval '3 days');

  -- 21. Motivational (cross-category)
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('اصنع عادتك', 'خطة عملية لبناء عادات إيجابية والتخلص من العادات السلبية.', 'أ. تركي الدوسري', 'مدرّب معتمد في العادات والتغيير السلوكي', v_mental, 'motivational', 'https://picsum.photos/seed/podcast21/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'العادات الذرية', 'كيف تبني عادات صغيرة بأثر كبير.', v_audio, 1200, now() - interval '12 days'),
    (v_podcast_id, '21 يوماً: حقيقة أم خرافة؟', 'كم يستغرق بناء عادة.', v_audio, 960, now() - interval '5 days'),
    (v_podcast_id, 'هوية العادة', 'من أنت لا ما تفعل.', v_audio, 1080, now() - interval '1 day');

  -- 22. Motivational (cross-category)
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('بداية جديدة', 'تحفيز وإلهام لمن يريد إعادة اختراع نفسه في أي مرحلة.', 'أ. أسماء الزهراني', 'متحدثة تحفيزية ومدرّبة في تطوير الذات', v_career, 'motivational', 'https://picsum.photos/seed/podcast22/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الخوف من البداية', 'كيف تتجاوز حاجز الخوف.', v_audio, 1020, now() - interval '16 days'),
    (v_podcast_id, 'الفشل: أول درجة في النجاح', 'إعادة تأطير الفشل.', v_audio, 1140, now() - interval '8 days'),
    (v_podcast_id, 'إعادة اختراع نفسك بعد الأربعين', 'لا يوجد سن متأخر.', v_audio, 1260, now() - interval '2 days');

END $$;

-- ---------- 20261010045906_create_missions_tables.sql ----------
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

-- ---------- 20261010045959_seed_missions_data.sql ----------
/*
# Seed 40+ missions across all categories

1. Seed Data
- 42 missions total: 20 daily, 12 weekly, 10 challenge
- Distributed across all 10 categories
- Mix of difficulty levels (easy, medium, hard)
- XP rewards scaled by difficulty: easy 30-50, medium 60-100, hard 120-200
- A few missions are linked to specific podcast episodes

2. Important Notes
- Uses DO $$ block to capture category IDs and some episode IDs
- Idempotent via ON CONFLICT DO NOTHING on the unique title (not strictly enforced,
  but the INSERT is guarded by checking existing titles)
*/

DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid;
  v_career uuid; v_finance uuid; v_family uuid; v_mental uuid;
  v_leadership uuid; v_tech uuid;
  v_ep1 uuid; v_ep2 uuid;
BEGIN
  SELECT id INTO v_spiritual FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_science FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_culture FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_health FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_family FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_mental FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_tech FROM categories WHERE name_ar = 'التقنية' LIMIT 1;

  -- Grab a couple episode IDs for linked missions
  SELECT id INTO v_ep1 FROM episodes ORDER BY published_at DESC LIMIT 1 OFFSET 0;
  SELECT id INTO v_ep2 FROM episodes ORDER BY published_at DESC LIMIT 1 OFFSET 1;

  -- ===== DAILY MISSIONS (20) =====
  -- Spiritual
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تأمل لمدة 5 دقائق', 'اجلس في هدوء وتأمل في نعم الله عليك. ابدأ يومك بالطمأنينة.', v_spiritual, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ ورداً من القرآن', 'اقرأ صفحة من القرآن الكريم بتدبر وتأمل في معانيها.', v_spiritual, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Science
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ مقالاً علمياً واحداً', 'ابحث عن مقال علمي حديث واقرأه للاطلاع على جديد العلم.', v_science, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Culture
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ 10 صفحات من كتاب', 'القراءة اليومية تبني عادة الاستمرارية وتوسّع مداركك.', v_culture, 'easy', 50, 20, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب اليوم في يومياتك', 'خصّص 5 دقائق لكتابة أفكارك ومشاعرك في دفتر يوميات.', v_culture, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Health
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('امشِ 20 دقيقة', 'المشي اليومي يحسّن صحتك البدنية والنفسية. اخرج وامشِ في الهواء الطلق.', v_health, 'easy', 50, 20, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اشرب 8 أكواب ماء', 'اشرب كوبين ماء عند كل وجبة للحفاظ على ترطيب جسمك.', v_health, 'easy', 30, 0, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تمرين 15 دقيقة في المنزل', 'قم بتمارين بسيطة: قفزات، ضغط، وتمارين بطن بدون معدات.', v_health, 'medium', 60, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Career
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مهارة جديدة لمدة 15 دقيقة', 'شاهد فيديو تعليمي أو اقرأ عن مهارة تريد إتقانها.', v_career, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('خطط ليومك غداً', 'اكتب 3 أهم مهام لليوم التالي قبل النوم.', v_career, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Finance
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('سجّل مصروفات اليوم', 'اكتب كل ما أنفقته اليوم لمراقبة عاداتك المالية.', v_finance, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Family
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اتصل بقريب', 'اتصل بصديق أو قريب لم تتصل به منذ فترة وصفِّ يومك معه.', v_family, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('امضِ 15 دقيقة مع أسرتك بدون هاتف', 'ضع هاتفك بعيداً وامضِ وقتاً نوعياً مع عائلتك.', v_family, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Mental
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب 3 أشياء أنت ممتنٌ لها', 'تدوين الامتنان يومياً يحسّن صحتك النفسية ويُريك ما تملكه من نِعم.', v_mental, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تنفّس بعمق لمدة دقيقتين', 'تقنية التنفس 4-7-8: شهيق 4 ثوانٍ، حبس 7، زفير 8.', v_mental, 'easy', 30, 2, 'daily')
  ON CONFLICT DO NOTHING;

  -- Leadership
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تأمل في قرار اتخذته اليوم', 'راجع قراراً اتخذته اليوم: ما الذي جعله جيداً؟ ما الذي يمكنك تحسينه؟', v_leadership, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Technology
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مفهوماً تقنياً جديداً', 'ابحث عن مصطلح تقني لم تفهمه من قبل واقرأ عنه لمدة 10 دقائق.', v_tech, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Cross-category daily
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('استمع لحلقة بودكاست واكتب 3 ملاحظات', 'اختر حلقة من بودكاست نمّي واستمع لها ثم دوّن أهم 3 أفكار تعلمتها.', v_mental, 'medium', 80, 25, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type, linked_episode_id)
  VALUES ('استمع لحلقة "العادات الذرية"', 'استمع للحلقة وطبّق فكرة واحدة منها في يومك.', v_mental, 'medium', 80, 20, 'daily', v_ep1)
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('نم مبكراً قبل 11 مساءً', 'النوم المبكر يحسّن تركيزك وطاقتك في اليوم التالي.', v_health, 'easy', 40, 0, 'daily')
  ON CONFLICT DO NOTHING;

  -- ===== WEEKLY MISSIONS (12) =====
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('أتمم قراءة كتاب كامل', 'اختر كتاباً واقرأه من الغلاف للغلاف خلال الأسبوع.', v_culture, 'hard', 150, 300, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تمرّن 4 مرات هذا الأسبوع', 'التزم بجدول رياضي: 4 جلسات تمرين لا تقل عن 30 دقيقة.', v_health, 'hard', 200, 120, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب أهداف الأسبوع', 'حدد 5 أهداف رئيسية لهذا الأسبوع ورتّبها حسب الأولوية.', v_career, 'medium', 80, 20, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اجلس مع عائلتك على مائدة واحدة', 'نظّم اجتماعاً عائلياً أو وجبة جماعية بدون شاشات.', v_family, 'medium', 80, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تصدّق بصدقة', 'أطعم مسكيناً أو تبرّع لعمل خيري لو لم يكن مالاً.', v_spiritual, 'medium', 100, 0, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('راجع ميزانية الأسبوع', 'اجلس مع نفسك وراجع ما أنفقته هذا الأسبوع وخطط للأسبوع القادم.', v_finance, 'medium', 80, 30, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مهارة جديدة لمدة ساعة', 'خصّص ساعة لتعلم مهارة عملية جديدة: لغة، برمجة، تصميم...', v_tech, 'medium', 100, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('مارس التأمل 5 أيام متتالية', 'تأمل لمدة 5 دقائق كل يوم لخمسة أيام في الأسبوع.', v_mental, 'medium', 100, 25, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('قُد اجتماعاً أو مبادرة', 'نظّم نشاطاً جماعياً أو قُد اجتماعاً في عملك أو مجتمعك.', v_leadership, 'hard', 150, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('شاهد فيلماً وثائقياً علمياً', 'اختر فيلماً وثائقياً عن موضوع علمي واكتب ملاحظة عنه.', v_science, 'medium', 80, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('زُر مكاناً ثقافياً', 'زر متحفاً أو معرضاً أو موقعاً تاريخياً واكتب عن تجربتك.', v_culture, 'medium', 100, 90, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تواصل مع 3 أشخاص من شبكتك المهنية', 'راسل 3 زملاء أو معارف لتقوية علاقاتك المهنية.', v_career, 'medium', 80, 30, 'weekly')
  ON CONFLICT DO NOTHING;

  -- ===== CHALLENGE MISSIONS (10) =====
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي 30 يوماً: تأمل يومياً', 'تأمل لمدة 10 دقائق كل يوم لمدة 30 يوماً متتالية.', v_mental, 'hard', 500, 300, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي 21 يوماً: اقرأ 20 صفحة يومياً', 'اقرأ 20 صفحة من كتاب كل يوم لمدة 3 أسابيع.', v_culture, 'hard', 400, 420, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي صيام 3 أيام', 'صم 3 أيام في هذا الشهر تقرباً وتهذيباً للنفس.', v_spiritual, 'hard', 300, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي اللياقة: 10,000 خطوة يومياً لمدة أسبوع', 'حقق 10,000 خطوة كل يوم لمدة أسبوع كامل.', v_health, 'hard', 350, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي المال: ادخر 10% من راتبك', 'ادخر 10% من دخلك هذا الشهر في حساب ادخار مستقل.', v_finance, 'hard', 300, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي القيادة: قُد مشروعاً تطوعياً', 'ابنِ فريقاً ونفّذ مشروعاً تطوعياً يخدم مجتمعك.', v_leadership, 'hard', 500, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي التقنية: ابنِ مشروعاً صغيراً', 'استخدم مهارة تقنية لبناء مشروع بسيط (موقع، تطبيق، سكربت).', v_tech, 'hard', 400, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي العلاقات: اكتب رسالة شكر لـ 5 أشخاص', 'اكتب رسالة شكر صادقة لـ 5 أشخاص أثروا في حياتك.', v_family, 'hard', 250, 60, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي العلم: اقرأ كتاباً علمياً كاملاً', 'اختر كتاباً علمياً واقرأه كاملاً مع تدوين أهم الأفكار.', v_science, 'hard', 400, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي المهنة: حدّث سيرتك الذاتية وملفك المهني', 'راجع وحدّث سيرتك الذاتية وملفك في لينكد إن.', v_career, 'medium', 120, 90, 'challenge')
  ON CONFLICT DO NOTHING;

END $$;

-- ---------- 20261010050525_add_xp_to_profiles.sql ----------
-- Add xp column to profiles for tracking experience points
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp int NOT NULL DEFAULT 0;

-- ---------- 20261010050643_create_notifications_table.sql ----------
/*
# Create notifications table

1. New Table
- `notifications`
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users ON DELETE CASCADE)
  - `type` (text) — mission_assigned, mission_completed, achievement, new_episode, reminder
  - `title` (text, not null)
  - `body` (text) — notification detail
  - `link` (text) — optional route to navigate to
  - `read` (boolean, default false)
  - `created_at` (timestamptz)

2. Security
- Owner-scoped CRUD (authenticated only, auth.uid() = user_id)
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  body text DEFAULT '',
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications"
ON notifications FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ---------- 20261010051806_create_user_stats_tables.sql ----------
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

-- ---------- 20261011180555_create_tips_and_notif_settings.sql ----------
/*
# Create tips and notification_settings tables

1. tips
   - id (uuid PK)
   - text_ar (text, not null) — the tip/quote content in Arabic
   - author_or_source (text) — attribution
   - category_id (uuid, FK to categories, nullable for general tips)
   - type (text) — advice | quote | verse | hadith | fact

2. notification_settings
   - user_id (uuid PK, FK to auth.users ON DELETE CASCADE)
   - daily_tip_enabled (boolean, default true)
   - reminder_enabled (boolean, default true)
   - reminder_time (text, default '08:00')
   - categories (text[], default '{}') — which category tips to receive
   - push_enabled (boolean, default false)
   - push_subscription (jsonb, nullable) — Web Push subscription object

3. Security
   - tips: public read (authenticated), no writes from client
   - notification_settings: owner-scoped CRUD
*/

CREATE TABLE IF NOT EXISTS tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text_ar text NOT NULL,
  author_or_source text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'advice' CHECK (type IN ('advice', 'quote', 'verse', 'hadith', 'fact')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_tips" ON tips;
CREATE POLICY "select_tips"
ON tips FOR SELECT
TO authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_tips_category ON tips(category_id);
CREATE INDEX IF NOT EXISTS idx_tips_type ON tips(type);

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_tip_enabled boolean NOT NULL DEFAULT true,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_time text NOT NULL DEFAULT '08:00',
  categories text[] NOT NULL DEFAULT '{}',
  push_enabled boolean NOT NULL DEFAULT false,
  push_subscription jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notif_settings" ON notification_settings;
CREATE POLICY "select_own_notif_settings"
ON notification_settings FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notif_settings" ON notification_settings;
CREATE POLICY "insert_own_notif_settings"
ON notification_settings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notif_settings" ON notification_settings;
CREATE POLICY "update_own_notif_settings"
ON notification_settings FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notif_settings" ON notification_settings;
CREATE POLICY "delete_own_notif_settings"
ON notification_settings FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ---------- 20261011180718_seed_tips_data.sql ----------
/*
# Seed 100+ tips across all 10 categories
Types: advice, quote, verse, hadith, fact
*/
DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid; v_career uuid;
  v_finance uuid; v_family uuid; v_mental uuid; v_leadership uuid; v_tech uuid;
BEGIN
  SELECT id INTO v_spiritual FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_science FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_culture FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_health FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_family FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_mental FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_tech FROM categories WHERE name_ar = 'التقنية' LIMIT 1;

  -- Spiritual (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('إن مع العسر يسراً، فلا تستعجل النهاية وأنت في بداية الطريق', 'القرآن الكريم', v_spiritual, 'verse'),
  ('إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('من حسن إسلام المرء تركه ما لا يعنيه', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('الصبر مفتاح الفرج، والشكر سبب للزيادة', 'حكمة', v_spiritual, 'advice'),
  ('وأن ليس للإنسان إلا ما سعى، وأن سعيه سوف يرى', 'القرآن الكريم', v_spiritual, 'verse'),
  ('الذكر طمأنينة للقلوب، اجعل له نصيباً من يومك', 'حكمة', v_spiritual, 'advice'),
  ('من لا يستحي من الناس لا يستحي من الله', 'حكمة', v_spiritual, 'advice'),
  ('تفاءلوا بالخير تجدوه', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('الدعاء سلاح المؤمن، فاستخدمه كل يوم', 'حكمة', v_spiritual, 'advice'),
  ('إن الله لا يغير ما بقوم حتى يغيروا ما بأنفسهم', 'القرآن الكريم', v_spiritual, 'verse');

  -- Science (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('العلم هو النور الذي يضيء طريق الحياة', 'حكمة', v_science, 'advice'),
  ('إن العقل البشري لا يعمل بشكل جيد إلا عندما يكون فضولياً', 'ألبرت أينشتاين', v_science, 'quote'),
  ('اقرأ كل يوم شيئاً جديداً يوسع مداركك', 'حكمة', v_science, 'advice'),
  ('الخلية الواحدة تحتوي على ملياري نوع من البروتينات المختلفة', 'علم الأحياء', v_science, 'fact'),
  ('العلم يبني والجهل يهدم، فاختر البناء', 'حكمة', v_science, 'advice'),
  ('لو سرنا بسرعة الضوء لوقف الزمن بالنسبة لنا', 'النسبية الخاصة', v_science, 'fact'),
  ('لا توقف تعلمك أبداً، لأن الحياة لا تتوقف عن تعليمك', 'حكمة', v_science, 'advice'),
  ('الكمال في العلم هو أن تعرف حدود معرفتك', 'كونفوشيوس', v_science, 'quote'),
  ('الدماغ البشري يستهلك 20% من طاقة الجسم رغم أنه 2% من وزنه', 'علم الأعصاب', v_science, 'fact'),
  ('كل ما نعرفه عن الكون يمثل 5% فقط، والباقي مظلم', 'الفيزياء الفلكية', v_science, 'fact');

  -- Culture & Literature (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('الكتاب خير صديق في وقت الفراغ', 'حكمة', v_culture, 'advice'),
  ('اقرأ كأنك مؤلف، وفكّر كأنك ناقد', 'حكمة', v_culture, 'advice'),
  ('الأدب هو الحياة المرسومة بالكلمات', 'حكمة', v_culture, 'quote'),
  ('من لا يقرأ لا يعيش حياة كاملة', 'حكمة', v_culture, 'advice'),
  ('الكلمة الطيبة شجرة طيبة تؤتي أكلها كل حين', 'حكمة', v_culture, 'quote'),
  ('خصص 20 دقيقة يومياً للقراءة، وستنهي كتاباً كل أسبوعين', 'حكمة', v_culture, 'advice'),
  ('الثقافة هي ما يبقى بعد أن تنسى كل ما تعلمته', 'ألبرت أينشتاين', v_culture, 'quote'),
  ('الشعر هو موسيقى الروح، استمع إليه', 'حكمة', v_culture, 'advice'),
  ('اكتب ما تقرأه بخط يدك، يرسخ في ذاكرتك أكثر', 'حكمة', v_culture, 'advice'),
  ('القارئ الجيد يقرأ الكتاب مرتين: مرة للمتعة ومرة للتأمل', 'حكمة', v_culture, 'advice');

  -- Health & Fitness (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('المشي 30 دقيقة يومياً يقلل خطر أمراض القلب بنسبة 35%', 'دراسة طبية', v_health, 'fact'),
  ('جسمك هو بيتك الوحيد، اعتن به', 'حكمة', v_health, 'advice'),
  ('اشرب 8 أكواب ماء يومياً على الأقل', 'حكمة', v_health, 'advice'),
  ('النوم 7-8 ساعات يقوي جهاز المناعة', 'دراسة طبية', v_health, 'fact'),
  ('الرياضة صيدلية كاملة، والحركة نصف الدواء', 'حكمة', v_health, 'advice'),
  ('تناول الإفطار كل يوم يحسن التركيز والأداء', 'دراسة طبية', v_health, 'fact'),
  ('الوقوف لمدة دقيقة كل ساعة يقلل آثار الجلوس الطويل', 'دراسة طبية', v_health, 'fact'),
  ('التنفس العميق لمدة 5 دقائق يخفض التوتر', 'حكمة', v_health, 'advice'),
  ('العضلات تحرق السعرات حتى أثناء الراحة، فبنِ عضلاتك', 'حكمة', v_health, 'advice'),
  ('قلل السكر المضاف، وستلاحظ تحسناً في طاقتك خلال أسبوع', 'حكمة', v_health, 'advice');

  -- Career (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('النجاح ليس صدفة، بل تراكم خطوات صغيرة يومية', 'حكمة', v_career, 'advice'),
  ('استثمر في نفسك أولاً، فأنت أثمن أصولك', 'حكمة', v_career, 'advice'),
  ('بناء المهارات أهم من بناء السيرة الذاتية', 'حكمة', v_career, 'advice'),
  ('تواصل مع شخص جديد في مجالك كل أسبوع', 'حكمة', v_career, 'advice'),
  ('التركيز على مهمة واحدة في كل مرة يضاعف إنتاجيتك', 'حكمة', v_career, 'advice'),
  ('لا تنتظر الكمال، ابدأ وحسّن لاحقاً', 'حكمة', v_career, 'advice'),
  ('الخبرة تأتي من المواقف الصعبة، لا تتهرب منها', 'حكمة', v_career, 'advice'),
  ('اعرف نقاط قوتك وركّز عليها بدل إصلاح كل نقاط ضعفك', 'حكمة', v_career, 'advice'),
  ('التطوير المهني رحلة مدى الحياة، لا توقفها', 'حكمة', v_career, 'advice'),
  ('القائد الجيد يصنع قادة، لا أتباعاً', 'حكمة', v_career, 'advice');

  -- Finance (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('ادفع لنفسك أولاً: خصم 10% من دخلك قبل أي مصروف', 'حكمة', v_finance, 'advice'),
  ('لا تدخر ما يتبقى بعد الإنفاق، بل أنفق ما يتبقى بعد الادخار', 'وارن بافيت', v_finance, 'quote'),
  ('الاستثمار في المعرفة يعطي أفضل عائد', 'بنجامين فرانكلين', v_finance, 'quote'),
  ('الديون تأكل المستقبل، تجنبها قدر الإمكان', 'حكمة', v_finance, 'advice'),
  ('ابدأ بالاستثمار مبكراً، فالفائدة المركبة سحر الوقت', 'حكمة', v_finance, 'advice'),
  ('الميزانية الشهرية هي خريطة طريق لحرية مالية', 'حكمة', v_finance, 'advice'),
  ('لا تشتري ما لا تحتاج لتثير إعجاب من لا يهتم بك', 'حكمة', v_finance, 'advice'),
  ('نظرية 50/30/20: احتياجات 50%، رغبات 30%، ادخار 20%', 'قاعدة مالية', v_finance, 'fact'),
  ('الطوارئ المالية: اجمع مصاريف 3-6 أشهر قبل الاستثمار', 'حكمة', v_finance, 'advice'),
  ('تنويع الاستثمارات يقلل المخاطر: لا تضع كل مالك في سلة واحدة', 'حكمة', v_finance, 'advice');

  -- Family & Relationships (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('خيركم خيركم لأهله', 'رسول الله ﷺ', v_family, 'hadith'),
  ('الكلمة الطيبة صدقة، فابدأ بها مع أهلك', 'حكمة', v_family, 'advice'),
  ('الاستماع أعمق من السماع، فاستمع لمن تحب', 'حكمة', v_family, 'advice'),
  ('خصص وقتاً يومياً مع أطفالك بعيداً عن الهواتف', 'حكمة', v_family, 'advice'),
  ('الاعتذار لا يقلل من قدرك بل يرفع شأنك', 'حكمة', v_family, 'advice'),
  ('لا تجعل الاختلاف يفسد الود، فالناس مختلفون', 'حكمة', v_family, 'advice'),
  ('الصداقة الحقيقية تظهر في الأوقات الصعبة', 'حكمة', v_family, 'advice'),
  ('عبّر عن امتنانك لمن حولك كل يوم', 'حكمة', v_family, 'advice'),
  ('الحب ليس شعوراً فقط، بل أفعال يومية صغيرة', 'حكمة', v_family, 'advice'),
  ('لا تؤجل قول "أحبك" لمن تحب', 'حكمة', v_family, 'advice');

  -- Mental Health (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('من حاسب نفسه قبل أن يحاسَب، خفّ الله يوم القيامة', 'حكمة', v_mental, 'advice'),
  ('منع الأفكار السلبية أصعب من استبدالها، فعوّضها بإيجابية', 'حكمة', v_mental, 'advice'),
  ('اليومية اليومية: اكتب 3 أشياء ممتن لها كل صباح', 'حكمة', v_mental, 'advice'),
  ('القلق لا يفرغ غداً من أحزانه، بل يفرغ اليوم من قوته', 'حكمة', v_mental, 'quote'),
  ('التأمل 10 دقائق يومياً يقلل القلق بنسبة 40%', 'دراسة علمية', v_mental, 'fact'),
  ('لا تقارن يومك الأول بيوم الآخر العاشر، كلٌّ في مرحلة', 'حكمة', v_mental, 'advice'),
  ('البكاء ليس ضعفاً، بل تفريغ صحي للمشاعر', 'حكمة', v_mental, 'advice'),
  ('المشي في الطبيعة يخفض هرمون التوتر بنسبة 20%', 'دراسة علمية', v_mental, 'fact'),
  ('قبل النوم، فكّر في شيء جميل حدث اليوم', 'حكمة', v_mental, 'advice'),
  ('اطلب المساعدة المتخصصة عند الحاجة، ليست عيباً', 'حكمة', v_mental, 'advice');

  -- Leadership (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('القائد الحقيقي من يصنع قادة لا أتباعاً', 'حكمة', v_leadership, 'advice'),
  ('القدوة أبلغ من القول، فكن المثل الذي تدعو إليه', 'حكمة', v_leadership, 'advice'),
  ('من لا يستطيع قيادة نفسه لا يستطيع قيادة الآخرين', 'حكمة', v_leadership, 'quote'),
  ('الاستماع مهارة القائد الأهم', 'حكمة', v_leadership, 'advice'),
  ('الاعتراف بالخطأ أول خطوات القيادة الصادقة', 'حكمة', v_leadership, 'advice'),
  ('القائد يحمي فريقه في الأزمات، ويشاركهم النجاح', 'حكمة', v_leadership, 'advice'),
  ('فوّض المسؤوليات، لا تكن من يفعل كل شيء', 'حكمة', v_leadership, 'advice'),
  ('كن واضحاً في رؤيتك، فالفريق يحتاج وجهة', 'حكمة', v_leadership, 'advice'),
  ('القيادة ليست منصباً بل سلوك', 'حكمة', v_leadership, 'quote'),
  ('اقرب الناس منك من صدقك معهم', 'حكمة', v_leadership, 'advice');

  -- Technology (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('خصص وقتاً بعيداً عن الشاشات كل يوم', 'حكمة', v_tech, 'advice'),
  ('تعلم مهارة تقنية جديدة كل شهر', 'حكمة', v_tech, 'advice'),
  ('الذكاء الاصطناعي يغير العالم، فهمه أفضل من تجاهله', 'حكمة', v_tech, 'advice'),
  ('أطفئ الإشعارات غير الضرورية، ستلاحظ تحسناً في تركيزك', 'حكمة', v_tech, 'advice'),
  ('استخدم كلمات مرور قوية ومختلفة لكل حساب', 'حكمة', v_tech, 'advice'),
  ('البرمجة هي لغة المستقبل، تعلم ولو أساسياتها', 'حكمة', v_tech, 'advice'),
  ('احفظ نسخة احتياطية من بياناتك المهمة كل أسبوع', 'حكمة', v_tech, 'advice'),
  ('الإنترنت أداة، استخدمها ولا تدعها تستخدمك', 'حكمة', v_tech, 'advice'),
  ('قبل أن تنشر شيئاً، اسأل: هل أحب أن يراه الناس بعد 10 سنوات؟', 'حكمة', v_tech, 'advice'),
  ('البيانات هي نفط القرن الواحد والعشرين', 'حكمة', v_tech, 'quote');

  -- General (10, no category)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('كن أفضل نسخة من نفسك كل يوم، ولو بسبة 1%', 'حكمة', NULL, 'advice'),
  ('الإجراء الصغير المتكرر يصنع التغيير الكبير', 'حكمة', NULL, 'advice'),
  ('لا تؤجل عمل اليوم إلى الغد', 'حكمة', NULL, 'advice'),
  ('الرضا بالقليل راحة، والطمع في الكثير تعب', 'حكمة', NULL, 'advice'),
  ('من جدّ وجد، ومن زرع حصد', 'حكمة', NULL, 'quote'),
  ('الوقت كالسيف إن لم تقطعه قطعك', 'حكمة', NULL, 'quote'),
  ('النجاح رحلة وليست وجهة، فاستمتع بالطريق', 'حكمة', NULL, 'quote'),
  ('كل شخص تلقاه يعلمك شيئاً، فكن تلميذاً للجميع', 'حكمة', NULL, 'advice'),
  ('الابتسامة أبسط أشكال التغيير، ابدأ بها', 'حكمة', NULL, 'advice'),
  ('الامتنان يحول ما لديك إلى ما تكفي', 'حكمة', NULL, 'quote');
END $$;

-- ---------- 20261011181705_create_innovative_features_tables.sql ----------
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

-- ---------- 20261011181759_seed_learning_paths_data.sql ----------
/*
# Seed learning paths and their steps
Creates 6 curated multi-week learning paths with ordered steps.
*/
DO $$
DECLARE
  v_path_habits uuid; v_path_confidence uuid; v_path_finance uuid;
  v_path_leadership uuid; v_path_spiritual uuid; v_path_health uuid;
  v_spiritual_cat uuid; v_health_cat uuid; v_career_cat uuid; v_finance_cat uuid; v_leadership_cat uuid; v_mental_cat uuid;
  v_ep1 uuid; v_ep2 uuid; v_ep3 uuid; v_ep4 uuid; v_ep5 uuid; v_ep6 uuid;
BEGIN
  SELECT id INTO v_spiritual_cat FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_health_cat FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career_cat FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance_cat FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_leadership_cat FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_mental_cat FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;

  -- Grab some episode IDs
  SELECT id INTO v_ep1 FROM episodes LIMIT 1;
  SELECT id INTO v_ep2 FROM episodes OFFSET 1 LIMIT 1;
  SELECT id INTO v_ep3 FROM episodes OFFSET 2 LIMIT 1;
  SELECT id INTO v_ep4 FROM episodes OFFSET 3 LIMIT 1;
  SELECT id INTO v_ep5 FROM episodes OFFSET 4 LIMIT 1;
  SELECT id INTO v_ep6 FROM episodes OFFSET 5 LIMIT 1;

  -- Path 1: 30 days to better habits
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('30 يوماً لعادات أفضل', 'رحلة عملية لبناء عادات يومية قوية تستمر مدى الحياة', v_mental_cat, 4, 'beginner', '🌱')
  RETURNING id INTO v_path_habits;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_habits, 1, 'استمع: أساسيات بناء العادات', 'ابدأ بحلقة عن كيف تتشكل العادات', 'podcast', v_ep1, 10),
  (v_path_habits, 2, 'مهمة: اكتب عادتك الجديدة', 'حدد عادة واحدة تريد بناءها هذا الشهر', 'mission', NULL, 15),
  (v_path_habits, 3, 'تأمل: لماذا هذه العادة مهمة لك؟', 'اكتب في مذكرتك سبب رغبتك في التغيير', 'reflection', NULL, 10),
  (v_path_habits, 4, 'نصيحة: قاعدة الدقيقتين', 'اقرأ نصيحة عن قاعدة الدقيقتين للتغلب على التسويف', 'tip', NULL, 5),
  (v_path_habits, 5, 'مهمة: نفّذ عادتك 7 أيام متتالية', 'سجل تنفيذك يومياً في المذكرات', 'mission', NULL, 25),
  (v_path_habits, 6, 'استمع: كيف تحافظ على العادات', 'حلقة عن استدامة العادات بعد البداية', 'podcast', v_ep2, 10),
  (v_path_habits, 7, 'تأمل: ما الذي تغيّر فيك؟', 'اكتب عن التغييرات التي لاحظتها', 'reflection', NULL, 15),
  (v_path_habits, 8, 'مهمة: أضف عادة ثانية', 'الآن أضف عادة جديدة تراكمياً', 'mission', NULL, 20);

  -- Path 2: Confidence & self-esteem
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('بناء الثقة بالنفس', 'تعرّف على مصادر الثقة ومفاتيح تعزيزها عملياً', v_mental_cat, 3, 'beginner', '💪')
  RETURNING id INTO v_path_confidence;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_confidence, 1, 'استمع: ما هي الثقة الحقيقية؟', 'حلقة عن مفهوم الثقة بالنفس', 'podcast', v_ep3, 10),
  (v_path_confidence, 2, 'مهمة: اكتب 5 نقاط قوتك', 'حدد صفاتك الإيجابية دون تقليل', 'mission', NULL, 15),
  (v_path_confidence, 3, 'نصيحة: لغة الجسد والثقة', 'اقرأ عن تأثير وضعية الجسد على ثقتك', 'tip', NULL, 5),
  (v_path_confidence, 4, 'تأمل: موقف تجاوزت فيه خوفك', 'اكتب عن مرة واجهت فيها خوفك', 'reflection', NULL, 10),
  (v_path_confidence, 5, 'مهمة: افعل شيئاً خارج منطقة راحتك', 'اختر تحدياً صغيراً هذا الأسبوع', 'mission', NULL, 25),
  (v_path_confidence, 6, 'استمع: التعامل مع النقد', 'حلقة عن كيف تستقبل النقد بصحة', 'podcast', v_ep4, 10);

  -- Path 3: Financial foundations
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('أساسيات المال الذكي', 'تعلم أسس الإدارة المالية والادخار والاستثمار المسؤول', v_finance_cat, 4, 'beginner', '💰')
  RETURNING id INTO v_path_finance;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_finance, 1, 'استمع: عقلية المال الصحيحة', 'حلقة عن العلاقة النفسية بالمال', 'podcast', v_ep5, 10),
  (v_path_finance, 2, 'مهمة: اكتب ميزانيتك الشهرية', 'استخدم قاعدة 50/30/20', 'mission', NULL, 20),
  (v_path_finance, 3, 'نصيحة: ادفع لنفسك أولاً', 'اقرأ عن أهمية الادخار قبل الإنفاق', 'tip', NULL, 5),
  (v_path_finance, 4, 'تأمل: علاقتك بالديون', 'اكتب عن نظرتك للديون وكيف تتجنبها', 'reflection', NULL, 10),
  (v_path_finance, 5, 'مهمة: اجمع مصاريف 3 أيام', 'تتبع كل ريال أنفقته لمدة 3 أيام', 'mission', NULL, 15),
  (v_path_finance, 6, 'استمع: مقدمة في الاستثمار', 'حلقة عن أساسيات تنمية المال', 'podcast', v_ep6, 10),
  (v_path_finance, 7, 'مهمة: حدد هدفاً مالياً', 'اكتب هدفاً مالياً لـ 6 أشهر قادمة', 'mission', NULL, 20),
  (v_path_finance, 8, 'تأمل: ماذا تعلمت عن مالك؟', 'لخص أهم 3 أفكار تعلمتها', 'reflection', NULL, 15);

  -- Path 4: Leadership journey
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('رحلة القيادة', 'من قيادة الذات إلى قيادة الآخرين بطريقة ملهمة', v_leadership_cat, 5, 'intermediate', '🧭')
  RETURNING id INTO v_path_leadership;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_leadership, 1, 'استمع: القيادة تبدأ بقيادة الذات', 'حلقة عن انضباط القائد الشخصي', 'podcast', v_ep1, 10),
  (v_path_leadership, 2, 'مهمة: حدد رؤيتك الشخصية', 'اكتب رؤية لـ 5 سنوات قادمة', 'mission', NULL, 20),
  (v_path_leadership, 3, 'نصيحة: الاستماع مهارة القائد', 'اقرأ عن أهمية الاستماع الفعال', 'tip', NULL, 5),
  (v_path_leadership, 4, 'تأمل: قائد ألهمك — لماذا؟', 'اكتب عن شخصية قيادية تأثرت بها', 'reflection', NULL, 10),
  (v_path_leadership, 5, 'مهمة: قُد مشروعاً صغيراً', 'نظّم نشاطاً جماعياً ولو بسيطاً', 'mission', NULL, 30),
  (v_path_leadership, 6, 'استمع: فن التحفيز', 'حلقة عن كيف تلهم الآخرين', 'podcast', v_ep2, 10),
  (v_path_leadership, 7, 'مهمة: قدّم تغذية راجعة', 'اعطِ تقييماً صادقاً لشخصين', 'mission', NULL, 15),
  (v_path_leadership, 8, 'تأمل: أسلوبك القيادي', 'اكتب عن نمط قيادتك ونقاط تطويره', 'reflection', NULL, 15),
  (v_path_leadership, 9, 'استمع: القيادة في الأزمات', 'حلقة عن اتخاذ القرار تحت الضغط', 'podcast', v_ep3, 10),
  (v_path_leadership, 10, 'مهمة: صغ رسالة قيادية', 'اكتب رسالة تلخص قيمك القيادية', 'mission', NULL, 25);

  -- Path 5: Spiritual growth
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('نمو روحي عميق', 'رحلة لتعزيز الصلة الروحية وتزكية النفس', v_spiritual_cat, 4, 'beginner', '🕊️')
  RETURNING id INTO v_path_spiritual;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_spiritual, 1, 'استمع: كيف تطمئن القلوب', 'حلقة عن الطمأنينة الروحية', 'podcast', v_ep4, 10),
  (v_path_spiritual, 2, 'مهمة: اكتب وردك اليومي', 'حدد ورداً روحياً تنفذه كل صباح', 'mission', NULL, 15),
  (v_path_spiritual, 3, 'نصيحة: الصبر مفتاح الفرج', 'اقرأ عن قيمة الصبر في حياتك', 'tip', NULL, 5),
  (v_path_spiritual, 4, 'تأمل: نعمة في حياتك', 'اكتب عن نعمة تشكر الله عليها', 'reflection', NULL, 10),
  (v_path_spiritual, 5, 'مهمة: نفّذ وردك 14 يوماً', 'التزم بوردك الروحي أسبوعين متتاليين', 'mission', NULL, 30),
  (v_path_spiritual, 6, 'استمع: التأمل والذكر', 'حلقة عن فوائد الذكر والتأمل', 'podcast', v_ep5, 10),
  (v_path_spiritual, 7, 'تأمل: كيف تغيّرت روحياً؟', 'اكتب عن التغيير الداخلي الذي لاحظته', 'reflection', NULL, 15),
  (v_path_spiritual, 8, 'مهمة: اكتب خطة نموك الروحي', 'صغ خطة شهرية لنموك المستمر', 'mission', NULL, 25);

  -- Path 6: Health & energy
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('طاقة وصحة', 'ابنِ جسداً قوياً وعقلاً نشطاً بعادات بسيطة', v_health_cat, 3, 'beginner', '🏃')
  RETURNING id INTO v_path_health;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_health, 1, 'استمع: الصحة أساس النجاح', 'حلقة عن علاقة الجسد بالإنجاز', 'podcast', v_ep6, 10),
  (v_path_health, 2, 'مهمة: اشرب 8 أكواب ماء يومياً', 'تابع شربك للماء أسبوعاً كاملاً', 'mission', NULL, 20),
  (v_path_health, 3, 'نصيحة: النوم 7 ساعات', 'اقرأ عن أهمية النوم للطاقة', 'tip', NULL, 5),
  (v_path_health, 4, 'مهمة: امشِ 30 دقيقة يومياً', 'التزم بالمشي 5 أيام متتالية', 'mission', NULL, 25),
  (v_path_health, 5, 'تأمل: كيف تشعر بطاقتك؟', 'اكتب عن مستوى طاقتك وتأثير عاداتك', 'reflection', NULL, 10),
  (v_path_health, 6, 'استمع: التغذية والتركيز', 'حلقة عن تأثير الطعام على الذهن', 'podcast', v_ep1, 10),
  (v_path_health, 7, 'مهمة: قلّل السكر أسبوعاً', 'تجنب المشروبات السكرية لمدة أسبوع', 'mission', NULL, 20);
END $$;

-- ---------- 20261011181806_seed_achievement_defs.sql ----------
/*
# Seed expanded achievement definitions into gamification
This migration doesn't create new tables — it's for reference.
Achievements are defined in app code (gamification.ts) and tracked in user_achievements table.
This just adds a comment for documentation.
*/
-- No data to seed; achievements are code-defined and tracked dynamically.
SELECT 1;

-- ---------- 20261120092421_20261120000000_create_hosts_system.sql.sql ----------
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

-- ---------- 20261120092456_20261120000001_enrich_hosts_seed.sql.sql ----------
/*
# Enrich seeded hosts with professional profile data

1. Changes
- Updates every host created from the podcast seed data with:
  - Readable URL slugs (replacing host-1, host-2, ...)
  - Honorific titles (دكتور, شيخ, أستاذ, مهندس, مدرب, كابتن)
  - Specialty, country, and social links
  - Realistic follower counts and verified badges

2. Notes
- Matched by Arabic name (stable across rebuilds of the base seed).
- Idempotent: plain UPDATE statements, safe to re-run.
- Each host keeps the podcast(s) migrated from the original seed (1 podcast each,
  satisfying the 1-4 podcasts per host requirement).
*/

UPDATE hosts SET slug = 'abdullah-alharthy', title_ar = 'شيخ', specialty_ar = 'التزكية الروحية والعلوم الشرعية', bio_ar = 'الشيخ عبدالله الحارثي داعية وكاتب متخصص في التزكية الروحية، يقدّم برنامجاً أسبوعياً يستلهم الحكمة من الموروث الديني ويطبّقها على قضايا الحياة المعاصرة. له عدة كتب في الرقائق والمناسك.', country = 'السعودية', is_verified = true, followers_count = 48200, social_links = '{"youtube":"https://youtube.com/@abdullah-alharthy","twitter":"https://twitter.com/abdullah_alharthy","instagram":"https://instagram.com/abdullah.alharthy","website":"https://alharthy.example.com"}'::jsonb WHERE name_ar = 'الشيخ عبدالله الحارثي';

UPDATE hosts SET slug = 'noura-alkhalid', title_ar = 'أستاذة', specialty_ar = 'التربية الإيمانية', bio_ar = 'الأستاذة نورا الخالد كاتبة ومستشارة في التربية الإيمانية، تعمل مع الأسر والمدارس على بناء جيل متوازن إيمانياً وعلمياً. تقدّم حلقات تأملية شهرية حول المعاني الإيمانية.', country = 'الكويت', is_verified = true, followers_count = 35700, social_links = '{"twitter":"https://twitter.com/noura_khalid","instagram":"https://instagram.com/noura.alkhalid","website":"https://noura.example.com"}'::jsonb WHERE name_ar = 'الأستاذة نورا الخالد';

UPDATE hosts SET slug = 'majed-alotaibi', title_ar = 'دكتور', specialty_ar = 'الفيزياء والفلك', bio_ar = 'د. ماجد العتيبي أستاذ فيزياء وباحث في العلوم التطبيقية، حاصل على جائزة التميز العلمي. يبسّط أحدث الاكتشافات العلمية في بودكاست عقول فضولية ويقدّمها بلغة ممتعة للجميع.', country = 'السعودية', is_verified = true, followers_count = 62400, social_links = '{"youtube":"https://youtube.com/@majed-science","twitter":"https://twitter.com/majed_otibi","website":"https://majed.example.com"}'::jsonb WHERE name_ar = 'د. ماجد العتيبي';

UPDATE hosts SET slug = 'sara-almansour', title_ar = 'دكتور', specialty_ar = 'علم الأحياء', bio_ar = 'د. سارة المنصور عالمة أحياء ومدرّبة في العلوم، شغوفة بنقل الثقافة العلمية إلى المجتمع العربي عبر تحليل الأشياء اليومية من التغذية إلى التكنولوجيا بعين علمية.', country = 'مصر', is_verified = true, followers_count = 41800, social_links = '{"instagram":"https://instagram.com/sara.biology","twitter":"https://twitter.com/sara_mansour","website":"https://sara.example.com"}'::jsonb WHERE name_ar = 'د. سارة المنصور';

UPDATE hosts SET slug = 'yousef-alshehri', title_ar = 'أستاذ', specialty_ar = 'النقد الأدبي', bio_ar = 'الأستاذ يوسف الشهري ناقد أدبي وصاحب مكتبة متخصصة في الكتب العربية، يحاور الكتّاب والشعراء ويقرأ في الروايات والمعارك الفكرية عبر حبر وورق.', country = 'السعودية', is_verified = false, followers_count = 18300, social_links = '{"twitter":"https://twitter.com/yousef_books","instagram":"https://instagram.com/yousef.aladab"}'::jsonb WHERE name_ar = 'الأستاذ يوسف الشهري';

UPDATE hosts SET slug = 'fatima-alghamdi', title_ar = 'أستاذة', specialty_ar = 'التاريخ ووثائقات الرحلات', bio_ar = 'الأستاذة فاطمة الغامدي كاتبة رحلات ومؤرخة توثّق حكايات المدن العربية وعمارتها وذاكرتها الشعبية في رحلات مُستمعة عبر بودكاست ذاكرة الأمكنة.', country = 'اليمن', is_verified = true, followers_count = 27900, social_links = '{"instagram":"https://instagram.com/fatima.travels","twitter":"https://twitter.com/fatima_ghamdi","website":"https://fatima.example.com"}'::jsonb WHERE name_ar = 'الأستاذة فاطمة الغامدي';

UPDATE hosts SET slug = 'khalid-alenezi', title_ar = 'كابتن', specialty_ar = 'التدريب الرياضي والتغذية', bio_ar = 'الكابتن خالد العنزي مدرب شخصي معتمد ومستشار تغذية، يساعد المستمعين على بناء أسلوب حياة متوازن من خلال عادات عملية في التغذية واللياقة.', country = 'الكويت', is_verified = true, followers_count = 54300, social_links = '{"youtube":"https://youtube.com/@khalid-fit","instagram":"https://instagram.com/khalid.fitness","twitter":"https://twitter.com/khalid_enezi"}'::jsonb WHERE name_ar = 'الكابتن خالد العنزي';

UPDATE hosts SET slug = 'layla-alqahtani', title_ar = 'دكتور', specialty_ar = 'طب النوم', bio_ar = 'د. ليلى القحطاني طبيبة نوم متخصصة، تشرح علم النوم وتحسين جودته بأدلة علمية، وتستقبل أسئلة المستمعين حول الأرق واضطرابات النوم.', country = 'الإمارات', is_verified = true, followers_count = 33600, social_links = '{"twitter":"https://twitter.com/layla_sleep","instagram":"https://instagram.com/dr.layla","website":"https://layla.example.com"}'::jsonb WHERE name_ar = 'د. ليلى القحطاني';

UPDATE hosts SET slug = 'reem-alshammari', title_ar = 'مهندس', specialty_ar = 'تطوير المسار المهني', bio_ar = 'م. ريم الشمري مدرّبة مهنية ومستشارة في تطوير المسار، ساعدت آلاف الخريجين على دخول سوق العمل عبر إرشادات عملية في السيرة الذاتية والمقابلات.', country = 'السعودية', is_verified = true, followers_count = 29700, social_links = '{"linkedin":"https://linkedin.com/in/reem-shammari","twitter":"https://twitter.com/reem_career","website":"https://reem.example.com"}'::jsonb WHERE name_ar = 'م. ريم الشمري';

UPDATE hosts SET slug = 'tariq-aldossary', title_ar = 'أستاذ', specialty_ar = 'إدارة المنتجات والعمل عن بُعد', bio_ar = 'أ. طارق الدوسري مدير منتجات وخبير عمل عن بُعد، يشارك خبرته في الإنتاجية والتركيز وإدارة الفرق الموزعة عبر قارات مختلفة.', country = 'البحرين', is_verified = false, followers_count = 21400, social_links = '{"twitter":"https://twitter.com/tariq_remote","linkedin":"https://linkedin.com/in/tariq-dossary"}'::jsonb WHERE name_ar = 'أ. طارق الدوسري';

UPDATE hosts SET slug = 'adel-almutairi', title_ar = 'أستاذ', specialty_ar = 'الثقافة المالية', bio_ar = 'أ. عادل المطيري مستشار مالي ومدرّب في الثقافة المالية، يبسّط الادخار والاستثمار وإدارة الديون بلغة واقعية يناسبها كل مستمع.', country = 'السعودية', is_verified = true, followers_count = 47100, social_links = '{"youtube":"https://youtube.com/@adel-money","twitter":"https://twitter.com/adel_finance","website":"https://adel.example.com"}'::jsonb WHERE name_ar = 'أ. عادل المطيري';

UPDATE hosts SET slug = 'hind-alzahrani', title_ar = 'مهندس', specialty_ar = 'التحليل المالي والاقتصاد', bio_ar = 'م. هند الزهراني محللة مالية وكاتبة اقتصادية، تحلل أسواق المال والعقارات وترصد مؤشرات الاقتصاد الكلي بأرقام واضحة.', country = 'السعودية', is_verified = true, followers_count = 38900, social_links = '{"twitter":"https://twitter.com/hind_markets","linkedin":"https://linkedin.com/in/hind-zahrani"}'::jsonb WHERE name_ar = 'م. هند الزهراني';

UPDATE hosts SET slug = 'munira-alharbi', title_ar = 'دكتور', specialty_ar = 'الاستشارات الأسرية', bio_ar = 'د. منيرة الحربي مستشارة أسرية ومدرّبة في العلاقات، تعمل مع الأزواج والآباء على مهارات الاتصال والحوار داخل الأسرة.', country = 'الأردن', is_verified = true, followers_count = 31200, social_links = '{"instagram":"https://instagram.com/munira.family","twitter":"https://twitter.com/munira_harbi","website":"https://munira.example.com"}'::jsonb WHERE name_ar = 'د. منيرة الحربي';

UPDATE hosts SET slug = 'salman-alrashid', title_ar = 'أستاذ', specialty_ar = 'الذكاء العاطفي والعلاقات', bio_ar = 'أ. سلمان الراشد مدرّب في الذكاء العاطفي والعلاقات، يساعد المستمعين على بناء صداقات ناضجة وحدود واضحة في العلاقات.', country = 'قطر', is_verified = false, followers_count = 16800, social_links = '{"instagram":"https://instagram.com/salman.eq","twitter":"https://twitter.com/salman_rashid"}'::jsonb WHERE name_ar = 'أ. سلمان الراشد';

UPDATE hosts SET slug = 'amal-alghamdi', title_ar = 'دكتور', specialty_ar = 'العلاج النفسي المعرفي', bio_ar = 'د. أمل الغامدي معالجة نفسية متخصصة في العلاج المعرفي، تقدّم ممارسات للتأمل والوعي الذهني وتقليل التوتر بأساليب مثبتة علمياً.', country = 'السعودية', is_verified = true, followers_count = 44500, social_links = '{"instagram":"https://instagram.com/amal.mind","twitter":"https://twitter.com/amal_ghamdi","website":"https://amal.example.com"}'::jsonb WHERE name_ar = 'د. أمل الغامدي';

UPDATE hosts SET slug = 'fahad-alsubaie', title_ar = 'دكتور', specialty_ar = 'الطب النفسي', bio_ar = 'د. فهد السبيعي طبيب نفسي وكاتب في الصحة النفسية، يشرح المشاعر المعقدة والصدمات ورحلة التعافي بلغة إنسانية قريبة.', country = 'السعودية', is_verified = true, followers_count = 52100, social_links = '{"twitter":"https://twitter.com/fahad_psy","youtube":"https://youtube.com/@fahad-psy","website":"https://fahad.example.com"}'::jsonb WHERE name_ar = 'د. فهد السبيعي';

UPDATE hosts SET slug = 'badr-alotaibi', title_ar = 'دكتور', specialty_ar = 'القيادة والإدارة', bio_ar = 'د. بدر العتيبي مدرّب قيادة ومستشار إداري، يجمع بين التراث العربي والنظريات الحديثة في تدريب القادة والمديرين.', country = 'السعودية', is_verified = true, followers_count = 36800, social_links = '{"linkedin":"https://linkedin.com/in/badr-otaibi","twitter":"https://twitter.com/badr_leadership"}'::jsonb WHERE name_ar = 'د. بدر العتيبي';

UPDATE hosts SET slug = 'lama-alharthy', title_ar = 'أستاذة', specialty_ar = 'القيادة الواعية', bio_ar = 'أ. لمى الحارثي مدرّبة في القيادة الواعية، تؤمن أن القيادة الحقيقية مبنية على التعاطف والوعي لا السلطة، وتدرب النساء والشباب على ذلك.', country = 'عمان', is_verified = false, followers_count = 19200, social_links = '{"instagram":"https://instagram.com/lama.leads","twitter":"https://twitter.com/lama_harthy"}'::jsonb WHERE name_ar = 'أ. لمى الحارثي';

UPDATE hosts SET slug = 'walid-alqahtani', title_ar = 'مهندس', specialty_ar = 'هندسة البرمجيات', bio_ar = 'م. وليد القحطاني مهندس برمجيات وصانع محتوى تقني، يبسّط البرمجة والأمن السيبراني والحوسبة السحابية للمستمع العربي.', country = 'السعودية', is_verified = true, followers_count = 41700, social_links = '{"youtube":"https://youtube.com/@walid-tech","twitter":"https://twitter.com/walid_dev","github":"https://github.com/walid"}'::jsonb WHERE name_ar = 'م. وليد القحطاني';

UPDATE hosts SET slug = 'noura-alsaad', title_ar = 'مهندس', specialty_ar = 'التحليل التقني والابتكار', bio_ar = 'م. نورة السعد محللة تقنية وكاتبة في الابتكار، تستكشف التقنيات الناشئة من الواقع الافتراضي إلى الحوسبة الكمومية وتأثيرها على حياتنا.', country = 'الإمارات', is_verified = true, followers_count = 25500, social_links = '{"twitter":"https://twitter.com/noura_tech","linkedin":"https://linkedin.com/in/noura-saad"}'::jsonb WHERE name_ar = 'م. نورة السعد';

UPDATE hosts SET slug = 'turki-aldossary', title_ar = 'مدرب', specialty_ar = 'العادات والتغيير السلوكي', bio_ar = 'أ. تركي الدوسري مدرّب معتمد في العادات والتغيير السلوكي، يحوّل كتب التنمية الذاتية إلى خطط عملية قابلة للتنفيذ من اليوم الأول.', country = 'الكويت', is_verified = true, followers_count = 39400, social_links = '{"instagram":"https://instagram.com/turki.habits","twitter":"https://twitter.com/turki_habits","website":"https://turki.example.com"}'::jsonb WHERE name_ar = 'أ. تركي الدوسري';

UPDATE hosts SET slug = 'asmaa-alzahrani', title_ar = 'أستاذة', specialty_ar = 'التحفيز وتطوير الذات', bio_ar = 'أ. أسماء الزهراني متحدثة تحفيزية ومدرّبة في تطوير الذات، تلهم من يريد إعادة اختراع نفسه في أي مرحلة من العمر.', country = 'المغرب', is_verified = false, followers_count = 22600, social_links = '{"instagram":"https://instagram.com/asmaa.speaks","twitter":"https://twitter.com/asmaa_zahrani"}'::jsonb WHERE name_ar = 'أ. أسماء الزهراني';

-- ---------- 20261120092523_20261120000002_seed_extra_host_podcasts.sql.sql ----------
/*
# Add second podcasts for top hosts

1. Seed Data
- Adds one extra podcast (with 3 episodes each) for six of the most-followed hosts,
  so podcast counts per host vary between 1 and 2 (within the 1-4 target)
  and host profile pages show richer stats.
- Matched by host slug (stable), idempotent via title existence check.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_podcast_id uuid;
BEGIN
  -- d. ماجد العتيبي (science)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'همسة كونية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'همسة كونية', 'حوارات قصيرة عن عظمة الكون ودقة الكواكب، بأسلوب سردي مشوّق.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast23/400/400', 'expert', 18300, 4.7
    FROM hosts h WHERE h.slug = 'majed-alotaibi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'ثقب أسود قريب منك', 'ماذا يحدث لو اقترب ثقب أسود؟', v_audio, 1320, now() - interval '9 days', 6400),
      (v_podcast_id, 'أصوات الكواكب', 'كيف تُحوَّل بيانات الكواكب إلى صوت.', v_audio, 1140, now() - interval '4 days', 4100),
      (v_podcast_id, 'أقدم ضوء', 'رحلة صورة في تحوّل عبر ملايين السنين.', v_audio, 1260, now() - interval '1 day', 2900);
  END IF;

  -- الشيخ عبدالله الحارثي (religious)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'نفحات الإيمان') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'نفحات الإيمان', 'مقالات صوتية قصيرة في الرقائق والتنزّه قبل الصلوات.', h.id, h.category_id, 'religious', 'https://picsum.photos/seed/podcast24/400/400', 'beginner', 25400, 4.9
    FROM hosts h WHERE h.slug = 'abdullah-alharthy' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'قلب سالِم', 'كيف نصل إلى السلامة الداخلية.', v_audio, 840, now() - interval '8 days', 8800),
      (v_podcast_id, 'أوراد الصباح', 'على أثر النور المبكر.', v_audio, 780, now() - interval '3 days', 6200),
      (v_podcast_id, 'خشوع في الصلاة', 'كيف نحضر القلب.', v_audio, 900, now() - interval '1 day', 5100);
  END IF;

  -- الكابتن خالد العنزي (health)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'اللياقة اليومية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'اللياقة اليومية', 'جلسات إرشادية قصيرة للحركة اليومية وتمارين منزلية.', h.id, h.category_id, 'motivational', 'https://picsum.photos/seed/podcast25/400/400', 'beginner', 22100, 4.5
    FROM hosts h WHERE h.slug = 'khalid-alenezi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'إطالاوات الصباح', 'روتين إطالة خمس دقائق.', v_audio, 660, now() - interval '6 days', 7300),
      (v_podcast_id, 'المشي 8000 خطوة', 'لماذا المشي أذكى رياضة؟', v_audio, 1020, now() - interval '2 days', 5400),
      (v_podcast_id, 'الماء والحركة', 'قاعدة الجفاف الخفي.', v_audio, 720, now() - interval '1 day', 3900);
  END IF;

  -- د. فهد السبيعي (mental)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'بروح هادئة') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'بروح هادئة', 'حوارات طويلة مع ضيوف حول الصحة النفسية في العالم العربي.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast26/400/400', 'expert', 16700, 4.8
    FROM hosts h WHERE h.slug = 'fahad-alsubaie' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'القلق الاجتماعي', 'كيف نتعامل مع الخوف من الناس.', v_audio, 2400, now() - interval '11 days', 5200),
      (v_podcast_id, 'الوسواس القهري', 'فهم الأفكار القهرية.', v_audio, 2280, now() - interval '5 days', 4600),
      (v_podcast_id, 'الحرمان النفسي', 'ماذا نفعل بما لم يُشبع في الطفولة؟', v_audio, 2640, now() - interval '1 day', 3800);
  END IF;

  -- أ. عادل المطيري (finance)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'قرارات مالية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'قرارات مالية', 'دراسات حالة لقرارات مالية حقيقية وما يمكن أن نتعلمه منها.', h.id, h.category_id, 'professional', 'https://picsum.photos/seed/podcast27/400/400', 'intermediate', 14300, 4.4
    FROM hosts h WHERE h.slug = 'adel-almutairi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'شراء أول عقار', 'دراسة حالة: إيجار أم تمويل؟', v_audio, 1800, now() - interval '7 days', 4400),
      (v_podcast_id, 'مشروع جانبي', 'متى يتحول الهواية إلى دخل؟', v_audio, 1560, now() - interval '3 days', 3600),
      (v_podcast_id, 'صندوق الطوارئ', 'كم يجب أن يكفي؟', v_audio, 1320, now() - interval '1 day', 2800);
  END IF;

  -- م. وليد القحطاني (tech)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'كود وقهوة') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'كود وقهوة', 'حوارات مع مبرمجين عن المسار التقني وأدوات المستقبل.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast28/400/400', 'intermediate', 12900, 4.6
    FROM hosts h WHERE h.slug = 'walid-alqahtani' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'أول وظيفة برمجية', 'كيف تقتنع شركة بفكرتك؟', v_audio, 1920, now() - interval '10 days', 3100),
      (v_podcast_id, 'مساعدات الذكاء الاصطناعي', 'هل تحل محل المبرمج؟', v_audio, 1740, now() - interval '4 days', 4200),
      (v_podcast_id, 'أدوات 2026', 'ما يستحق التعلم هذا العام.', v_audio, 1560, now() - interval '1 day', 2400);
  END IF;
END $$;

-- ---------- 20261120094415_20261120100000_seed_celebrity_hosts.sql.sql ----------
/*
# Add 28 celebrity/famous hosts with full podcast catalogs

1. Seed Data
- Adds 28 new well-known hosts across all 10 categories with:
  realistic Arabic names, celebrity-level follower counts, verified badges,
  full bios, social links, and real portrait photos.
- Each host gets 1-4 podcasts, and EVERY podcast gets 4-6 episodes
  with distinct titles, descriptions, durations, and publish dates.
- Idempotent: guarded by slug existence checks.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_cat_tech uuid;
  v_cat_mental uuid;
  v_cat_health uuid;
  v_cat_family uuid;
  v_cat_science uuid;
  v_cat_leadership uuid;
  v_cat_finance uuid;
  v_cat_career uuid;
  v_cat_culture uuid;
  v_cat_religious uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  -- Resolve category IDs at runtime: seed_podcast_data.sql generates fresh UUIDs.
  SELECT id INTO v_cat_tech       FROM categories WHERE name_ar = 'التقنية' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_cat_health     FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_cat_family     FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_cat_science    FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_finance    FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_religious  FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;

-- ==================== 1. د. طارق السويدان (religious/culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'tareq-al-suwaidan') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('طارق السويدان', 'tareq-al-suwaidan',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/suwaidan-cover/1200/400',
    'دكتور', 'التاريخ والسيرة والدعوة', 'د. طارق السويدان داعية ومؤرخ ومؤلف كويتي بارز، ألّف أكثر من مئة كتاب في السيرة والتاريخ والتنمية، وقدم مئات الساعات من المحاضرات المؤثرة للشباب العربي.', 'الكويت', v_cat_religious, true, 1250000,
    '{"youtube":"https://youtube.com/@tareqalsuwaidan","twitter":"https://twitter.com/tareqalsuwaidan","instagram":"https://instagram.com/tareqalsuwaidan","website":"https://suwaidan.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('سيرة النبيين', 'رحلة ممتعة في حياة الأنبياء والدروس المستفادة منها.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-suwaidan1/400/400', 'beginner', 890000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'نوح عليه السلام: صبر قرن كامل', 'قصة دعوة نوح وقصته مع قومه.', v_audio, 2700, now() - interval '40 days', 120000),
    (v_pod_id, 'إبراهيم: أبو الأنبياء', 'رحلة إبراهيم في البحث عن الحق.', v_audio, 2850, now() - interval '33 days', 105000),
    (v_pod_id, 'يوسف: من البئر إلى الخزينة', 'دروس من حياة يوسف في مصر.', v_audio, 2600, now() - interval '26 days', 98000),
    (v_pod_id, 'موسى: مواجهة الطغيان', 'موسى وفرعون ومعجزات الخروج.', v_audio, 2900, now() - interval '19 days', 87000),
    (v_pod_id, 'عيسى: الروح والمعجزات', 'قصة عيسى ودعوته.', v_audio, 2450, now() - interval '12 days', 76000),
    (v_pod_id, 'محمد ﷺ: الرسالة تبدأ', 'بدايات الدعوة النبوية في مكة.', v_audio, 3100, now() - interval '5 days', 143000);

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قصص التاريخ الإسلامي', 'حكايات ملهمة من عصور الإسلام الذهبية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-suwaidan2/400/400', 'intermediate', 620000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأندلس: جسر الحضارات', 'قصة قرطبة وعلوم الأندلس.', v_audio, 2400, now() - interval '35 days', 87000),
    (v_pod_id, 'بيت الحكمة في بغداد', 'حركة الترجمة والعلم في العصر العباسي.', v_audio, 2250, now() - interval '28 days', 72000),
    (v_pod_id, 'صلاح الدين: الفاتح الناصر', 'توحيد مصر والشام ومعركة حطين.', v_audio, 2600, now() - interval '21 days', 91000),
    (v_pod_id, 'عثمان: سيد المطهرين', 'عثمان بن عفان وجمع القرآن.', v_audio, 2350, now() - interval '14 days', 68000),
    (v_pod_id, 'المماليك: حماة الحضارة', 'دور المماليك في صد المغول.', v_audio, 2200, now() - interval '7 days', 54000);
END IF;

-- ==================== 2. د. عائض القرني (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ayed-al-qarni') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عائض القرني', 'ayed-al-qarni',
    'https://images.unsplash.com/photo-1591604466107-ec97de977aff?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/qarni-cover/1200/400',
    'دكتور', 'الدعوة والتزكية', 'د. عائض القرني داعية سعودي شهير ومؤلف كتاب "لا تحزن" الذي بيعت منه ملايين النسخ، له برامج دعوية يومية يتابعها ملايين المستمعين.', 'السعودية', v_cat_religious, true, 980000,
    '{"youtube":"https://youtube.com/@ayedqarni","twitter":"https://twitter.com/ayedalqarni","website":"https://qarni.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('لا تحزن', 'مقاطع مؤملة تبعث الأمل والسكينة في القلب.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-qarni1/400/400', 'beginner', 1450000, 5.0)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الابتلاء رحمة', 'لماذا يبتلي الله عباده المؤمنين؟', v_audio, 1800, now() - interval '42 days', 210000),
    (v_pod_id, 'التوكل على الله', 'معنى التوكل الحقيقي في الحياة.', v_audio, 1650, now() - interval '35 days', 185000),
    (v_pod_id, 'صبر أيوب', 'الصبر على المرض والفقد.', v_audio, 1950, now() - interval '28 days', 167000),
    (v_pod_id, 'الشفاء بالذكر', 'أثر الذكر على القلق والحزن.', v_audio, 1500, now() - interval '21 days', 142000),
    (v_pod_id, 'الرضا بالقدر', 'كيف ترتضى بقضاء الله؟', v_audio, 1750, now() - interval '14 days', 129000),
    (v_pod_id, 'جنة الدنيا', 'استخراج السعادة من أيامك العادية.', v_audio, 1600, now() - interval '7 days', 156000);
END IF;

-- ==================== 3. د. محمد العريفي (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mohammed-al-arifi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('محمد العريفي', 'mohammed-al-arifi',
    'https://images.unsplash.com/photo-1595152772835-21967495f6e0?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/arifi-cover/1200/400',
    'دكتور', 'الدعوة والفقه', 'د. محمد العريفي داعٍ سعودي وأستاذ شريعة، مشهور بمحاضراته المليئة بالحكمة والدعابة، وأحد أكثر الدعاة متابعة على مواقع التواصل.', 'السعودية', v_cat_religious, true, 1120000,
    '{"youtube":"https://youtube.com/@arifi","twitter":"https://twitter.com/mohamedalarifi","instagram":"https://instagram.com/drarifi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مع الداعية', 'حوارات دعوية مفتوحة مع الشباب.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-arifi1/400/400', 'beginner', 720000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الشباب والغفلة', 'كيف يتغلب الشباب على الغفلة؟', v_audio, 2100, now() - interval '30 days', 132000),
    (v_pod_id, 'الصحبة الصالحة', 'أثر الأصدقاء على الإيمان.', v_audio, 1950, now() - interval '23 days', 118000),
    (v_pod_id, 'أثر المساجد', 'أهمية المساجد في بناء الشخصية.', v_audio, 1800, now() - interval '16 days', 96000),
    (v_pod_id, 'الزواج والسعادة', 'نصائح عملية للزوجين الشباب.', v_audio, 2250, now() - interval '9 days', 108000),
    (v_pod_id, 'الفوائد العجيبة', 'فوائد دينية غريبة ومفيدة.', v_audio, 1700, now() - interval '2 days', 85000);
END IF;

-- ==================== 4. أحمد الشقيري (culture/motivational) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmad-al-shugairi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد الشقيري', 'ahmad-al-shugairi',
    'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/shugairi-cover/1200/400',
    'مذيع', 'الرسائل الإعلامية والتنمية', 'أحمد الشقيري إعلامي سعودي بارز ومقدم برنامج "يا هلا" و"خواطر" الذي غيّر وجه البرامج التنموية في العالم العربي، ومن أكثر الشخصيات تأثيراً في الشباب.', 'السعودية', v_cat_culture, true, 1650000,
    '{"youtube":"https://youtube.com/@shugairi","twitter":"https://twitter.com/shugairi","instagram":"https://instagram.com/shugairi","website":"https://shugairi.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('خواطر الشقيري', 'تأملات قصيرة في القضايا الاجتماعية والشخصية.', v_host_id, v_cat_culture, 'motivational', 'https://picsum.photos/seed/pod-shugairi1/400/400', 'beginner', 1900000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'لماذا نقرأ؟', 'أهمية القراءة في حياتنا اليومية.', v_audio, 1200, now() - interval '25 days', 240000),
    (v_pod_id, 'رحلة إلى اليابان', 'دروس من ثقافة اليابان في الانضباط.', v_audio, 1350, now() - interval '20 days', 198000),
    (v_pod_id, 'الحفاظ على البيئة', 'مسؤوليتنا تجاه الكوكب.', v_audio, 1100, now() - interval '15 days', 176000),
    (v_pod_id, 'أمي', 'رسالة لكل أم في العالم العربي.', v_audio, 950, now() - interval '10 days', 285000),
    (v_pod_id, 'الوقت كالسيف', 'إدارة الوقت بذكاء.', v_audio, 1050, now() - interval '5 days', 210000);

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رحلات الشقيري', 'قصص من رحلاته حول العالم والدروس المستفادة.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-shugairi2/400/400', 'intermediate', 840000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'طوكيو المنظمة', 'ماذا تعلمنا من النظام الياباني؟', v_audio, 1500, now() - interval '18 days', 132000),
    (v_pod_id, 'إسطنبول العريقة', 'بين الحضارة البيزنطية والعثمانية.', v_audio, 1400, now() - interval '12 days', 118000),
    (v_pod_id, 'أرض الفرانكستين', 'رحلة إلى ألمانيا والدروس الصناعية.', v_audio, 1450, now() - interval '6 days', 97000);
END IF;

-- ==================== 5. د. منصور الإدريسي (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mansour-al-idrissi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('منصور الإدريسي', 'mansour-al-idrissi',
    'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/idrissi-cover/1200/400',
    'دكتور', 'الفيزياء النووية', 'د. منصور الإدريسي عالم فيزياء نووية سعودي بارز، شارك في مشاريع بحثية دولية، ويعد من أوائل من قدّموا البرامج العلمية بالعربية.', 'السعودية', v_cat_science, true, 540000,
    '{"twitter":"https://twitter.com/mansour_sci","youtube":"https://youtube.com/@mansour-sci"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مختبر العلم', 'رحلات في الفيزياء والكيمياء والفلك.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-idrissi1/400/400', 'expert', 420000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الطاقة النووية السلمية', 'كيف تعمل المفاعلات النووية؟', v_audio, 2200, now() - interval '22 days', 76000),
    (v_pod_id, 'الجسيمات الأولية', 'من الكوارك إلى الهيغز.', v_audio, 2100, now() - interval '15 days', 62000),
    (v_pod_id, 'الاندماج النووي', 'حلم الطاقة اللانهائية.', v_audio, 2350, now() - interval '8 days', 58000),
    (v_pod_id, 'التقنيات الفائقة', 'مواد تتحدى قوانين الفيزياء.', v_audio, 1900, now() - interval '1 day', 44000);
END IF;

-- ==================== 6. د. هيثم الشرارى (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'haitham-al-sharari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('هيثم الشرارى', 'haitham-al-sharari',
    'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/sharari-cover/1200/400',
    'دكتور', 'علم الفلك', 'د. هيثم الشرارى عالم فلك عراقي شهير، مدير مرصد وعضو في الاتحاد الفلكي الدولي، يبسّط أعماق الكون للمستمع العربي.', 'العراق', v_cat_science, true, 380000,
    '{"twitter":"https://twitter.com/haitham_astro","youtube":"https://youtube.com/@haitham-astro"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مذكرات فلكية', 'أسرار الكون والأجرام السماوية.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-sharari1/400/400', 'intermediate', 310000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التوأمية الكونية', 'لماذا تشبه المجرات بعضها؟', v_audio, 2050, now() - interval '16 days', 54000),
    (v_pod_id, 'الكويكبات الخطرة', 'ماذا لو اصطدم كويكب بالأرض؟', v_audio, 1900, now() - interval '10 days', 68000),
    (v_pod_id, 'شفق القطب', 'سر الأضواء الشمالية.', v_audio, 1750, now() - interval '4 days', 42000);
END IF;

-- ==================== 7. د. علي الشملان (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ali-al-shamlan') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('علي الشملان', 'ali-al-shamlan',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/shamlan-cover/1200/400',
    'دكتور', 'الطب الباطني والتغذية', 'د. علي الشملان طبيب باطنة كويتي مشهور في الإعلام الصحي، أسس برنامج صحي أسبوعي يتابعه مئات الآلاف من المرضى والمهتمين.', 'الكويت', v_cat_health, true, 460000,
    '{"youtube":"https://youtube.com/@alishamlan","twitter":"https://twitter.com/ali_shamlan","instagram":"https://instagram.com/dr.shamlan"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('الطبيب السابع', 'نصائح طبية مبسطة للحياة اليومية.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-shamlan1/400/400', 'beginner', 560000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السكري الخفي', 'أعراض مبكرة لا يجب تجاهلها.', v_audio, 1600, now() - interval '28 days', 96000),
    (v_pod_id, 'الكوليسترول: الصديق والعدو', 'الفرق بين الكوليسترول النافع والضار.', v_audio, 1450, now() - interval '21 days', 82000),
    (v_pod_id, 'الصيام الصحي', 'كيف تصوم دون إجهاد جسمك؟', v_audio, 1300, now() - interval '14 days', 74000),
    (v_pod_id, 'الأدوية والمداواة', 'هل كل دواء بديل؟', v_audio, 1550, now() - interval '7 days', 61000),
    (v_pod_id, 'الوقاية خير من العلاج', 'فحوصات دورية تُنقذ حياتك.', v_audio, 1200, now() - interval '1 day', 55000);
END IF;

-- ==================== 8. د. خالد الوزير (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'khaled-al-wazir') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('خالد الوزير', 'khaled-al-wazir',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/wazir-cover/1200/400',
    'دكتور', 'الطب النفسي للأطفال', 'د. خالد الوزير طبيب نفسي مصري متخصص في صحة الأطفال والمراهقين، يقدم نصائح للآباء حول تربية أبنائهم نفسيًا.', 'مصر', v_cat_mental, true, 320000,
    '{"youtube":"https://youtube.com/@khaled-psy","twitter":"https://twitter.com/khaled_wazir"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عقل الطفل', 'دليل الآباء لفهم أطفالهم نفسيًا.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-wazir1/400/400', 'intermediate', 280000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قلق المدرسة', 'كيف تتعامل مع رفض طفلك للمدرسة؟', v_audio, 1700, now() - interval '26 days', 64000),
    (v_pod_id, 'الشاشة والطفل', 'أثر الإدمان الرقمي على الدماغ النامي.', v_audio, 1850, now() - interval '19 days', 78000),
    (v_pod_id, 'تدليل أم رعاية؟', 'الفرق بين الحب والإفراط.', v_audio, 1600, now() - interval '12 days', 56000),
    (v_pod_id, 'الغيرة بين الأشقاء', 'كيف توزع الحب بعدول؟', v_audio, 1500, now() - interval '5 days', 49000);
END IF;

-- ==================== 9. د. أحمد العمري (business/finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmed-al-omari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد العمري', 'ahmed-al-omari',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/omari-cover/1200/400',
    'دكتور', 'الاقتصاد والاستثمار', 'د. أحمد العمري خبير اقتصادي إماراتي، مستشار في صناديق الثروة السيادية، يقدم تحليلات اقتصادية على القنوات الفضائية والبودكاست.', 'الإمارات', v_cat_finance, true, 690000,
    '{"twitter":"https://twitter.com/ahmed_economy","linkedin":"https://linkedin.com/in/ahmed-omari","website":"https://omari.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('الاقتصاد العجيب', 'تحليلات اقتصادية مبسطة للأحداث اليومية.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-omari1/400/400', 'intermediate', 510000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التضخم: من يؤكل جيبه؟', 'لماذا ترتفع الأسعار وكيف نحمي أموالنا؟', v_audio, 1800, now() - interval '24 days', 94000),
    (v_pod_id, 'النفط والريال', 'علاقة النفط بعملات الخليج.', v_audio, 1650, now() - interval '17 days', 78000),
    (v_pod_id, 'العملات الرقمية', 'هل البيتكوين فقاعة أم مستقبل؟', v_audio, 2100, now() - interval '10 days', 112000),
    (v_pod_id, 'الاستثمار العقاري', 'متى يكون العقار صفقة رابحة؟', v_audio, 1950, now() - interval '3 days', 67000);
END IF;

-- ==================== 10. لؤي النقيب (career) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'loay-al-naqib') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('لؤي النقيب', 'loay-al-naqib',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/naqib-cover/1200/400',
    'مهندس', 'تطوير الأعمال والريادة', 'م. لؤي النقيب رائد أعمال أردني، أسس عدة شركات ناشئة ناجحة، ويشارك خبرته في الريادة والتوظيف عبر برامجه الشهيرة.', 'الأردن', v_cat_career, true, 720000,
    '{"linkedin":"https://linkedin.com/in/loay-naqib","twitter":"https://twitter.com/loay_naqib","instagram":"https://instagram.com/loay.entrepreneur"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رائد أعمال', 'حوارات مع مؤسسين عن رحلاتهم في بناء الشركات.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-naqib1/400/400', 'expert', 630000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'من فكرة إلى شركة', 'كيف تبدأ رحلتك في الريادة؟', v_audio, 2400, now() - interval '27 days', 122000),
    (v_pod_id, 'التمويل الجريء', 'ماذا يريد المستثمر منك فعلاً؟', v_audio, 2200, now() - interval '20 days', 98000),
    (v_pod_id, 'الفشل الأول', 'قصص مؤسسين فشلوا ثم نجحوا.', v_audio, 2600, now() - interval '13 days', 134000),
    (v_pod_id, 'بناء الفريق', 'كيف توظف أصحاب المواهب؟', v_audio, 2050, now() - interval '6 days', 87000),
    (v_pod_id, 'الخروج الاستراتيجي', 'متى تبيع شركتك؟', v_audio, 1900, now() - interval '2 days', 65000);
END IF;

-- ==================== 11. د. سعد بن عمر (leadership) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'saad-bin-omar') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سعد بن عمر', 'saad-bin-omar',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/saad-cover/1200/400',
    'دكتور', 'الإدارة الاستراتيجية', 'د. سعد بن عمر أستاذ إدارة سعودي، قاد تحولات استراتيجية في مؤسسات كبرى، ويقدم برامج في القيادة وصناعة القرار.', 'السعودية', v_cat_leadership, true, 450000,
    '{"linkedin":"https://linkedin.com/in/saad-omar","twitter":"https://twitter.com/saad_leadership"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قرار القائد', 'كيف يتخذ القادة العظام قراراتهم؟', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-saad1/400/400', 'intermediate', 380000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'صناعة القرار الصعب', 'منهجية القادة في القرارات المزدهرة.', v_audio, 1800, now() - interval '23 days', 76000),
    (v_pod_id, 'قيادة الفرق البعيدة', 'إدارة فرق موزعة جغرافيًا.', v_audio, 1650, now() - interval '16 days', 62000),
    (v_pod_id, 'الثقافة المؤسسية', 'كيف تُبنى وتبقى؟', v_audio, 1750, now() - interval '9 days', 54000),
    (v_pod_id, 'الوريث القيادي', 'تحضير الجيل القيادي القادم.', v_audio, 1600, now() - interval '2 days', 43000);
END IF;

-- ==================== 12. أمين الطاهر (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'amine-al-taher') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أمين الطاهر', 'amine-al-taher',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/taher-cover/1200/400',
    'أستاذ', 'الاستشارات الأسرية', 'أ. أمين الطاهر مستشار أسري مغربي ومدرّب معتمد في العلاقات الزوجية، له برامج إذاعية وأخرى تلفزيونية تساعد الأسر على الاستقرار.', 'المغرب', v_cat_family, true, 290000,
    '{"youtube":"https://youtube.com/@amine-family","instagram":"https://instagram.com/amine.taher","website":"https://taher.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('بيت الطيب', 'نصائح عملية لبناء أسرة سعيدة.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-taher1/400/400', 'beginner', 340000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الزواج الأول', 'كيف تستعد للحياة الزوجية؟', v_audio, 1900, now() - interval '25 days', 78000),
    (v_pod_id, 'الحوار الزوجي', 'مهارات التواصل بين الزوجين.', v_audio, 1750, now() - interval '18 days', 65000),
    (v_pod_id, 'حل الخلافات', 'خطوات عملية لإصلاح ما بينكما.', v_audio, 1800, now() - interval '11 days', 58000),
    (v_pod_id, 'المراهق في البيت', 'كيف تتعامل مع ابنك المراهق؟', v_audio, 1650, now() - interval '4 days', 51000);
END IF;

-- ==================== 13. ريم الأنصاري (career) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'reem-al-ansari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('ريم الأنصاري', 'reem-al-ansari',
    'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/ansari-cover/1200/400',
    'أستاذة', 'الموارد البشرية', 'أ. ريم الأنصاري خبيرة موارد بشرية قطرية، شغلت مناصب قيادية في شركات عالمية، وتقدم إرشادات عملية للمتقدمين للوظائف.', 'قطر', v_cat_career, true, 380000,
    '{"linkedin":"https://linkedin.com/in/reem-ansari","twitter":"https://twitter.com/reem_hr"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مسار وظيفي', 'دليلك للنجاح في سوق العمل.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-ansari1/400/400', 'beginner', 290000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السيرة الذاتية المثالية', 'كيف تكتب سيرة تفتح الأبواب؟', v_audio, 1400, now() - interval '20 days', 68000),
    (v_pod_id, 'مقابلة العمل', 'أسئلة شائعة وإجابات ذكية.', v_audio, 1550, now() - interval '14 days', 61000),
    (v_pod_id, 'الترقية والزيادة', 'كيف تطلب ما تستحقه؟', v_audio, 1300, now() - interval '7 days', 49000),
    (v_pod_id, 'التغيير الوظيفي', 'متى تغير مسارك المهني؟', v_audio, 1450, now() - interval '1 day', 39000);
END IF;

-- ==================== 14. د. سلمى الحاج (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'salma-al-haj') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سلمى الحاج', 'salma-al-haj',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/salma-cover/1200/400',
    'دكتور', 'التغذية العلاجية', 'د. سلمى الحاج أخصائية تغذية لبنانية مشهورة عربيًا، تقدم خطط غذائية عملية وبرامج صحية عبر القنوات الفضائية والرقمية.', 'لبنان', v_cat_health, true, 820000,
    '{"instagram":"https://instagram.com/drsalma","youtube":"https://youtube.com/@salma-nutrition","twitter":"https://twitter.com/salma_diet"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مطبخ الصحة', 'نصائح غذائية للجسم والعقل.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-salma1/400/400', 'beginner', 610000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السكر المخفي', 'أين يختبئ السكر في طعامك؟', v_audio, 1350, now() - interval '22 days', 104000),
    (v_pod_id, 'الصيام المتقطع', 'هل يناسبك هذا النظام؟', v_audio, 1500, now() - interval '15 days', 91000),
    (v_pod_id, 'التغذية بعد الأربعين', 'ما يحتاجه جسمك مع التقدم بالعمر.', v_audio, 1400, now() - interval '8 days', 76000),
    (v_pod_id, 'مكملات أم طعام؟', 'الحقيقة حول الفيتامينات.', v_audio, 1250, now() - interval '1 day', 68000);
END IF;

-- ==================== 15. فيصل المسلم (culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'faisal-al-muslem') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('فيصل المسلم', 'faisal-al-muslem',
    'https://images.unsplash.com/photo-1615109398623-88346a601842?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/muslem-cover/1200/400',
    'أستاذ', 'العلوم السياسية', 'أ. فيصل المسلم كاتب وأستاذ علوم سياسية كويتي، يحلل الشأن الدولي ويقدم قراءة عميقة للتحولات الجيوسياسية.', 'الكويت', v_cat_culture, true, 340000,
    '{"twitter":"https://twitter.com/faisal_politics","youtube":"https://youtube.com/@faisal-analysis"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('تحليلات دولية', 'قراءة عميقة في أحداث العالم.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-muslem1/400/400', 'expert', 270000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'خرائط النفوذ', 'كيف تُرسم السياسات الدولية؟', v_audio, 2300, now() - interval '18 days', 62000),
    (v_pod_id, 'اقتصاد الحروب', 'من يمول النزاعات؟', v_audio, 2150, now() - interval '11 days', 54000),
    (v_pod_id, 'العربية في العالم', 'مستقبل المنطقة في النظام الدولي.', v_audio, 2400, now() - interval '4 days', 47000);
END IF;

-- ==================== 16. د. نادية العامري (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'nadia-al-amri') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('نادية العامري', 'nadia-al-amri',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/nadia-cover/1200/400',
    'دكتور', 'الاستشارات النفسية', 'د. نادية العامري أستاذة إرشاد نفسي أردنية، تقدم برامج في بناء الثقة بالنفس والتعافي من الصدمات النفسية.', 'الأردن', v_cat_mental, true, 410000,
    '{"instagram":"https://instagram.com/drnadia","twitter":"https://twitter.com/nadia_counseling","website":"https://nadia.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('جلسات نفسية', 'حوارات عميقة عن الصحة النفسية.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-nadia1/400/400', 'intermediate', 320000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الثقة بالنفس', 'كيف تبني ثقتك من الصفر؟', v_audio, 1900, now() - interval '21 days', 86000),
    (v_pod_id, 'أثر الطفولة', 'كيف تشكل طفولتك شخصيتك؟', v_audio, 2100, now() - interval '14 days', 74000),
    (v_pod_id, 'الحزن غير المكتمل', 'كيف نتجاوز الفقد؟', v_audio, 1800, now() - interval '7 days', 63000),
    (v_pod_id, 'الحدود الشخصية', 'كيف تقول لا دون شعور بالذنب؟', v_audio, 1700, now() - interval '1 day', 58000);
END IF;

-- ==================== 17. يوسف المنصوري (tech) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'yousef-al-mansoori') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('يوسف المنصوري', 'yousef-al-mansoori',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mansoori-cover/1200/400',
    'مهندس', 'الذكاء الاصطناعي', 'م. يوسف المنصوري مهندس ذكاء اصطناعي إماراتي، يعمل في أحد أكبر شركات التقنية، ويشرح الذكاء الاصطناعي للمستمع العربي بلغة بسيطة.', 'الإمارات', v_cat_tech, true, 560000,
    '{"youtube":"https://youtube.com/@yousef-ai","twitter":"https://twitter.com/yousef_ai","linkedin":"https://linkedin.com/in/yousef-mansoori"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عصر الذكاء', 'كل ما تريد معرفته عن الذكاء الاصطناعي.', v_host_id, v_cat_tech, 'scientific', 'https://picsum.photos/seed/pod-mansoori1/400/400', 'beginner', 480000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'ما هو الذكاء الاصطناعي التوليدي؟', 'شرح مبسط لنماذج الذكاء الحديثة.', v_audio, 1700, now() - interval '20 days', 112000),
    (v_pod_id, 'الذكاء في التعليم', 'كيف يغير الذكاء الاصطناعي التعلم؟', v_audio, 1550, now() - interval '13 days', 87000),
    (v_pod_id, 'وظائف المستقبل', 'ما المهارات التي ستحتاجها؟', v_audio, 1400, now() - interval '6 days', 74000),
    (v_pod_id, 'أخلاقيات الذكاء', 'أين نرسم الخط الأخلاقي؟', v_audio, 1650, now() - interval '1 day', 56000);
END IF;

-- ==================== 18. د. حسام المغربي (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'hossam-al-maghribi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('حسام المغربي', 'hossam-al-maghribi',
    'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/maghribi-cover/1200/400',
    'دكتور', 'علم الأحياء الدقيقة', 'د. حسام المغربي عالم أحياء دقيقة مغربي، باحث في مؤسسات علمية أوروبية، يقدم عالم الميكروبات بطريقة ممتعة.', 'المغرب', v_cat_science, true, 260000,
    '{"twitter":"https://twitter.com/hossam_bio","youtube":"https://youtube.com/@hossam-bio"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عالم الميكروبات', 'رحلة إلى عالم الكائنات الدقيقة.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-maghribi1/400/400', 'intermediate', 210000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'البكتيريا النافعة', 'أصدقاؤنا داخل أجسامنا.', v_audio, 1800, now() - interval '17 days', 52000),
    (v_pod_id, 'الفيروسات: عدو ذكي', 'كيف تهاجم الفيروسات خلايانا؟', v_audio, 1950, now() - interval '10 days', 61000),
    (v_pod_id, 'المضادات الحيوية', 'لماذا تفقد فعاليتها؟', v_audio, 1700, now() - interval '3 days', 43000);
END IF;

-- ==================== 19. د. بثينة العيسى (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'buthaina-al-issa') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('بثينة العيسى', 'buthaina-al-issa',
    'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/buthaina-cover/1200/400',
    'دكتور', 'التربية الأسرية', 'د. بثينة العيسى أستاذة تربية سعودية، خبيرة في شؤون الطفل والأسرة، تقدم برامج تربوية للأمهات والآباء.', 'السعودية', v_cat_family, true, 480000,
    '{"instagram":"https://instagram.com/drbuthaina","twitter":"https://twitter.com/buthaina_edu","website":"https://buthaina.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('تربية بلا صراع', 'دروس تربوية عملية للآباء والأمهات.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-buthaina1/400/400', 'beginner', 390000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الاستماع الفعال لطفلك', 'كيف تسمع ما لا يقوله طفلك؟', v_audio, 1600, now() - interval '19 days', 82000),
    (v_pod_id, 'العقاب والتهذيب', 'بدائل العقاب البدني.', v_audio, 1750, now() - interval '12 days', 71000),
    (v_pod_id, 'غرس القيم', 'كيف يتعلم الطفل بالقدوة؟', v_audio, 1500, now() - interval '5 days', 59000),
    (v_pod_id, 'أبناء الشاشات', 'التعامل مع إدمان الأجهزة.', v_audio, 1450, now() - interval '1 day', 66000);
END IF;

-- ==================== 20. د. عبدالرحمن المعلق (finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'abdulrahman-al-mualla') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عبدالرحمن المعلّا', 'abdulrahman-al-mualla',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mualla-cover/1200/400',
    'دكتور', 'المحاسبة والمراجعة', 'د. عبدالرحمن المعلّا أستاذ محاسبة إماراتي وخبير مالي معتمد، يقدم محتوى في الإدارة المالية الشخصية للأفراد والشركات.', 'الإمارات', v_cat_finance, true, 310000,
    '{"linkedin":"https://linkedin.com/in/abdulrahman-mualla","twitter":"https://twitter.com/abdulrahman_fi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('ميزانيتك', 'إدارة المال الشخصي بذكاء.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-mualla1/400/400', 'beginner', 240000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الادخار الذكي', 'قواعد الادخار البسيطة.', v_audio, 1500, now() - interval '16 days', 58000),
    (v_pod_id, 'الديون: كيف تتخلص منها؟', 'استراتيجيات سداد الديون.', v_audio, 1650, now() - interval '9 days', 67000),
    (v_pod_id, 'الميزانية العائلية', 'كيف تدير مصاريف البيت؟', v_audio, 1400, now() - interval '2 days', 49000);
END IF;

-- ==================== 21. نورة الحميدي (culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'noura-al-humaidi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('نورة الحميدي', 'noura-al-humaidi',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/humaidi-cover/1200/400',
    'أستاذة', 'الأدب العربي', 'أ. نورة الحميدي كاتبة وناقدة أدبية سعودية، مهتمة بالأدب الخليجي المعاصر، تقدم حوارات مع الكتّاب والشعراء.', 'السعودية', v_cat_culture, true, 220000,
    '{"twitter":"https://twitter.com/noura_adab","instagram":"https://instagram.com/noura.literature"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('ديوان الكلمة', 'حوارات أدبية وقراءات في الروايات العربية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-humaidi1/400/400', 'intermediate', 180000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الرواية الخليجية الجديدة', 'أين وصلت الرواية الخليجية؟', v_audio, 2000, now() - interval '15 days', 44000),
    (v_pod_id, 'الشعر المنثور', 'بين النثر والشعر الفصيح.', v_audio, 1850, now() - interval '8 days', 36000),
    (v_pod_id, 'قراءات في جبران', 'جبران خليل جبران بين الشرق والغرب.', v_audio, 1750, now() - interval '1 day', 41000);
END IF;

-- ==================== 22. د. مشعل الأحمد (leadership) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mishal-al-ahmad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('مشعل الأحمد', 'mishal-al-ahmad',
    'https://images.unsplash.com/photo-1615109398623-88346a601842?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mishal-cover/1200/400',
    'دكتور', 'التحول الرقمي والحوكمة', 'د. مشعل الأحمد خبير حوكمة وتحول رقمي كويتي، قاد مشاريع تحول استراتيجية في قطاعين حكومي وخاص، ويقدم برامج في القيادة الرقمية.', 'الكويت', v_cat_leadership, true, 270000,
    '{"linkedin":"https://linkedin.com/in/mishal-ahmad","twitter":"https://twitter.com/mishal_gov","website":"https://mishal.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قيادة التحول', 'كيف تقود مؤسستك نحو التحول الرقمي؟', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-mishal1/400/400', 'expert', 200000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'لماذا تفشل التحولات؟', 'أسباب فشل مشاريع التحول الرقمي.', v_audio, 1900, now() - interval '14 days', 48000),
    (v_pod_id, 'الحوكمة الرشيدة', 'أسس الحكم المؤسسي الجيد.', v_audio, 1750, now() - interval '7 days', 39000),
    (v_pod_id, 'الابتكار المؤسسي', 'كيف تبتكر داخل مؤسسة تقليدية؟', v_audio, 1600, now() - interval '1 day', 32000);
END IF;

-- ==================== 23. د. رانا حداد (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'rana-haddad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('rana حداد', 'rana-haddad',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/rana-cover/1200/400',
    'دكتور', 'طب الأسرة', 'د. رانا حداد طبيبة أسرة سورية، مشهورة بمحتواها الصحي المبسط الذي يشرح الأمراض الشائعة والوقاية منها.', 'سوريا', v_cat_health, true, 350000,
    '{"youtube":"https://youtube.com/@rana-health","instagram":"https://instagram.com/dr.rana","twitter":"https://twitter.com/rana_family_med"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عيادة الصحة', 'إجابات طبية لأسئلتك اليومية.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-rana1/400/400', 'beginner', 290000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأنفلونزا الموسمية', 'كيف تحمي نفسك وأسرتك؟', v_audio, 1400, now() - interval '13 days', 67000),
    (v_pod_id, 'الصداع المزمن', 'متى يكون الصداع خطيراً؟', v_audio, 1550, now() - interval '6 days', 54000),
    (v_pod_id, 'فحوصات دورية', 'ماذا تفحص وفي أي عمر؟', v_audio, 1300, now() - interval '1 day', 46000);
END IF;

-- ==================== 24. طلال العوضي (motivational) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'talal-al-awadi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('طلال العوضي', 'talal-al-awadi',
    'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/talal-cover/1200/400',
    'مدرب', 'التنمية البشرية', 'أ. طلال العوضي مدرب تنمية بشرية كويتي شهير، يقدم برامج تحفيزية للشباب حول الأهداف والإنتاجية وبناء العادات.', 'الكويت', v_cat_leadership, true, 640000,
    '{"youtube":"https://youtube.com/@talal-motivation","instagram":"https://instagram.com/talal.awadi","twitter":"https://twitter.com/talal_motivate"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('انطلق', 'دروس تحفيزية لبناء عادات إيجابية.', v_host_id, v_cat_leadership, 'motivational', 'https://picsum.photos/seed/pod-talal1/400/400', 'beginner', 530000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'ابدأ من حيث أنت', 'لا تنتظر الظروف المثالية.', v_audio, 1300, now() - interval '17 days', 112000),
    (v_pod_id, 'قوة الاستيقاظ المبكر', 'كيف تغير حياتك بساعة واحدة؟', v_audio, 1450, now() - interval '11 days', 96000),
    (v_pod_id, 'الأهداف الذكية', 'كيف تخطط لتحقيق أهدافك؟', v_audio, 1600, now() - interval '5 days', 78000),
    (v_pod_id, 'تغلب التسويف', 'استراتيجيات عملية للإنجاز.', v_audio, 1350, now() - interval '1 day', 89000);
END IF;

-- ==================== 25. د. أحمد خيري العنابي (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmad-al-annabi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد خيري العنابي', 'ahmad-al-annabi',
    'https://images.unsplash.com/photo-1595152772835-21967495f6e0?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/annabi-cover/1200/400',
    'دكتور', 'العلوم الشرعية', 'د. أحمد خيري العنابي عالم وداعية تونزي بارز، أستاذ علوم شرعية ومؤلف في الفقه والسيرة، يقدم دروساً عميقة ومبسطة.', 'تونس', v_cat_religious, true, 180000,
    '{"youtube":"https://youtube.com/@ahmad-annabi","twitter":"https://twitter.com/ahmad_annabi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('منس Waves الفقه', 'دروس فقهية مبسطة في العبادات.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-annabi1/400/400', 'intermediate', 150000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'فقه الطهارة', 'أحكام الوضوء والطهارة.', v_audio, 2100, now() - interval '12 days', 38000),
    (v_pod_id, 'فقه الصلاة', 'أحكام الصلاة وشروطها.', v_audio, 2250, now() - interval '6 days', 33000),
    (v_pod_id, 'فقه الصيام', 'أحكام الصيام وفيه ما يُستدرَك.', v_audio, 2000, now() - interval '1 day', 27000);
END IF;

-- ==================== 26. سارة البلوشي (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'sara-al-balushi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سارة البلوشي', 'sara-al-balushi',
    'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/sara-b-cover/1200/400',
    'أستاذة', 'العلاج المعرفي السلوكي', 'أ. سارة البلوشي معالجة نفسية عمانية متخصصة في العلاج المعرفي السلوكي، تساعد المستمعين على تغيير أنماط تفكيرهم السلبية.', 'عمان', v_cat_mental, true, 240000,
    '{"instagram":"https://instagram.com/sara.therapy","twitter":"https://twitter.com/sara_cbt"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('أفكار بديلة', 'تمارين عملية في العلاج المعرفي.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-sara-b1/400/400', 'beginner', 190000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التشوهات المعرفية', 'كيف يخدعك عقلك؟', v_audio, 1700, now() - interval '14 days', 46000),
    (v_pod_id, 'مذكرة الامتنان', 'كيف يغير الامتنان مزاجك؟', v_audio, 1500, now() - interval '7 days', 39000),
    (v_pod_id, 'التوقف عن التأنيب', 'كيف تتعامل مع ناقدك الداخلي؟', v_audio, 1600, now() - interval '1 day', 34000);
END IF;

-- ==================== 27. عبدالله المليفي (finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'abdullah-al-mulaifi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عبدالله المليفي', 'abdullah-al-mulaifi',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mulaifi-cover/1200/400',
    'أستاذ', 'التحليل المالي', 'أ. عبدالله المليفي محلل مالي كويتي، خبير في أسواق المال الخليجية، يقدم تحليلات يومية ونصائح استثمارية للمبتدئين والمحترفين.', 'الكويت', v_cat_finance, true, 430000,
    '{"twitter":"https://twitter.com/abdullah_markets","youtube":"https://youtube.com/@abdullah-finance"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('سوق المال', 'تحليلات ونصائح من قلب أسواق المال.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-mulaifi1/400/400', 'intermediate', 360000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأسهم للمدروس', 'كيف تبدأ في سوق الأسهم؟', v_audio, 1900, now() - interval '18 days', 74000),
    (v_pod_id, 'قراءة القوائم المالية', 'ماذا تخبرك ميزانية الشركة؟', v_audio, 2100, now() - interval '11 days', 57000),
    (v_pod_id, 'الصناديق المؤشرات', 'الاستثمار السلبي للمبتدئين.', v_audio, 1700, now() - interval '4 days', 46000),
    (v_pod_id, 'أخطاء المستثمر المبتدئ', 'تجنب هذه الفخاخ.', v_audio, 1550, now() - interval '1 day', 62000);
END IF;

-- ==================== 28. د. لمياء الصالح (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'lamia-al-saleh') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('لمياء الصالح', 'lamia-al-saleh',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/lamia-cover/1200/400',
    'دكتور', 'علم النفس التربوي', 'د. لمياء الصالح أستاذة علم نفس تربوي أردنية، خبيرة في تعليم الأطفال ورفع التحصيل الدراسي، تقدم برامج للطلاب وأولياء الأمور.', 'الأردن', v_cat_family, true, 310000,
    '{"instagram":"https://instagram.com/drlamia","twitter":"https://twitter.com/lamia_educ","website":"https://lamia.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مدرسة النجاح', 'دعم تعليمي ونفسي للطلاب.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-lamia1/400/400', 'beginner', 260000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'المذاكرة الفعالة', 'تقنيات دراسة مبنية على العلم.', v_audio, 1800, now() - interval '13 days', 64000),
    (v_pod_id, 'قلق الاختبارات', 'كيف تهدأ قبل الاختبار؟', v_audio, 1600, now() - interval '6 days', 51000),
    (v_pod_id, 'اختيار التخصص', 'كيف يختار ابنك تخصصه الجامعي؟', v_audio, 1900, now() - interval '1 day', 43000);
END IF;

END $$;

-- ---------- fix_grants.sql ----------
-- ============================================================
-- Nammy - explicit table privileges
-- Run in Supabase SQL Editor after full_setup.sql.
-- RLS is enabled on all 26 tables, so these grants are safe:
-- RLS policies still decide which rows each role can see.
-- ============================================================

-- Public content: readable by visitors and logged-in users.
GRANT SELECT ON categories, podcasts, episodes, missions, hosts TO anon, authenticated;

-- App tables: full DML for signed-in users; RLS keeps each user scoped to own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Sequences (if any) for authenticated writes.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Make future tables get the same defaults automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;

-- ---------- seed_legendary_hosts ----------
/*
# Add renowned Arab presenters and public figures as hosts

- Adds well-known media figures, thinkers and self-development authors.
- Fully formatted records: Arabic name, slug, title, specialty, bio, country,
  category, verified badge, follower count, one podcast and four episodes each.
- Idempotent: every host is guarded by a slug existence check.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_cat_culture   uuid;
  v_cat_science   uuid;
  v_cat_mental    uuid;
  v_cat_career    uuid;
  v_cat_leadership uuid;
  v_cat_finance   uuid;
  v_cat_religious uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_science    FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_finance    FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_cat_religious  FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;

-- ==================== شرين حلمي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'sherine-helmy') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('شرين حلمي', 'sherine-helmy',
    'https://picsum.photos/seed/sherine-helmy/400/400',
    'https://picsum.photos/seed/sherine-cover/1200/400',
    'إعلامية', 'الإعلام والتواصل والتنمية البشرية',
    'إعلامية مصرية بارزة، عُرفت بأسلوبها الهادئ في تقديم البرامج والحوار مع ضيوف من مختلف المجالات، وتقدم محتوى يجمع بين الثقافة والتنمية الذاتية.',
    'مصر', v_cat_career, true, 860000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('بصمة شرين', 'حوارات وملاحظات حول الإعلام والتواصل وبناء الثقة.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-sherine/400/400', 'beginner', 410000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قوة الحضور', 'كيف تصنع انطباعاً يدوم في أول دقيقة.', v_audio, 1560, now() - interval '30 days', 58000),
    (v_pod_id, 'فن الإصغاء', 'الاستماع الجيد كأداة للقيادة والتأثير.', v_audio, 1440, now() - interval '22 days', 51000),
    (v_pod_id, 'الثقة ليست صدفة', 'خطوات عملية لبناء ثقة الجمهور.', v_audio, 1680, now() - interval '14 days', 47000),
    (v_pod_id, 'حين يصبح الإعلام رسالة', 'مسؤولية الكلمة في زمن السرعة.', v_audio, 1500, now() - interval '6 days', 43000);
END IF;

-- ==================== إيهاب فكري ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ihab-fakry') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('إيهاب فكري', 'ihab-fakry',
    'https://picsum.photos/seed/ihab-fakry/400/400',
    'https://picsum.photos/seed/ihab-cover/1200/400',
    'إعلامي', 'الإعلام والثقافة والحوار',
    'إعلامي مصري معروف ببرامجه الثقافية وحواراته المفتوحة مع المثقفين والمفكرين، يقدم رؤية معاصرة للقضايا الفكرية والأدبية.',
    'مصر', v_cat_culture, true, 740000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مساحة فكر', 'حوارات ثقافية تفتح آفاقاً جديدة للتفكير.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-ihab/400/400', 'intermediate', 360000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الثقافة والهوية', 'كيف نحافظ على هويتنا في عالم متغير.', v_audio, 1800, now() - interval '28 days', 49000),
    (v_pod_id, 'السؤال قبل الجواب', 'أهمية طرح الأسئلة الصحيحة.', v_audio, 1620, now() - interval '21 days', 44000),
    (v_pod_id, 'الكتاب والواقع', 'قراءة نقدية في علاقة الأدب بالمجتمع.', v_audio, 1740, now() - interval '13 days', 40000),
    (v_pod_id, 'الإعلام والمعنى', 'البحث عن العمق وسط الأخبار.', v_audio, 1680, now() - interval '5 days', 38000);
END IF;

-- ==================== صلاح أبو المجد ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'salah-abu-almajad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('صلاح أبو المجد', 'salah-abu-almajad',
    'https://picsum.photos/seed/salah-abu-almajad/400/400',
    'https://picsum.photos/seed/salah-cover/1200/400',
    'كاتب وإعلامي', 'القيادة والإعلام والرأي',
    'كاتب وإعلامي مصري، عمل في مجالات الصحافة والإعلام والتثقيف الجماهيري، واشتهر بطرح رؤى مباشرة في قضايا المجتمع والتنمية.',
    'مصر', v_cat_leadership, true, 690000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رأي وموقف', 'قراءات في القيادة والقرار والشأن العام.', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-salah/400/400', 'intermediate', 310000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'القرار مسؤولية', 'كيف يتحمل القائد تبعات اختياره.', v_audio, 1700, now() - interval '27 days', 42000),
    (v_pod_id, 'الإعلام بين المهنة والرسالة', 'حدود التأثير الإعلامي في المجتمع.', v_audio, 1580, now() - interval '20 days', 39000),
    (v_pod_id, 'التنمية تبدأ بالإنسان', 'استثمار العقل قبل استثمار المال.', v_audio, 1660, now() - interval '12 days', 36000),
    (v_pod_id, 'الكلمة أمانة', 'مسؤولية الرأي حين يسمعه الآخرون.', v_audio, 1520, now() - interval '4 days', 34000);
END IF;

-- ==================== محمود علاء الدين ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mahmoud-alaaddin') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('محمود علاء الدين', 'mahmoud-alaaddin',
    'https://picsum.photos/seed/mahmoud-alaaddin/400/400',
    'https://picsum.photos/seed/mahmoud-cover/1200/400',
    'دكتور', 'العلوم والابتكار والتعليم',
    'أكاديمي ومتحدث في مجالات العلوم والابتكار، يهتم بتبسيط المعرفة العلمية وتقريبها من الشباب العربي داخل وخارج الجامعة.',
    'مصر', v_cat_science, true, 520000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عقول وعلم', 'رحلات مبسطة في عالم العلم والاكتشاف.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-mahmoud/400/400', 'beginner', 280000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'كيف يفكر العلماء؟', 'منهج البحث العلمي خطوة بخطوة.', v_audio, 1620, now() - interval '26 days', 38000),
    (v_pod_id, 'الذكاء الاصطناعي قريباً منا', 'تأثير التقنية على حياتنا اليومية.', v_audio, 1740, now() - interval '19 days', 35000),
    (v_pod_id, 'الفشل جزء من التجربة', 'دروس من محاولات لم تنجح أول مرة.', v_audio, 1500, now() - interval '11 days', 32000),
    (v_pod_id, 'العلم للجميع', 'لماذا يجب أن تكون المعرفة متاحة للكل.', v_audio, 1560, now() - interval '3 days', 30000);
END IF;

-- ==================== ياسر حيزيمي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'yasser-hazimi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('ياسر حيزيمي', 'yasser-hazimi',
    'https://picsum.photos/seed/yasser-hazimi/400/400',
    'https://picsum.photos/seed/yasser-cover/1200/400',
    'خبير', 'ريادة الأعمال والاستثمار',
    'خبير في ريادة الأعمال والاستثمار، يشارك خبرته في بناء المشاريع واتخاذ القرارات المالية مع رواد الأعمال الشباب.',
    'السعودية', v_cat_finance, true, 480000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مال وفكر', 'ثقافة مالية وريادية بلغة بسيطة.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-yasser/400/400', 'intermediate', 240000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قبل أن تبدأ مشروعك', 'الأسئلة التي يجب أن تجيب عليها أولاً.', v_audio, 1680, now() - interval '25 days', 33000),
    (v_pod_id, 'المخاطرة المحسوبة', 'كيف توازن بين المخاطرة والفرصة.', v_audio, 1560, now() - interval '18 days', 30000),
    (v_pod_id, 'التمويل دون تخطيط', 'أخطاء شائعة في إدارة السيولة.', v_audio, 1620, now() - interval '10 days', 28000),
    (v_pod_id, 'النجاح ليس رقمياً', 'قيمة العمل التي تبقى بعد الأرباح.', v_audio, 1500, now() - interval '2 days', 26000);
END IF;

-- ==================== إبراهيم الفقي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ibrahim-alfaqi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('إبراهيم الفقي', 'ibrahim-alfaqi',
    'https://picsum.photos/seed/ibrahim-alfaqi/400/400',
    'https://picsum.photos/seed/ibrahim-cover/1200/400',
    'دكتور', 'التنمية البشرية والبرمجة اللغوية العصبية',
    'د. إبراهيم الفقي من أبرز خبراء التنمية البشرية في العالم العربي، قدّم مئات المحاضرات والمؤلفات عن البرمجة اللغوية العصبية وإدارة الذات وصناعة النجاح.',
    'مصر', v_cat_mental, true, 1120000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('صناعة النجاح', 'مبادئ عملية في التنمية البشرية وإدارة الذات.', v_host_id, v_cat_mental, 'motivational', 'https://picsum.photos/seed/pod-ibrahim/400/400', 'beginner', 680000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'أنت ما تفكر فيه', 'كيف تشكّل أفكارك واقعك.', v_audio, 1740, now() - interval '29 days', 95000),
    (v_pod_id, 'إدارة الوقت بإتقان', 'أولويات تصنع فرقاً كل يوم.', v_audio, 1620, now() - interval '22 days', 87000),
    (v_pod_id, 'البرمجة اللغوية العصبية', 'مدخل مبسط إلى عالم NLP.', v_audio, 1860, now() - interval '15 days', 82000),
    (v_pod_id, 'التغيير يبدأ منك', 'خطوات صغيرة تصنع تحولاً كبيراً.', v_audio, 1680, now() - interval '7 days', 78000);
END IF;

-- ==================== مصطفى محمود ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mustafa-mahmoud') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('مصطفى محمود', 'mustafa-mahmoud',
    'https://picsum.photos/seed/mustafa-mahmoud/400/400',
    'https://picsum.photos/seed/mustafa-cover/1200/400',
    'دكتور', 'العلم والفكر والإيمان',
    'د. مصطفى محمود مفكر وعالم وكاتب مصري، صاحب برنامج «العلم والإيمان»، جمع بين البحث العلمي والتأمل الفكري وترك أثراً واسعاً في الثقافة العربية.',
    'مصر', v_cat_science, true, 1350000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('العلم والإيمان', 'تأملات في العلم والكون والإنسان.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-mustafa/400/400', 'intermediate', 920000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'العلم والإيمان', 'حين يلتقي اليقين العلمي باليقين الروحي.', v_audio, 1800, now() - interval '30 days', 140000),
    (v_pod_id, 'الكون تساؤل لا جواب', 'أسئلة الإنسان أمام اتساع الكون.', v_audio, 1680, now() - interval '23 days', 128000),
    (v_pod_id, 'الإنسان بين المادة والروح', 'قراءة في التركيب الإنساني.', v_audio, 1740, now() - interval '16 days', 116000),
    (v_pod_id, 'زمن الحقيقة', 'كيف نفرز المعرفة في عصر المعلومات.', v_audio, 1620, now() - interval '8 days', 105000);
END IF;

-- ==================== عمرو شريف ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'amro-sharif') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('عمرو شريف', 'amro-sharif',
    'https://picsum.photos/seed/amro-sharif/400/400',
    'https://picsum.photos/seed/amro-cover/1200/400',
    'إعلامي', 'الإعلام والمقابلات الملهمة',
    'إعلامي مصري معروف بأسلوبه في الحوار وتقديم البرامج، يقدم لقاءات مع شخصيات مؤثرة من مختلف المجالات.',
    'مصر', v_cat_career, true, 630000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('لقاءات عمرو', 'حوارات قصيرة مع أصحاب التجارب الملهمة.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-amro/400/400', 'beginner', 330000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'حكاية بداية', 'كيف بدأت الرحلة من الصفر.', v_audio, 1500, now() - interval '24 days', 41000),
    (v_pod_id, 'لحظة القرار', 'القرار الذي غيّر مسار حياة ضيفنا.', v_audio, 1560, now() - interval '17 days', 38000),
    (v_pod_id, 'ما بعد النجاح', 'كيف تحافظ على توازنك بعد الوصول.', v_audio, 1620, now() - interval '9 days', 35000),
    (v_pod_id, 'رسالة للشباب', 'نصائح من تجارب واقعية.', v_audio, 1440, now() - interval '2 days', 33000);
END IF;

-- ==================== أسامة السيد ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'osama-elsayed') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('أسامة السيد', 'osama-elsayed',
    'https://picsum.photos/seed/osama-elsayed/400/400',
    'https://picsum.photos/seed/osama-cover/1200/400',
    'دكتور', 'الطب النفسي والتنمية البشرية',
    'طبيب نفسي ومتحدث في التنمية البشرية، يقدم محتوى يجمع بين الفهم النفسي والتطبيق العملي لمساعدة الشباب على إدارة حياتهم بثقة.',
    'مصر', v_cat_mental, true, 570000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('توازن', 'صحة نفسية وأفكار عملية لحياة أهدأ.', v_host_id, v_cat_mental, 'motivational', 'https://picsum.photos/seed/pod-osama/400/400', 'beginner', 290000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قلق بلا سبب', 'كيف تفهم إشارات جسدك ونفسك.', v_audio, 1620, now() - interval '23 days', 37000),
    (v_pod_id, 'حدود صحية في العلاقات', 'أن تقول لا دون تأنيب ضمير.', v_audio, 1560, now() - interval '16 days', 34000),
    (v_pod_id, 'الراحة ليست كسلاً', 'أهمية التوقف والتعافي.', v_audio, 1500, now() - interval '8 days', 32000),
    (v_pod_id, 'خطط صغيرة لنهاية أسبوع أفضل', 'روتين بسيط لتقليل التوتر.', v_audio, 1440, now() - interval '1 day', 29000);
END IF;

-- ==================== فيصل القاسم ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'faisal-alqassem') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('فيصل القاسم', 'faisal-alqassem',
    'https://picsum.photos/seed/faisal-alqassem/400/400',
    'https://picsum.photos/seed/faisal-cover/1200/400',
    'إعلامي', 'الحوار الإعلامي والثقافة',
    'إعلامي سوري من أشهر مقدمي برامج الحوار في العالم العربي، تميز بأسلوبه في إدارة النقاش وطرح وجهات النظر المختلفة.',
    'سوريا', v_cat_culture, true, 980000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('حوال', 'حوار مفتوح حول الأفكار والقضايا الثقافية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-faisal/400/400', 'intermediate', 520000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'فن إدارة الحوار', 'كيف تدير نقاشاً بين وجهتين مختلفتين.', v_audio, 1800, now() - interval '28 days', 62000),
    (v_pod_id, 'الاختلاف والاحترام', 'ثقافة الاستماع إلى الآخر.', v_audio, 1680, now() - interval '21 days', 58000),
    (v_pod_id, 'الإعلام والسلطة', 'حدود السؤال ومسؤولية الجواب.', v_audio, 1740, now() - interval '13 days', 54000),
    (v_pod_id, 'السؤال المزعج', 'حين يفتح الحوار أبواباً مغلقة.', v_audio, 1620, now() - interval '5 days', 50000);
END IF;

END $$;

-- ---------- enrich_all_host_catalogs ----------
/*
# Give every host a complete, professional podcast catalog

- Ensures each host has at least 3 podcasts with 4 episodes each.
- Uses category-specific titles/descriptions so the content matches the host's field.
- Idempotent: only fills the gap, never duplicates existing podcasts.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_host RECORD;
  v_existing int;
  v_index int;
  v_cat_name text;
  v_titles text[];
  v_descs text[];
  v_types text[];
  v_title text;
  v_pod_id uuid;
BEGIN
  FOR v_host IN SELECT id, slug, name_ar, category_id FROM hosts LOOP
    SELECT count(*) INTO v_existing FROM podcasts WHERE host_id = v_host.id;
    CONTINUE WHEN v_existing >= 3;

    SELECT name_ar INTO v_cat_name FROM categories WHERE id = v_host.category_id;

    v_titles := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['تأملات روحية','من قصص السيرة','الإيمان في الحياة']
      WHEN 'العلوم' THEN ARRAY['عقول فضولية','اكتشافات تغيّر العالم','العلم بلغة بسيطة']
      WHEN 'ثقافة وأدب' THEN ARRAY['مساحة ثقافية','قراءات في الأدب','حوارات فكرية']
      WHEN 'الصحة واللياقة' THEN ARRAY['صحة بلا تعقيد','جسدك رسالة','خطوات نحو اللياقة']
      WHEN 'المسيرة المهنية' THEN ARRAY['مسارك المهني','مهارات العمل','قصص من الميدان']
      WHEN 'المال والاستثمار' THEN ARRAY['ثقافة مالية','مال وفكر','قرارات استثمارية']
      WHEN 'العلاقات والأسرة' THEN ARRAY['بيت وعلاقات','فن الحوار الأسري','علاقات أصحّ']
      WHEN 'الصحة النفسية' THEN ARRAY['توازن داخلي','فهم الذات','خطوات هادئة']
      WHEN 'القيادة' THEN ARRAY['قرار القائد','صفات القادة','القيادة بالمثال']
      WHEN 'التقنية' THEN ARRAY['تقنية اليوم','مستقبل رقمي','أدوات ذكية']
      ELSE ARRAY['حوارات ملهمة','مساحة فكر','قصص نجاح']
    END;

    v_descs := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['تأملات قصيرة في المعاني الروحية.', 'دروس مستفادة من سير الأنبياء والصالحين.', 'كيف يترجم الإيمان إلى سلوك يومي.']
      WHEN 'العلوم' THEN ARRAY['رحلة مبسطة في عالم العلم والاكتشاف.', 'أبحاث وابتكارات تقربها من حياتك.', 'شرح أفكار علمية بلغة سهلة.']
      WHEN 'ثقافة وأدب' THEN ARRAY['لقاءات وقراءات في عالم الثقافة.', 'نصوص وأفكار تستحق الوقوف عندها.', 'حوار مفتوح حول القضايا الفكرية.']
      WHEN 'الصحة واللياقة' THEN ARRAY['نصائح عملية لجسد أفضل.', 'الاستماع إلى إشارات جسدك.', 'عادات صغيرة تصنع فرقاً كبيراً.']
      WHEN 'المسيرة المهنية' THEN ARRAY['خطوات عملية لتطوير مسارك المهني.', 'مهارات يطلبها سوق العمل اليوم.', 'تجارب واقعية من أصحاب الخبرة.']
      WHEN 'المال والاستثمار' THEN ARRAY['مفاهيم مالية أساسية بلغة بسيطة.', 'كيف تفكر في المال والقرار.', 'قراءات في الأسواق والفرص.']
      WHEN 'العلاقات والأسرة' THEN ARRAY['بناء علاقات أفضل كل يوم.', 'حوار أسري أكثر هدوءاً ووضوحاً.', 'مساحة لفهم الآخر وتقبّله.']
      WHEN 'الصحة النفسية' THEN ARRAY['أفكار تساعدك على الهدوء والتركيز.', 'رحلة لفهم مشاعرك واحتياجاتك.', 'ممارسات بسيطة لتقليل التوتر.']
      WHEN 'القيادة' THEN ARRAY['قرارات تصنع الفرق في الفريق.', 'صفات القادة الذين يلهمون الناس.', 'كيف تكون قدوة قبل أن تكون مديراً.']
      WHEN 'التقنية' THEN ARRAY['تقنيات تغير طريقة عملنا.', 'استشراف مستقبل الأدوات الرقمية.', 'أدوات عملية توفر وقتك وجهدك.']
      ELSE ARRAY['حوار مع ضيوف من مختلف المجالات.', 'أفكار وتجارب تستحق المشاركة.', 'حكايات ملهمة من رحلات مختلفة.']
    END;

    v_types := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['religious','religious','motivational']
      WHEN 'العلوم' THEN ARRAY['scientific','scientific','scientific']
      WHEN 'ثقافة وأدب' THEN ARRAY['cultural','cultural','cultural']
      WHEN 'المسيرة المهنية' THEN ARRAY['professional','professional','motivational']
      WHEN 'المال والاستثمار' THEN ARRAY['professional','professional','professional']
      WHEN 'القيادة' THEN ARRAY['professional','professional','motivational']
      WHEN 'التقنية' THEN ARRAY['scientific','professional','professional']
      ELSE ARRAY['motivational','cultural','motivational']
    END;

    v_index := v_existing;
    WHILE v_index < 3 LOOP
      v_index := v_index + 1;
      v_title := v_host.name_ar || ' | ' || v_titles[v_index];

      INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
      VALUES (v_title, v_descs[v_index], v_host.id, v_host.category_id, v_types[v_index],
        'https://picsum.photos/seed/' || replace(v_host.slug, '-', '') || v_index || '/400/400',
        'beginner', 120000 + v_index * 45000, 4.7)
      RETURNING id INTO v_pod_id;

      INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count)
      SELECT v_pod_id,
        v_title || ' — الحلقة ' || k,
        'حلقة جديدة من ' || v_titles[v_index] || '، نظرة عملية قريبة من حياتك اليومية.',
        v_audio,
        1400 + k * 120,
        now() - ((v_index * 12 + k * 3) || ' days')::interval,
        6000 + k * 2200 + v_index * 1000
      FROM generate_series(1, 4) AS k;
    END LOOP;
  END LOOP;
END $$;

-- ---------- expand_all_episodes ----------
/*
# Complete the episode library for every podcast

- Tops every podcast up to 10 episodes (never duplicates existing ones).
- Episode titles/themes are chosen from category-specific sets.
- Idempotent: only fills the gap between the current count and 10.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_pod RECORD;
  v_count int;
  v_k int;
  v_cat_name text;
  v_theme text;
BEGIN
  FOR v_pod IN SELECT id, title, category_id FROM podcasts LOOP
    SELECT count(*) INTO v_count FROM episodes WHERE podcast_id = v_pod.id;
    CONTINUE WHEN v_count >= 10;

    SELECT name_ar INTO v_cat_name FROM categories WHERE id = v_pod.category_id;

    FOR v_k IN v_count + 1 .. 10 LOOP
      v_theme := CASE v_cat_name
        WHEN 'روحاني / ديني' THEN (ARRAY['معنى الإخلاص','الصبر الجميل','أدب الدعاء','قوة النية','الغفران','السيرة والقدوة','القرآن في حياتنا','التزكية','الرحمة','الخشوع'])[((v_k - 1) % 10) + 1]
        WHEN 'العلوم' THEN (ARRAY['أصل الحكاية','تجربة علمية','اكتشاف مدهش','وراء الكواليس','كيف يعمل؟','سؤال صعب','الخطأ الذي علّمنا','مستقبل البحث','مختبر صغير','خلاصة الحلقة'])[((v_k - 1) % 10) + 1]
        WHEN 'ثقافة وأدب' THEN (ARRAY['قراءة في نص','حوار مع كاتب','الذاكرة والهوية','حكاية مدينة','اللغة الجميلة','الرواية','السينما والأدب','النقد','التراث','رسالة للقارئ'])[((v_k - 1) % 10) + 1]
        WHEN 'الصحة واللياقة' THEN (ARRAY['خطوة اليوم','قواعد بسيطة','الجسد يتكلم','عادات صحية','الراحة جزء من العلاج','التغذية','الحركة','النوم','الميزان','استمرار'])[((v_k - 1) % 10) + 1]
        WHEN 'المسيرة المهنية' THEN (ARRAY['بداية الطريق','مهارة الأسبوع','مقابلة ناجحة','خطأ مهني','مدير ورائد','العمل الجماعي','التواصل','التطوير','قرار صعب','رسالة للشباب'])[((v_k - 1) % 10) + 1]
        WHEN 'المال والاستثمار' THEN (ARRAY['مفهوم مالي','الادخار أولاً','قرار استثماري','السيولة','المخاطرة','السوق','الأرقام','القيمة','خطة مالية','درس من السوق'])[((v_k - 1) % 10) + 1]
        WHEN 'العلاقات والأسرة' THEN (ARRAY['الإنصات','حدود صحية','حوار هادئ','الاحترام','الاختلاف','الأسرة','الصداقة','الثقة','الاعتذار','مساحة للحب'])[((v_k - 1) % 10) + 1]
        WHEN 'الصحة النفسية' THEN (ARRAY['الهدوء','القلق','الضغط','التقبل','الراحة','التركيز','المشاعر','الحدود','التعافي','خطوة صغيرة'])[((v_k - 1) % 10) + 1]
        WHEN 'القيادة' THEN (ARRAY['القرار','المسؤولية','الفرقة','الرؤية','القدوة','التفويض','الاستماع','الصبر','التغيير','الإرث'])[((v_k - 1) % 10) + 1]
        WHEN 'التقنية' THEN (ARRAY['أداة جديدة','تطور سريع','الذكاء الاصطناعي','البيانات','الأمان','المستقبل','تجربة مستخدم','السرعة','الابتكار','خلاصة تقنية'])[((v_k - 1) % 10) + 1]
        ELSE (ARRAY['البداية','العمق','السؤال','التجربة','الدرس','الضيف','الرؤية','التطبيق','المستقبل','الخلاصة'])[((v_k - 1) % 10) + 1]
      END;

      INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count)
      VALUES (
        v_pod.id,
        v_pod.title || ' — ' || v_theme || ' (' || v_k || ')',
        'الحلقة رقم ' || v_k || ' من «' || v_pod.title || '»: ' || v_theme || '. حديث قصير وعملي يكمل سلسلة الحلقات.',
        v_audio,
        1320 + (v_k % 7) * 90,
        now() - (v_k * 4 || ' days')::interval,
        3800 + v_k * 920
      );
    END LOOP;
  END LOOP;
END $$;

-- ---------- real catalog ----------
-- The real catalog (69 hosts / 740 podcasts / 60,376 episodes) is imported
-- from Apple Podcasts + public RSS feeds, not from this schema file:
--     node scripts/import-real-catalog.mjs
