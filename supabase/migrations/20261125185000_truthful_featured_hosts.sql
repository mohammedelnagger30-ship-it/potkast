-- Replace invented seed follower counts, stock photos and mismatched slugs
-- with publicly verifiable presenters. Idempotent: safe to run more than once.
--
-- Sources are listed in src/lib/featuredHosts.ts and shown as card tooltips.

BEGIN;

-- أحمد الشقيري — official pages: Instagram 17M, Facebook 20.7M, X 18.2M.
UPDATE public.hosts
SET followers_count = 20711341,
    photo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shugairi_2010.jpg',
    social_links = jsonb_build_object(
      'instagram', 'https://www.instagram.com/ahmadalshugairi/',
      'twitter', 'https://x.com/shugairi',
      'facebook', 'https://www.facebook.com/AhmadAlShugairi/'
    )
WHERE id = '369332a2-0ca9-4ec2-9544-600140e7e4eb';

-- ياسر الحزيمي — official Instagram @ybh.100 (5M).
UPDATE public.hosts
SET followers_count = 5000000,
    photo_url = 'https://unavatar.io/x/ybh_100',
    social_links = jsonb_build_object(
      'instagram', 'https://www.instagram.com/ybh.100/',
      'twitter', 'https://x.com/ybh_100'
    )
WHERE id = '75474ef0-7037-4424-b0c2-23c22d94dda9';

-- بدر صالح — YouTube 2.6M + X 1.8M + Instagram 1M.
UPDATE public.hosts
SET followers_count = 4400000,
    photo_url = 'https://upload.wikimedia.org/wikipedia/commons/6/65/Bader_Saleh_Profile_Picture.jpg',
    social_links = jsonb_build_object(
      'youtube', 'https://www.youtube.com/@BaderSaleh',
      'instagram', 'https://www.instagram.com/bidzsaleh/',
      'twitter', 'https://x.com/bidzsaleh'
    )
WHERE id = '1bf0a7b9-59d7-4b11-99ff-287bcbcee621';

-- مشهور الدبيان — verified X account and «سوالف بزنس».
UPDATE public.hosts
SET followers_count = 1900000,
    photo_url = 'https://unavatar.io/x/dubayan',
    social_links = jsonb_build_object('twitter', 'https://x.com/dubayan')
WHERE id = '08fbe1c7-aa6d-448b-aab3-2d7f4af891f0';

-- د. خالد المنيف — official Instagram @khalids225 (71K).
UPDATE public.hosts
SET followers_count = 71300,
    photo_url = 'https://unavatar.io/x/khalids225',
    social_links = jsonb_build_object(
      'instagram', 'https://www.instagram.com/khalids225/',
      'twitter', 'https://x.com/khalids225'
    )
WHERE id = '74c7d2b5-df37-49bc-ad60-339c71f82b62';

-- سجى الجلعود — the seed row carried a completely different person's slug.
UPDATE public.hosts
SET slug = 'saja-aljulaud',
    followers_count = 5000,
    photo_url = 'https://unavatar.io/x/SajaAljulaud',
    social_links = jsonb_build_object(
      'twitter', 'https://x.com/SajaAljulaud',
      'website', 'https://www.buzzsprout.com/2369623'
    )
WHERE id = 'd7c9090d-950f-49ae-ae08-1501521744f3';

-- Seed rows that were attributed to the wrong people or had invented reach.
UPDATE public.hosts
SET slug = 'abdullah-alhussein', followers_count = 50000
WHERE id = '01771849-271d-459f-bfa9-be32cd633246';

UPDATE public.hosts
SET slug = 'nadeem-barakat', followers_count = 79939
WHERE id = '4e55ce27-2499-4ca1-b7eb-68d5a8b4b7e4';

UPDATE public.hosts
SET slug = 'kheir-jalis', followers_count = 20000
WHERE id = '8a0beb34-5fad-46dd-aade-a8a33986ddef';

UPDATE public.hosts
SET slug = 'ertigal-podcast', followers_count = 10000
WHERE id = 'f1aa902c-b72b-4b10-a99a-5f2c2bfa9466';

COMMIT;
