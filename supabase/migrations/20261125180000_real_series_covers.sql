-- Replace portraits reused as series artwork with the real cover of each show.
-- Idempotent: safe to run more than once.

BEGIN;

-- د. أحمد عبد المنعم — artwork of the playlists linked from the imported feeds.
UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/PCvkBlD_wvs/maxresdefault.jpg'
WHERE id = '0fec59ca-1f6e-52a8-af96-bab6c7c57bce'; -- تربويات

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/FD2pnGsMEcY/maxresdefault.jpg'
WHERE id = 'b22031ab-10ac-5f81-9f92-ff1f8cd0035f'; -- عن القرآن

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/U_BAOVorAnQ/maxresdefault.jpg'
WHERE id = '07d7b7ba-b3a0-5d81-b4db-7ea06b6352ad'; -- هدى للناس

-- عبد الرحمن منصور — artwork of the matching series/episodes.
UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/TyaO8XGQp5g/sddefault.jpg'
WHERE id = '6d2b4b52-fa59-5699-bc59-2e16a7fd08a0'; -- الناس والسحر

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/7jTyTU04R5o/mqdefault.jpg'
WHERE id = 'c1dcf32b-2e15-5713-926d-cb0fb7e9a09e'; -- للبيوت أسرار

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/uyKVwqs3iIY/maxresdefault.jpg'
WHERE id = '053d2ac3-bb78-5607-afde-e4342aca6cc4'; -- قصة التأهيل

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/RkHvi2E8NnE/sddefault.jpg'
WHERE id = '87bc3a87-dbaa-5311-ac97-ba2f0c9f6b23'; -- أضلني صاحبي

UPDATE public.podcasts
SET cover_url = 'https://i.ytimg.com/vi/BE5-FL-t1R8/maxresdefault.jpg'
WHERE id = '97e440b7-bef7-597c-a67c-40dbfa6ef98a'; -- محاضرات متنوعة

-- Where a feed supplied real episode artwork, use the earliest one as the cover.
UPDATE public.podcasts p
SET cover_url = (
  SELECT e.image_url
  FROM public.episodes e
  WHERE e.podcast_id = p.id
    AND e.image_url IS NOT NULL
    AND btrim(e.image_url) <> ''
  ORDER BY e.published_at ASC NULLS LAST
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.episodes e
  WHERE e.podcast_id = p.id
    AND e.image_url IS NOT NULL
    AND btrim(e.image_url) <> ''
);

COMMIT;
