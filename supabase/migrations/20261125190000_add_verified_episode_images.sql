-- صور حلقات موثّقة من الـ RSS الرسمي لكل حلقة (تختلف من حلقة لأخرى).
-- آمن إعادة تشغيله: يضيف العمود لو مش موجود، ويملّي الصور الفارغة بس.

ALTER TABLE public.episodes ADD COLUMN IF NOT EXISTS image_url text;

-- Per-episode artwork for El Maher Mindset - الماهر مايندست.
-- Source: verified public RSS feed https://media.rss.com/el-maher-mindset/feed.xml (itunes:image on each episode).
-- Safe to re-run: only fills empty/null image_url.
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20260104_120122_697095ce4412b5b8343667cc5e2d2a64.png' WHERE id = '84ab70c9-7a29-4422-8b0b-37721adc439a' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20251217_101254_3a56311b6c3bbff53bb4ba466ec2214f.png' WHERE id = '7352596d-e537-4c51-ac21-a77bcf921daf' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20251217_101219_6fa87e1a6e63ccef7b62803726f851eb.png' WHERE id = '874f3a52-0d2b-415b-83f7-3bed730afc69' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20251215_031245_4b3af481427d341505849402aa93fa36.png' WHERE id = 'bf3c9d9a-5f42-4f12-af98-41603fe3c473' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_010911_8d659a9ae7d072a36445f349667e0b80.jpg' WHERE id = '71596839-3b17-4332-9314-fe1255d08f3e' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_010917_a5b137b729645abc49edde98cc2fd950.jpg' WHERE id = 'a069fef3-d6eb-4b9b-bfd2-76ee33e7a784' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_010957_1955668afae9197b7582dd42570b5108.jpg' WHERE id = 'da0ce1de-bdee-4046-b867-1deeccc3108e' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_120940_3063f82c3afd13203531a7dfac8bc010.jpg' WHERE id = '20dc6441-e8e3-4190-a105-8b6669bb83fa' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_120930_60bf8d049c6925b358ec887346765e4a.jpg' WHERE id = 'c5427be5-e146-4e17-936d-c8e3180db4f6' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_120939_2fc772fa29653a32815fc9ebba1d145b.jpg' WHERE id = '3c6413dd-caeb-4f51-8d11-7921ea9ee422' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250908_120901_fff5837ae0590c4c7be7826b07e09819.jpg' WHERE id = '8e4faec2-efbc-4c6e-a2e3-c677420adcc2' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://media.rss.com/el-maher-mindset/ep_cover_20250901_010908_6ca1080352b43e316efb2173b18d08cd.jpg' WHERE id = '875659a4-6ab9-4091-b4a2-412704a2c279' AND (image_url IS NULL OR image_url = '');

-- Per-episode artwork for لسن.
-- Source: verified public RSS feed https://anchor.fm/s/4b64e74/podcast/rss (itunes:image on each episode).
-- Safe to re-run: only fills empty/null image_url.
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/690565/690565-1717328918956-fce3f4f581fcf.jpg' WHERE id = 'f00b0a36-4c63-4fe7-a346-7db8801664dc' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_episode/690565/690565-1688582119267-a1b20523fa09b.jpg' WHERE id = '237a4530-9fd8-4902-b6f3-7bd3416201c3' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1670536530382-7a9c10bcb9b6.jpg' WHERE id = '56070c5f-104f-4835-85e1-bb22884dcfb5' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1667081621957-b6c6eeca0b8f5.jpg' WHERE id = 'fdd67ad9-cb6e-4d69-9ba9-f27435ac20c5' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1665002386912-6b28b90829387.jpg' WHERE id = 'e7d2a7f1-2a55-4d1c-9cfa-d23caeedd7ba' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1661803783307-ae9d8a4ad78a8.jpg' WHERE id = '771baaa8-0ce0-4112-b7ef-c8e5ff78a72e' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1658930454782-13be508f89dd8.jpg' WHERE id = 'd32402d7-0c46-41d5-9bdb-5eef68a5286d' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1656595604442-b55bcd6291f57.jpg' WHERE id = '29b0cb11-cbb6-464f-b246-9a5cb24cf5cf' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1653315131267-dcd0fd4e481e2.jpg' WHERE id = '05f88bdb-482f-4155-a01a-affdaeab4082' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode400/690565/690565-1650844488597-bff94e7ccc7b8.jpg' WHERE id = 'c9f9cc7b-b662-451c-b78c-4ada07e7f519' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode/690565/690565-1648666293486-66b02fd370c69.jpg' WHERE id = 'c8ad0df0-6a07-4a0f-8932-12055aec2294' AND (image_url IS NULL OR image_url = '');
UPDATE public.episodes SET image_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_episode400/690565/690565-1646048031200-2feda63fc1acb.jpg' WHERE id = 'd38c60ed-cf3b-44b4-92fe-c87fe57b5908' AND (image_url IS NULL OR image_url = '');
