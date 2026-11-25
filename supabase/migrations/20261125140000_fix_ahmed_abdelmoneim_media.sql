/*
  Fix Ahmed Abdel Moneim media issues.
  - Replace broken SoundCloud avatar (404) with verified working avatar.
  - Upgrade http://archive.org audio URLs to https://archive.org to avoid mixed-content blocking.
    Scoped to Ahmed Abdel Moneim podcasts first, then applies safe global archive.org upgrade.
  Idempotent.
*/

BEGIN;

-- Fix host photo (broken 404 URL observed in live DB)
UPDATE hosts
SET photo_url = 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
WHERE id = '05e7036b-03df-54a2-9223-166bffd1fe16'::uuid
  AND (
    photo_url IS DISTINCT FROM 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
  );

-- Safety: also fix by slug/name if id differs
UPDATE hosts
SET photo_url = 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
WHERE slug = 'ahmed-abdelmoneim'
  AND name_ar = 'د. أحمد عبد المنعم'
  AND photo_url IS DISTINCT FROM 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg';

-- Upgrade archive.org audio URLs for Ahmed Abdel Moneim episodes
UPDATE episodes e
SET audio_url = replace(e.audio_url, 'http://archive.org/', 'https://archive.org/')
FROM podcasts p
WHERE e.podcast_id = p.id
  AND p.host_name = 'د. أحمد عبد المنعم'
  AND e.audio_url LIKE 'http://archive.org/%';

-- Global safe fix: archive.org supports https; http can be blocked as mixed content in webviews/browsers
UPDATE episodes
SET audio_url = replace(audio_url, 'http://archive.org/', 'https://archive.org/')
WHERE audio_url LIKE 'http://archive.org/%';

COMMIT;
