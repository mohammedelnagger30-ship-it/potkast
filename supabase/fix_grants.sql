-- ============================================================
-- Nammy - explicit table privileges
-- Run in Supabase SQL Editor after full_setup.sql.
-- RLS is enabled on all 26 tables, so these grants are safe:
-- RLS policies still decide which rows each role can see.
-- ============================================================

-- Public content: readable by visitors and logged-in users.
GRANT SELECT ON categories, podcasts, episodes, missions, hosts TO anon, authenticated;

-- App tables: full DML for signed-in users; RLS keeps each user scoped to own rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Sequences (if any) for authenticated writes.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Make future tables get the same defaults automatically.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
