-- Fix Abdulrahman Mansour presenter/profile/podcast images.
-- Idempotent. Run in Supabase SQL Editor.

BEGIN;

DO $$
DECLARE
  v_host_id uuid := 'aba0b879-52a6-585e-9f37-d15d8d266b87'::uuid;
  v_photo text := 'https://graph.facebook.com/dr.abdelrahmenmansour/picture?width=720&height=720';
  v_cover text := 'https://graph.facebook.com/dr.abdelrahmenmansour/picture?width=1200&height=630';
BEGIN
  UPDATE hosts
  SET photo_url = v_photo,
      cover_url = v_cover
  WHERE id = v_host_id OR slug = 'abdulrahman-mansour';

  -- Replace generic Islamweb logo on all his podcasts/episodes-related podcast covers
  UPDATE podcasts
  SET cover_url = v_photo
  WHERE host_id = v_host_id
     OR (host_name = 'عبد الرحمن منصور' AND cover_url = 'https://audio.islamweb.net/media/contentver3/img/logo.png');
END $$;

COMMIT;