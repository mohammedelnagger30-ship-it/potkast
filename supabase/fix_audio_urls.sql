-- Fix dead audio links in the existing database.
-- The old placeholder file returned HTTP 403, so no episode could play.
-- Safe to run more than once.

UPDATE episodes
SET audio_url = 'https://anchor.fm/s/108148058/podcast/play/128488111/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2026-9-31%2F435503294-44100-2-3c4b0a03fca9c.mp3'
WHERE audio_url LIKE '%storage.googleapis.com/media-session/elephants-dream%';

SELECT count(*) AS remaining_broken_audio_links
FROM episodes
WHERE audio_url LIKE '%storage.googleapis.com/media-session/elephants-dream%';