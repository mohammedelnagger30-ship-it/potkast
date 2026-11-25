/*
  د. أحمد العربي — real presenter profile + verified episode credits.

  Source checks:
  - Official Telegram channel: https://t.me/Ahmed_Elaraby
    ("هذه القناة الرسمية الوحيدة للدكتور أحمد العربي", 179K subscribers).
  - Every credited episode below is an existing Sada episode whose title names
    him, and its public audio enclosure returned HTTP 200 on 2026-11-25.

  IMPORTANT: This does NOT change podcasts.host_id. فاهم remains hosted by
  هلال السيد and بدون ورق remains hosted by فيصل العقل. The credit rows only
  gather Ahmed's verified series/guest appearances under his own presenter page.
*/

-- 1. The presenter row. Fixed UUID makes the migration idempotent.
INSERT INTO hosts (
  id,
  name_ar,
  slug,
  photo_url,
  cover_url,
  title_ar,
  specialty_ar,
  bio_ar,
  country,
  category_id,
  is_verified,
  followers_count,
  social_links,
  created_at
)
VALUES (
  'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11',
  'د. أحمد العربي',
  'ahmed-arabi',
  'https://cdn4.telesco.pe/file/L3Ah5Pcj6ubfigYzV8UHI5uiCnsGbNdD6ubUtSI3rA_JjBDFM8X1F6TID7lwJ6zVub_4t5KDNPtNu4y3F21mVWXmSsbeod9ptBeaPZpEAZtdwd530aqnb0B8j-hmMZdsfRqNtEwQqpEdmekDY3NxlZEHyMz53HpZ4FSu90D7U4ufxgN1-pp7O9kNLo-0ItgXk6HgM3rRfOW0_rAsrB7pkAoXgla6EZ23k468yPPh-ylFhlUoM5PdNiogd5S6kHVS9ASOrsh7F1jevKeLFZf9dL94RzCUk8dZhHBrTuvfRc3ZTCbUwo4lln-Ga1Me7rado3At2OxmaxG-1RfWZBoEAA.jpg',
  'https://cdn4.telesco.pe/file/qeiNSs1bDpDs3kCiKhyTbMXcfzHQ2W5veLQsWog4lnG96XPRwzKnXnOPx2CijFu7-wfsw_Rk0mwPeKVHk_WMIp742lNZ059ArhoWO6p0OjIvHt-xiX0yirvFMd8XIUXST8VfTnNW3w0du2KVhUtnDeKXeR_JKo3iGPIvwrBZ6oKn1KOC6BHe8hQHLcUkimda0hJwe6MOnViFwRneqYg5vajjSsjmeFX_o3W8zQjJM3gzRW_QU4b6UADLkbw7gCjko2NNuiD_hUzhykQ0NqLbHJ2q2Jg-7IYyrad5ysSfc_oE-n5XJR0iTt5_YwlmiWiVml6BqYuq7SmtI-0zPIE6Dg.jpg',
  '',
  'داعية ومحاضر — العبادات والتزكية',
  'داعية ومحاضر، حاصل على الماجستير في الفقه الإسلامي. يقدّم سلسلة «تذوق العبادات» و«رحلة الخلود» مع بودكاست فاهم، إلى جانب لقاءات ومحاضرات عن القلب السليم والتزكية. قناته الرسمية الوحيدة: t.me/Ahmed_Elaraby.',
  'مصر',
  'b6393bd3-deea-403f-88af-f7ae0b34736c',
  true,
  179000,
  '{
    "telegram": "https://t.me/Ahmed_Elaraby",
    "youtube": "https://youtube.com/@Drahmedelarabyofficial",
    "instagram": "https://instagram.com/drahmedelarabyofficial",
    "facebook": "https://facebook.com/drahmedelarabyofficial/"
  }'::jsonb,
  '2026-11-25T00:00:00.000Z'
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  photo_url = EXCLUDED.photo_url,
  cover_url = EXCLUDED.cover_url,
  specialty_ar = EXCLUDED.specialty_ar,
  bio_ar = EXCLUDED.bio_ar,
  country = EXCLUDED.country,
  category_id = EXCLUDED.category_id,
  is_verified = true,
  followers_count = EXCLUDED.followers_count,
  social_links = EXCLUDED.social_links;

-- 2. Guest/presenter credits. No episode or podcast row is duplicated.
CREATE TABLE IF NOT EXISTS episode_credits (
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES hosts(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'presenter' CHECK (role IN ('presenter', 'guest', 'host')),
  source_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (episode_id, host_id, role)
);

ALTER TABLE episode_credits ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON episode_credits TO anon, authenticated;

DROP POLICY IF EXISTS "read_episode_credits" ON episode_credits;
CREATE POLICY "read_episode_credits"
ON episode_credits FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX IF NOT EXISTS idx_episode_credits_host ON episode_credits(host_id, role);

-- 3. Eight verified appearances. Series episodes are "presenter"; the two
--    standalone interviews are "guest" so they stay visibly separate.
INSERT INTO episode_credits (episode_id, host_id, role, source_url) VALUES
  ('28a8a724-aa5a-4180-a003-8d30046340c5', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('c3294549-1e07-4f59-b0a9-c68a683ed90c', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('ddf5a224-80b0-4875-ae8e-62ac3c5029f8', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('59b22732-50fe-4cbe-ab6e-835e95fb81de', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('95516406-ec25-47c1-bbed-a3420576ee95', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('00c31a96-ae9b-4c48-a0c6-4dbcf200f3bf', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'presenter', 'https://t.me/Ahmed_Elaraby'),
  ('0de87e72-d7af-46c6-8698-1399b62544aa', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'guest', 'https://t.me/Ahmed_Elaraby'),
  ('d8c4ee4f-aeec-470c-b822-78344b9ee228', 'b1e57f4c-6d2a-4d0b-8a6f-3f6d0f0a5c11', 'guest', 'https://t.me/Ahmed_Elaraby')
ON CONFLICT (episode_id, host_id, role) DO NOTHING;
