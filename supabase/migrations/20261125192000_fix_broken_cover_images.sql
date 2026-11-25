-- استبدال صور أغلفة ماتت/مرفوضة (404 / 403 / ORB) بصور موثّقة من مصادر عامة شغّالة.
-- كل الصور اتأكد إنها تُحمّل في المتصفح (HTTP 200 / Image.onload).
-- آمن إعادة تشغيله: UPDATE ثابتة حسب المعرّف.

-- استراتيجيات تطوير القادة — غلاف Apple Podcasts الرسمي
UPDATE public.podcasts
SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/17/d6/57/17d657e9-e09e-bc5d-db4a-2503cb6fcd3a/mza_14947685244643952825.jpg/600x600bb.jpg'
WHERE id = '4bccdb96-a058-5535-9028-78cf9176dc4b';
UPDATE public.hosts
SET photo_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/17/d6/57/17d657e9-e09e-bc5d-db4a-2503cb6fcd3a/mza_14947685244643952825.jpg/600x600bb.jpg'
WHERE id = 'a1ef378f-1785-5cf9-9a72-cb5ce0c2922e';

-- El Maher Mindset — غلاف القناة الحالي من RSS
UPDATE public.podcasts
SET cover_url = 'https://media.rss.com/el-maher-mindset/20250422_080406_12db83a9c0c785dee9f6ec0ca862bbf0.jpg'
WHERE id = '5e8c571c-9d1d-5809-a108-c69b6ca9f4c4';
UPDATE public.hosts
SET photo_url = 'https://media.rss.com/el-maher-mindset/20250422_080406_12db83a9c0c785dee9f6ec0ca862bbf0.jpg'
WHERE id = '2c2afc32-1e0f-5b93-a48c-2dfde6816b4d';

-- لسن — غلاف الإنتاج الرسمي من RSS
UPDATE public.podcasts
SET cover_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/690565/690565-1582864423938-efc797c4dfc22.jpg'
WHERE id = 'e9eda82d-8d29-5399-bdb2-294066ca2613';
UPDATE public.hosts
SET photo_url = 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/690565/690565-1582864423938-efc797c4dfc22.jpg'
WHERE id = '96928822-c4a2-514a-9ecc-eaf1d3370728';

-- باقي الأغلفة المكسورة من نفس مصدر TPP / Podeo / Arn
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/fd/39/dc/fd39dc95-17b7-81f0-5044-e734882f81d9/mza_2248314467891740836.jpg/600x600bb.jpg' WHERE id = 'c051ef34-0830-455f-9011-5cdba49b2307';
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/25/1a/ad/251aad9e-889f-5eb1-127c-c4f970d2e28d/mza_2405595109086693276.jpg/600x600bb.jpg' WHERE id = 'c587fb51-69ab-4620-a037-cd6c641d5a0a';
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/f0/2f/ab/f02fab64-5a02-0d2c-c415-442653667bf6/mza_10899302102545678924.jpg/600x600bb.jpg' WHERE id = '4459577e-c90e-4dbc-aad9-460bdd2e27d1';
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/b6/3a/43/b63a4385-e0fb-a275-c527-d533718693a2/mza_14241096479469985078.jpg/600x600bb.jpg' WHERE id = '7ab0adbe-b4f5-4066-b653-3be6ae6ce14f';
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/95/69/73/9569738f-a98f-de76-836a-775adc17554c/mza_17060221040272791735.jpg/600x600bb.jpg' WHERE id = '85e145ff-7f4f-4bfc-8655-719d1e8b30ed';
UPDATE public.podcasts SET cover_url = 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/12/7a/47/127a4734-094c-2e34-0d46-578d791dfa6f/mza_17924502777962523431.jpg/600x600bb.jpg' WHERE id = 'c926f9d0-f39e-483a-b284-65079e954e8b';
