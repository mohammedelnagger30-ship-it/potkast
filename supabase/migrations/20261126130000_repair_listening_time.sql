-- Repair listening time inflated by the old client-side stats update.
--
-- The player used to send the ABSOLUTE playback position to
-- updateStatsOnListen() on every 5-second autosave, so a 7-minute episode
-- added 7 minutes to user_stats again and again. listening_history already
-- stores one row per episode with the furthest progress reached, so it is the
-- reliable source for rebuilding both totals and per-category minutes.
--
-- Run this in Supabase SQL Editor (direct writes from the app are blocked).

UPDATE public.user_stats s
SET total_listening_seconds = COALESCE(h.total, 0),
    updated_at = now()
FROM (
  SELECT user_id,
         SUM(GREATEST(COALESCE(progress_seconds, 0), 0))::int AS total
  FROM public.listening_history
  GROUP BY user_id
) h
WHERE s.user_id = h.user_id;

-- Users without history had inflated values from the same bug.
UPDATE public.user_stats
SET total_listening_seconds = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1
  FROM public.listening_history lh
  WHERE lh.user_id = user_stats.user_id
);

WITH per_category AS (
  SELECT lh.user_id,
         p.category_id,
         FLOOR(SUM(GREATEST(COALESCE(lh.progress_seconds, 0), 0)) / 60.0)::int AS minutes
  FROM public.listening_history lh
  JOIN public.episodes e ON e.id = lh.episode_id
  JOIN public.podcasts p ON p.id = e.podcast_id
  WHERE p.category_id IS NOT NULL
  GROUP BY lh.user_id, p.category_id
)
UPDATE public.category_progress cp
SET minutes_listened = pc.minutes,
    updated_at = now()
FROM per_category pc
WHERE cp.user_id = pc.user_id
  AND cp.category_id = pc.category_id;

WITH per_category AS (
  SELECT lh.user_id,
         p.category_id,
         FLOOR(SUM(GREATEST(COALESCE(lh.progress_seconds, 0), 0)) / 60.0)::int AS minutes
  FROM public.listening_history lh
  JOIN public.episodes e ON e.id = lh.episode_id
  JOIN public.podcasts p ON p.id = e.podcast_id
  WHERE p.category_id IS NOT NULL
  GROUP BY lh.user_id, p.category_id
)
UPDATE public.category_progress cp
SET minutes_listened = 0,
    updated_at = now()
WHERE NOT EXISTS (
  SELECT 1
  FROM per_category pc
  WHERE pc.user_id = cp.user_id
    AND pc.category_id = cp.category_id
);
