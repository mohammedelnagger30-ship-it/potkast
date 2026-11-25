/*
  م. باسل محمد مؤنس (رحمه الله) — real presenter profile only.

  Source checks (2026-11-25):
  - His own Telegram channel: https://t.me/ttbasil
    ("تلاوات ودروس باسل مؤنس", 39,280 subscribers).
  - إنه القرآن independently republishes his named lessons:
    https://t.me/itsthequraan
  - 41 distinct talks and 70 surahs come from public Internet Archive items
    whose file names include his name. Every MP3 enclosure returned HTTP 200/206
    on a byte-range check. Exact duplicate uploads were omitted.

  The lessons/recitations stay client-side curated rows. This migration only
  adds the presenter so follows and the hosts list can resolve him; no podcast
  or episode is duplicated and no existing host is relabelled.
*/

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
  'd8a9c4f2-7b61-4e30-a95c-6f2e1b7d408a',
  'م. باسل مؤنس',
  'basel-mounes',
  'https://cdn4.telesco.pe/file/CI5VTOPv585fu6hP3s0YCUe3v1gz0FVkejvpy2qkWWCAPg03TJUuWwLnOhVKBvNEuE0EzmEr6VW4iU68BitZ4gW4hYtnfxOolgrgggaFPL8CbfoPHBqJ1UTQ0AH3r2dSShY_-U_vWU3bxk_dq1FOBf6_vfrdjOGuU4pnjqOczkpuQ_LNuBoazWOpSVmilU-_bfTg6WOj0cz5qUnQj1AxlxkO8509vHwVXWrVuy7YWFU4LKKvgmcbi7wuSaMy2JfKcEq2k3IFWGCH3QjoOl0gHwnlKNLiCbkoPgt6oGcW4xh0a5mwVk2IHFJWgE5LoVt8U_zsrUQyQzQTnr0fsrwVVA.jpg',
  'https://archive.org/services/img/basil-mounes',
  'قارئ ومحاضر',
  'التدبر والتلاوة — رحمه الله',
  'م. باسل محمد مؤنس (رحمه الله)، قارئ ومحاضر مصري عُرف بتلاوته الخاشعة ومجالسه في تدبر القرآن. تلاواته ودروسه منشورة في قناته «تلاوات ودروس باسل مؤنس»، وتنشر قناة «إنه القرآن» الرسمية محاضراته باسمه. كل ما هنا من ملفات صوت عامة موثّقة، والدروس والتلاوات معروضة منفصلة.',
  'مصر',
  'b6393bd3-deea-403f-88af-f7ae0b34736c',
  true,
  39280,
  '{
    "telegram": "https://t.me/ttbasil",
    "quran": "https://archive.org/details/basil-mounes"
  }'::jsonb,
  '2026-11-25T00:00:00.000Z'
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  photo_url = EXCLUDED.photo_url,
  cover_url = EXCLUDED.cover_url,
  title_ar = EXCLUDED.title_ar,
  specialty_ar = EXCLUDED.specialty_ar,
  bio_ar = EXCLUDED.bio_ar,
  country = EXCLUDED.country,
  category_id = EXCLUDED.category_id,
  is_verified = true,
  followers_count = EXCLUDED.followers_count,
  social_links = EXCLUDED.social_links;
