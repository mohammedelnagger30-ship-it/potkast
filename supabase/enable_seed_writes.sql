-- ============================================================
-- Nammy — temporary write access for the one-time real-data import
-- ============================================================
-- The app only ever needs READ access to content tables. This file
-- temporarily lets the import script (running with the public key)
-- write the real catalog, so you do not have to paste megabytes of
-- SQL into the SQL Editor.
--
-- Run this ONCE, then tell me "done" and I will run the importer.
-- When the import is finished, run `disable_seed_writes.sql` to
-- remove this access again.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hosts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.podcasts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.episodes TO anon;

DROP POLICY IF EXISTS "seed_write_hosts" ON public.hosts;
CREATE POLICY "seed_write_hosts" ON public.hosts
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "seed_write_podcasts" ON public.podcasts;
CREATE POLICY "seed_write_podcasts" ON public.podcasts
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "seed_write_episodes" ON public.episodes;
CREATE POLICY "seed_write_episodes" ON public.episodes
  FOR ALL TO anon USING (true) WITH CHECK (true);

SELECT 'seed writes enabled' AS status;
