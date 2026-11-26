-- Add د. هشام عصمت as a verified presenter profile only.
--
-- Verified 2026-11-26:
-- - official channel: https://www.youtube.com/@DrHeshamEsmat
-- - public video index: https://www.drheshamesmat.com/ (fan-made index which
--   embeds the original YouTube videos; not an official account)
-- - avatar and channel banner load directly from yt3.googleusercontent.com.
--
-- No stable unsigned MP3/RSS feed was found for his lessons, so there are
-- deliberately NO podcasts or episode rows here. The verified YouTube videos
-- live client-side in src/lib/heshamEsmatVideos.ts and use YouTube's official
-- iframe player. They are never counted as Sada episodes or listening time.

INSERT INTO public.hosts (
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
  'c9a2e77b-1d4a-4d2f-9a5e-7b0c4f26a1d3'::uuid,
  'هشام عصمت',
  'hesham-esmat',
  'https://yt3.googleusercontent.com/bwOY3aQgbFXSMijSQxAzB0vln0epNT1WU28gxOe0bgBvJYfmN4XzekVF9zrbKS42rbbXsAjug90=s900-c-k-c0x00ffffff-no-rj',
  'https://yt3.googleusercontent.com/N2ravDpn6yKliYdWdjLxMROvPUYlvovakoWbq2PyKA6S6k9wSqTnwDphugt0-pAyykvNexARvWo=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj',
  'الدكتور',
  'طبيب ومحاضر العلوم الطبية الأساسية',
  'طبيب ومحاضر مصري يشرح الكيمياء الحيوية والأحياء الدقيقة لطلاب كليات الطب، ويقدّم حلقات في السيرة النبوية ومقاطع توعوية قصيرة. محاضراته ولقاءاته المتاحة بصوته على يوتيوب؛ لا توجد ملفات صوت ثابتة منشورة باسمه يمكن تشغيلها هنا، لذلك لا تُضاف كحلقات صوت في سدى.',
  'مصر',
  (SELECT id FROM public.categories WHERE name_ar = 'العلوم' ORDER BY created_at LIMIT 1),
  true,
  38600,
  '{"youtube":"https://www.youtube.com/@DrHeshamEsmat"}'::jsonb,
  '2026-11-26T00:00:00.000Z'::timestamptz
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
