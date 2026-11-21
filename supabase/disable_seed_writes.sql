-- ============================================================
-- Nammy — remove the temporary import access
-- ============================================================
-- Run this after the real catalog has been imported.
-- The app keeps working: it only needs SELECT on content tables.
-- ============================================================

DROP POLICY IF EXISTS "seed_write_hosts" ON public.hosts;
DROP POLICY IF EXISTS "seed_write_podcasts" ON public.podcasts;
DROP POLICY IF EXISTS "seed_write_episodes" ON public.episodes;

REVOKE INSERT, UPDATE, DELETE ON public.hosts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.podcasts FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.episodes FROM anon;

SELECT 'seed writes disabled' AS status;
