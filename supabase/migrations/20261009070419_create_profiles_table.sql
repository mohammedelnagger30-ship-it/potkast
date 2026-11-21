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
