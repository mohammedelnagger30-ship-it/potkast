-- ============================================================
-- ⚠️  This file is retired (kept only so nothing breaks).
-- ============================================================
-- The real catalog is no longer seeded with a big SQL file.
-- It is imported from Apple Podcasts + public RSS feeds by:
--
--     node scripts/import-real-catalog.mjs
--
-- That script writes 69 real hosts / 740 podcasts / 60,376 real
-- episodes (real titles, descriptions, dates and audio files).
--
-- Running this file does nothing on purpose: the old 900 KB version
-- contained a different, smaller catalog and would overwrite the
-- real data with it.
-- ============================================================

SELECT 'real_podcasts.sql is retired — use scripts/import-real-catalog.mjs' AS note;
