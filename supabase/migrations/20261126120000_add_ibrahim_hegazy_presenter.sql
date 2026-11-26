/*
  المهندس إبراهيم حجازي (Zigoo0) — presenter profile only.

  Source checks (2026-11-26):
  - Official YouTube channel: https://www.youtube.com/@Zigoo0
    Bio: "Ebrahim Hegazy (Zigoo0) is an Egyptian information security expert".
  - X: https://x.com/Zigoo0 (34.8K followers); company: https://darkentry.net/
  - Five real, full-length interviews name him in the title/show notes and have
    public non-expiring MP3 enclosures (all returned HTTP 206 on a byte-range
    check): PodCAT S03 E01, two Droos Podcast episodes, and two
    سكيوريتي بالعربي episodes.

  The interviews stay in their original shows and are curated client-side in
  src/lib/ebrahimHegazy.ts. This migration adds ONLY the presenter row so
  follows and the hosts list can resolve him. No podcast, episode, fake
  artwork, or repeated audio URL is inserted. He is not a Quran reciter.
*/

-- Never leave the disabled fake seed behind if an older migration was applied.
DELETE FROM hosts
WHERE slug = 'ibrahim-hegazy'
  AND (photo_url LIKE '%unsplash%' OR photo_url LIKE '%picsum%');

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
SELECT
  '2f0d4a78-3c91-4b6e-9a17-5d8c2e4b7f13',
  'إبراهيم حجازي',
  'ibrahim-hegazy',
  'https://yt3.googleusercontent.com/ytc/AIdro_na2IVjWCbShQCWauJvq2BlaEN-hj2wSTiN_FwsxUdomuE=s900-c-k-c0x00ffffff-no-rj',
  'https://yt3.googleusercontent.com/ytc/AIdro_na2IVjWCbShQCWauJvq2BlaEN-hj2wSTiN_FwsxUdomuE=s900-c-k-c0x00ffffff-no-rj',
  'المهندس',
  'خبير الأمن السيبراني — Zigoo0',
  'خبير أمن معلومات مصري (Zigoo0)، مؤسس مشارك ومدير تقني في DarkEntry، وعالم ثغرات يعمل في مجال حماية المعلومات منذ ٢٠١٣. لقاءاته هنا من برامج أخرى ظهر فيها كضيف، وليست حلقات يقدّمها.',
  'مصر',
  'efbf528a-6b44-4878-a023-f0e1e40300c0',
  true,
  34800,
  '{"youtube":"https://www.youtube.com/@Zigoo0","twitter":"https://x.com/Zigoo0","linkedin":"https://www.linkedin.com/in/ebrahimhegazy/","website":"https://darkentry.net/"}'::jsonb,
  '2026-11-26T00:00:00.000Z'
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ibrahim-hegazy');
