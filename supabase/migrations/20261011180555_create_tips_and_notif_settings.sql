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
