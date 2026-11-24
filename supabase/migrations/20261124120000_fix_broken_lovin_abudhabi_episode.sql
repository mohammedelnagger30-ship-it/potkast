/*
  Fix broken audited episode (Podeo media URL returns 404).
  Confirmed by deep audio audit retry: audio unavailable, not a music-only placeholder.
  Safe cleanup: remove the single broken episode row.
*/

BEGIN;

DELETE FROM episodes
WHERE id = 'be6608d6-5dd7-4e7a-b059-4b3a80f7ece6'
  AND audio_url = 'https://media.podeo.co/episodes/ODIzNTM/audio.mp3';

COMMIT;
