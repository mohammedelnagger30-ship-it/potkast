/*
  SADA / Potkast - كل التعديلات المعلقة في ميجريشن واحد
  Run once in Supabase SQL Editor.

  آمن إعادة تشغيله: كل جزء idempotent (INSERT WHERE NOT EXISTS / UPSERT / UPDATE by id).
  اللي هيظهر بعد التنفيذ:
    - بوديو / الأسلحة الرقمية
    - دلال القحطاني / مافي شي يضحّك
    - د. خالد المجلاد / استراتيجيات تطوير القادة
    - أحمد ماهر / El Maher Mindset - الماهر مايندست
    - حسين الحباب / لسن
    - مسارات التعلّم + خطواتها
    - إصلاحات الصور/الصوت، المفضلة، إزالة مصطفى حسني، توحيد ياسر الحزيمي
*/

BEGIN;


-- ========================================================================
-- 1) المحتوى المفقود: 5 مقدمين + 5 دورات + 60 حلقة (سيبرانية، كوميديا، قيادة، مايندست، لسن)
-- from: 20261124180000_add_cyber_comedy_leadership_communication_podcasts.sql
-- ========================================================================
/*
  Add verified Arabic-famous podcasts in cybersecurity, comedy, leadership, and communication.
  Sources: verified public RSS feeds with real audio enclosures (checked 200/206 audio or audio content-type).
  Notes:
  - Speech/talk content only; no ibtihalat/music-only shows.
  - Fixed UUIDs for idempotency; inserts only when title/host not already present.
  - Episodes inserted only when podcast exists and audio_url not present.
*/


-- الأسلحة الرقمية
INSERT INTO hosts (id,name_ar,slug,photo_url,title_ar,specialty_ar,bio_ar,country,category_id,is_verified,social_links,created_at)
SELECT '01ac05c5-aa3e-5904-8bb8-08a717b2663c'::uuid,'بوديو','podeo-digital-weapons','https://media.podeo.co/podcasts/OTgyOA/image.jpg','منصة بوديو','الجرائم السيبرانية','بودكاست الأسلحة الرقمية من إنتاج بوديو، يتناول الجرائم الإلكترونية والتهديدات الرقمية وآثارها.','السعودية','efbf528a-6b44-4878-a023-f0e1e40300c0'::uuid,true,'{}'::jsonb,NOW()
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar='بوديو');
INSERT INTO podcasts (id,title,description,host_name,host_bio,category_id,type,cover_url,audience_level,host_id,plays_count,rating_avg,created_at)
SELECT '7565d402-769f-5966-b14a-78a1ec02397a'::uuid,'الأسلحة الرقمية','تزداد الجرائم الإلكترونية في التعقيد والتنوّع، وتشير الحكومات إلى تحدّيات تهزّ أمم بكاملها حيث أصبحت التهديدات متاحة الآن بكبسة زرّ، يتناول هذا البودكاست مخاوف عالميّة حول التوسع في استخدام الأسلحة الرقمية وغيرها من المواضيع ذات الصلة Powered by Podeo — Listen here','بوديو','بودكاست الأسلحة الرقمية من إنتاج بوديو، يتناول الجرائم الإلكترونية والتهديدات الرقمية وآثارها.','efbf528a-6b44-4878-a023-f0e1e40300c0'::uuid,'technology','https://media.podeo.co/podcasts/OTgyOA/image.jpg','beginner',(SELECT id FROM hosts WHERE name_ar='بوديو' LIMIT 1),0,0,NOW()
WHERE NOT EXISTS (SELECT 1 FROM podcasts WHERE title='الأسلحة الرقمية');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'من هم مجموعة "كيلنت"','يعتبر أول هجوم إلكتروني فعلي كبير حصل، ومن أشهر الجرائم الإلكترونية، هجوم نتج عنه خسائر طائلة قدّرت بحوالي خمسمئة مليون دولار أمركي Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTg/audio.mp3',153,'2024-07-25T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTg/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'فيروس الفدية','من أخطر فيروسات الحاسوب في العالم، ما هو فيروس الفدية؟ وكيف يعمل؟ هل هناك إجراءات وقائية؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTc/audio.mp3',145,'2024-07-18T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTc/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'إختراق بيانات الشركات العملاقة','مهما كانت أنظمة أكبر الشركات المعلوماتية سريّة، ومهما يصعب الإطلاع على محتواياتها فإنّ المخترقين لا يعرفون المستحيل، كيف تعرّضت سمعة شركة "تارغيت" لضربة خطيرة؟ وما علاقة شركة تويتر، سبوتيفاي ورديت؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTY/audio.mp3',224,'2024-07-11T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTY/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'إختراق حواسيب شركة "سوني"','لشركة "سوني" حصّة من الضربات الإلكترونية، فهي تعرّضت لإختراقٍ خطير من فبل مخترفي "حراس السلام" قدّرت الخسائر بحوالي مئة مليون دولار أميركيّ، فما هي الدوافع وراء هذه الضربة؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTU/audio.mp3',129,'2024-07-04T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTU/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'عصابات الإتجار بالأعضاء البشرية','المجرمون القتلة أكثر الناس ابتكاراً ...عصابات لم تفوّت فرصة استثمار العالم الإلكترونيّ للإتجار بالأعضاء البشريّة كان التواصل سريعاً فكيف انتهى؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTQ/audio.mp3',329,'2024-06-27T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTQ/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'قرصنة صينية وضربة حادّة لغرفة التجارة الأميركية','الصين، دولة من اللاعبين الكبار، دولة تبتكر، تتطوّر وتنافس. قرصنة صينيّة كانت ضربةٌ لم تتوقّع حصولها الولايات المتحدة الأميركية، كيف تمكنت هذه المجموعة من إختراق الدفاعات الخاصة بأجهزة الكمبيوتر في غرفة التجارة الأميركية؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTM/audio.mp3',148,'2024-06-20T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTM/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'القرصنة الإلكترونية الإيرانية','شبوهات حول ايران، خروقات دولية بينها البيت الأبيض والناسا، أصبح للتكنولوجيا المعلوماتية كلمتها، وإذا تكلّمت ...دمّرت. كيف تعرّضت شركة سيتريكس الأميركية إلى الخرق؟ وما كانت النتائج؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTI/audio.mp3',189,'2024-06-13T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTI/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'قرصنة روسيّة','متقنّع دخل جبهات الحرب السياسية ليكون الطرف الذي يرعب ولايات وأممٍ بأسرها بضغطت زرّ كان يمحو ويزيل، يدمّر ولا يأبى، معلومات انتقلت من الإفتراض إلى الحقيقة التفاصيل في هذه الحلقة Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTE/audio.mp3',228,'2024-06-06T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTE/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'دودة موريس','حادثة من أقدم الهجمات الإلكترونية التي شهدها عالم الجرائم المعلوماتية ، لماذا وصفت هذه الحادثة واحدة من نوعها في عصرها آنذاك؟ "دودة موريس" أول قرصنة إلكترونية يعرفها الإنترنت Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNTA/audio.mp3',113,'2024-05-30T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNTA/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'عندما تصبح التقنية وسيلة إجرام','كيف اخترق مواقع الحلف الأطلسيّ؟ وكيف تمكّن من تشكيل خطرٍ على أهم المواقع الدولية؟ من هو اريك بيرنز؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNDk/audio.mp3',210,'2024-05-23T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNDk/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الجحيم العالمي | Global Hell','كيف بات نظام الولايات المتحدة الأمركية المعلوماتيّ الأقوى عالمياً مهدداً بالجحيم العالميّ؟ من هي المجموعة التي زعزعت أمن هذه البلاد؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNDg/audio.mp3',202,'2024-05-16T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNDg/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أحد أكثر الأفراد طموحًا في تاريخ القرصنة','حلقة لن نقتصر على جريمة إلكترونية واحدة، بل على مجموعة من الأعمال السيبرانية المحظورة بتوقيع ماكس راي بتلر، فمن هو؟ Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/MzExNDc/audio.mp3',194,'2024-05-09T08:00:00+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='الأسلحة الرقمية' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/MzExNDc/audio.mp3');

-- مافي شي يضحّك
INSERT INTO hosts (id,name_ar,slug,photo_url,title_ar,specialty_ar,bio_ar,country,category_id,is_verified,social_links,created_at)
SELECT '77a8511f-2286-50ef-9b71-e765f9b4ab5f'::uuid,'دلال القحطاني','dalal-alqahtani-standup','https://media.podeo.co/podcasts/MjIzODY/image.jpg','كوميديانة ومقدمة بودكاست','ستاند أب كوميدي','دلال القحطاني مقدمة بودكاست مافي شي يضحّك، تستضيف كوميديين عرب للحديث عن فن الستاند أب وتجاربهم.','السعودية','d9d70864-9193-421f-9809-a4249d6d84f8'::uuid,true,'{}'::jsonb,NOW()
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar='دلال القحطاني');
INSERT INTO podcasts (id,title,description,host_name,host_bio,category_id,type,cover_url,audience_level,host_id,plays_count,rating_avg,created_at)
SELECT '7ae2781b-b261-5033-a8c7-e3c928556845'::uuid,'مافي شي يضحّك','بودكاست نسولف فيه عن الستاند اب، تقدمه دلال القحطاني وتلتقي فيه بكوميديانز رهيبين Powered by Podeo — Listen here','دلال القحطاني','دلال القحطاني مقدمة بودكاست مافي شي يضحّك، تستضيف كوميديين عرب للحديث عن فن الستاند أب وتجاربهم.','d9d70864-9193-421f-9809-a4249d6d84f8'::uuid,'comedy','https://media.podeo.co/podcasts/MjIzODY/image.jpg','beginner',(SELECT id FROM hosts WHERE name_ar='دلال القحطاني' LIMIT 1),0,0,NOW()
WHERE NOT EXISTS (SELECT 1 FROM podcasts WHERE title='مافي شي يضحّك');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أكثر شخص حضر عروض كوميدي بود! | مع كريم نصر','في هالحلقة من «مافي شي يضحّك»، «دلال القحطاني» استضافت «كريم نصر»، مهندس النكتة ومشغّل الوسائط في « كوميدي بود » (ولا تسمّيه دي جي، بيكتم الصوت عليك). يعتبر نفسه أكثر واحد حضر عروض في « كوميدي بود » وحافظ نكت الكوميديانز أكثر منهم! ويعرف من أول دقيقة إذا اللي على المسرح بيكسّر الدنيا أو بيتمنى إن النكتة ما طلعت من فمه. «كريم» يقول إنه صريح جدًا ويمارس أقصى درجات صراحته لما يكون مسؤول عن تنظيم اللاين اب… المهمة اللي بدت بتحدّي فيفا مع مديره! نتمنى لكم استماع ممتع ولاتنسون تتابعون حساباتنا على انستغرام: كريم نصر: @abo7ertash مافي شي يضحّك: @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NDA/audio.mp3',4853,'2025-06-19T08:10:32+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NDA/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'مناقشة المواضيع الصعبة بطريقة كوميدية','في هالحلقة من بودكاست «مافي شي يضحّك»، تكلّمت «دلال القحطاني» عن رأيها في سبيشال «أندرو شولتز» الجديد «Life»، وعن مناقشة المواضيع الصعبة بطريقة كوميدية، وتجربتها الشخصية مع هذا الموضوع. نتمنى لكم استماع ممتع ولاتنسون تتابعون حسابنا على انستغرام: مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NDY/audio.mp3',1141,'2025-06-18T13:35:38+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NDY/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'كيف الكوميديان يضر نفسه؟','في هالحلقة من بودكاست «مافي شي يضحّك»، تكلّمت «دلال القحطاني»عن رأيها في سبيشال «جو لست» الجديد «Small Ball». نتمنى لكم استماع ممتع ولاتنسون تتابعون حسابنا على انستغرام: مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NDg/audio.mp3',289,'2025-06-16T06:39:26+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NDg/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'إذا بتسوي نكتة خلها تضحّك','في هالحلقة من بودكاست «مافي شي يضحّك»، تكلّمت «دلال القحطاني»عن رأيها في سبيشال «جيم نورتن» الجديد «Unconceivable». نتمنى لكم استماع ممتع ولاتنسون تتابعون حسابنا على انستغرام: مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NTA/audio.mp3',634,'2025-06-14T22:21:39+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NTA/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'ماستركلاس في الستاند اب كوميدي | مع أسامة اليحيى','في هالحلقة من «مافي شي يضحّك»، دلال القحطاني استضافت أبو سارة، اللي تعرّف على الستاند اب من خلال البودكاستات الكوميدية وتعمّق فيها بشدة لدرجة انه فتح نادي كوميدي «كوميدي بود» عشان يعيش نفس الأجواء اللي كان يسمع عنها، وبعدها صارأقوى نادي كوميدي في السعودية وفاجأ حتى نفسه بالنجاحات اللي حققها، الحلقة تعتبر ماستر كلاس لكل المهتمين في الستاند اب من ناحية كيف تدير نادي كوميدي وتضمن تجربة رهيبة للجمهور والكوميديانز، وفيها قصص كثيرة وتحليل لأفضل وأسوأ سبيشالز في 2024... نتمنى لكم استماع ممتع ولاتنسون تتابعون حساباتنا على انستغرام: أبو سارة @osama97y مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NTE/audio.mp3',15369,'2025-06-04T12:24:33+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NTE/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'بودكاست مافي شي يضحّك - أبو عيد','في هالحلقة من «مافي شي يضحّك»، دلال القحطاني استضافت أبو عيد، الكوميديان اللي يحاول يقنعنا إنه مو كوميديان، وسولف لنا كيف قضّى طفولته يستهلك المحتوى بنهم، وعن العلاقة الغريبة بين الكوميديان والجمهور، وقال رأيه في الكوميديانز السعوديين، وشرح لنا مشاكل صناعة الأفلام والمسلسلات السعودية، وأكد إن الكوميديا، رغم هبالها، إلا إنها أكثر شي جدّي بالحياة. نتمنى لكم استماع ممتع ولاتنسون تتابعون حساباتنا على انستغرام: أبو عيد: @aalrowis مافي شي يضحّك: @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NTY/audio.mp3',6338,'2025-04-04T03:13:27+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NTY/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الضحك والتضحيك كمهارة حياتية | مع عبدالعزيز الهديان','في هالحلقة من مافي شي يضحّك، دلال القحطاني استضافت عبدالعزيز الهديان، الكوميديان اللي يعتزل كل أسبوع، تكلموا عن مكانة الكوميديا المظلومة بين الفنون، وعن الكوميديانز السعوديين والبودكاستات الكوميدية، وكوميدي بود. وشارك عبدالعزيز رأيه عن ليه كل شخص في الحياة لازم يمر بتجربة تقديم عرض؟ وكيف النكتة ممكن تكون الحل الأمثل للمواقف الصعبة حتى للسياسيين والشخصيات الهامة. وطبعًا، ما مرت الحلقة بدون ما يذكر الدلم… وغيرها كثير من المواضيع الرهيبة! نتمنى لكم استماع ممتع ولاتنسون تتابعون حساباتنا على انستغرام: عبدالعزيز الهديان: @alhudian مافي شي يضحّك: @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NTk/audio.mp3',11558,'2025-03-22T12:09:03+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NTk/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الستاند اب كوميدي كعلاج نفسي | مع شاكر الشريف','في هالحلقة من مافي شي يضحّك ، سولفت دلال القحطاني مع شاكر الشريف، الهيدلاينر العظيم! عن رغبته في جذب الانتباه في طفولته، اللي خلته يصير يضحّك، وعن خطته لو كان مسؤول عن مهرجان الكوميديا في السعودية، وكيف دخل المجال بساندويتش فلافل، وكيف يتعالج بفن الستاند اب، وعن الناس اللي ألهموه وساعدوه في المجال، وعن أكبر جريمة في عالم الستاند اب... سرقة المتيريال. نتمنى لكم استماع ممتع ولاتنسون تتابعون حساباتنا على انستغرام: شاكر الشريف: @shakirsharif مافي شي يضحّك: @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NjM/audio.mp3',5916,'2025-03-09T10:46:10+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NjM/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'بودكاست مافي شي يضحّك - أسامة بازيد','في هالحلقة من مافي شي يضحّك ، سولفت دلال القحطاني مع أسامة بازيد عن الكوميديا وكيف إنها متجذرة في جينات العائلة كلها، وعن الحادثة اللي صارت له في الترم الأول من أولى ثانوي وخلته يطلق الكوميديان اللي بداخله، وعن مشاركته في جولة الكوميديانز السعوديين في أمريكا، وتعرّفه على المشهد الكوميدي هناك، وعودته للسعودية وفوزه بالمركز الأول في مسابقة الكوميديا، وعن مواقف كان يتوقع أنها تخلّد في التاريخ وخلّدت لكن ضده… ولا تنسون متابعة حساباتنا على انستغرام: أسامة بازيد: @osamabz مافي شي يضحّك: @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NjY/audio.mp3',9396,'2025-02-28T06:19:38+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NjY/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'بودكاست مافي شي يضحّك - مصعب نصر','في هالحلقة من مافي شي يضحّك سولفت دلال القحطاني مع مصعب نصر عن تطور حسه الكوميدي من وين جاء؟ وكيف ان والدته هي أسطورة التهكم الاولى اللي تدعمه بس مافيه أمل تحضر له، وعن أول تجربة له كهيدلاينر، وإدمان إضحاك الجمهور، وأسلوبه في كتابة النكتة، وغيرها من المواضيع. ولاتنسون تتابعون حساباتنا على إنستغرام: مصعب نصر @mussab_nasr مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NzE/audio.mp3',5733,'2025-01-22T12:09:28+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NzE/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'بودكاست مافي شي يضحّك - عزيز خالد','في هالحلقة من مافي شي يضحّك تكلمنا عن بدايات عزيز في الكوميديا، أول ستاند اب شافه، أول عرض حضره، وشعوره على المسرح وقت النجاح (أو حتى وقت الفشل). وعن الكوميديا السعودية والفرق بين عروض الرياض وجدة، وغيرها من المواضيع. ولا تنسون تتابعون حساباتنا على إنستغرام عزيز خالد @aziz_tbg مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3NzQ/audio.mp3',6400,'2025-01-16T14:13:11+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3NzQ/audio.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'بودكاست مافي شي يضحّك - بركات عسيري','في هالحلقة سولفت دلال القحطاني مع الكوميديان بركات عسيري عن الستاند اب سبيشال الجديد حقه (ماله داعي) متوفر حاليًا عاليوتيوب وعن الستاند اب بشكل عام ومسيرته اللي ممتدة من 10 سنوات للحين وليش الواحد يكمل في مجال الستاند اب رغم انه صعب ومافيه فلوس؟ ولاتنسون تتابعون حساباتنا على إنستغرام بركات عسيري @barakat05 مافي شي يضحّك @msypod Powered by Podeo — Listen to this episode','https://media.podeo.co/episodes/Nzg3Nzc/audio.mp3',6242,'2024-10-31T08:40:01+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='مافي شي يضحّك' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://media.podeo.co/episodes/Nzg3Nzc/audio.mp3');

-- استراتيجيات تطوير القادة
INSERT INTO hosts (id,name_ar,slug,photo_url,title_ar,specialty_ar,bio_ar,country,category_id,is_verified,social_links,created_at)
SELECT 'a1ef378f-1785-5cf9-9a72-cb5ce0c2922e'::uuid,'د. خالد المجلاد','khaled-almojlad-leadership','https://image.simplecastcdn.com/images/fb05b0bb-811b-45a7-8630-10ecdcf01073/9b331d22-0494-4104-b798-ddc6f4274a2d/3000x3000/podcast-cover.jpg?aid=rss_feed','مستشار تطوير القادة والمنظمات','القيادة وتطوير المنظمات','د. خالد المجلاد مستشار في تطوير القادة والمنظمات، يقدم بودكاست استراتيجيات تطوير القادة مع MBC.','السعودية','01d3d03f-d063-45c9-be17-b6005758de96'::uuid,true,'{}'::jsonb,NOW()
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar='د. خالد المجلاد');
INSERT INTO podcasts (id,title,description,host_name,host_bio,category_id,type,cover_url,audience_level,host_id,plays_count,rating_avg,created_at)
SELECT '4bccdb96-a058-5535-9028-78cf9176dc4b'::uuid,'استراتيجيات تطوير القادة','"استراتيجيات تطوير القادة"، مع د. خالد المجلاد، مستشار تطوير القادة والمنظمات، ويحاوره في بعض الحلقات الإعلامي عبد اللطيف العتيبي. يقدم هذا البودكاست لكم أفكارًا واستراتيجيات مهمة لتطوير وتمكين رأس المال البشري الوطني من خلال برامج تطوير القادة. ستتعرفون على طرق فعّالة لتحديد المواهب وتطوير المهارات القيادية وتشجيع التعلم المستمر. ستتمكنون أيضًا من الاستفادة من التوجيه وتعزيز الشمولية والتنوع في برامج التطوير. انضموا إلينا للاستماع إلى هذه النصائح والاستراتيجيات المختصرة لتعزيز تنمية القادة وتحق','د. خالد المجلاد','د. خالد المجلاد مستشار في تطوير القادة والمنظمات، يقدم بودكاست استراتيجيات تطوير القادة مع MBC.','01d3d03f-d063-45c9-be17-b6005758de96'::uuid,'leadership','https://image.simplecastcdn.com/images/fb05b0bb-811b-45a7-8630-10ecdcf01073/9b331d22-0494-4104-b798-ddc6f4274a2d/3000x3000/podcast-cover.jpg?aid=rss_feed','intermediate',(SELECT id FROM hosts WHERE name_ar='د. خالد المجلاد' LIMIT 1),0,0,NOW()
WHERE NOT EXISTS (SELECT 1 FROM podcasts WHERE title='استراتيجيات تطوير القادة');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الرابعة عشر: اختلاف أنواع القيادة في العديد من المنظمات.','اختلاف أنواع القيادة في المنظمات مناقشة أنواع القيادة المختلفة داخل المؤسسات، وكيف يمكن لكل نوع أن يحقق أهدافًا معينة، مع فهم متى وأين يتم توظيفها بفعالية.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/13dfc440-13ae-43fa-9bb4-4bdda19cab59/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=13dfc440-13ae-43fa-9bb4-4bdda19cab59&feed=AoV9DnVv',1233,'2025-05-28T08:58:01+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/13dfc440-13ae-43fa-9bb4-4bdda19cab59/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=13dfc440-13ae-43fa-9bb4-4bdda19cab59&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الثالثة عشر: معوِّقات تطور ونمو القائد','معوقات تطور ونمو القائد ما هي العوائق التي قد تحدّ من نمو القادة؟ نسلط الضوء على التحديات العملية والنفسية وكيفية التغلب عليها لضمان الاستمرارية.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/2d206bcd-3f03-4c47-b002-449c203e046f/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=2d206bcd-3f03-4c47-b002-449c203e046f&feed=AoV9DnVv',1442,'2025-05-28T08:57:31+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/2d206bcd-3f03-4c47-b002-449c203e046f/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=2d206bcd-3f03-4c47-b002-449c203e046f&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الثانية عشر: أهم صفات القائد الناجح والمتميز','أهم صفات القائد الناجح والمتميز ما الذي يجعل القائد متميزًا؟ نتحدث عن أهم الصفات الجوهرية مثل الرؤية، المرونة، القدرة على التحفيز، واتخاذ القرارات الحكيمة....','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/0ca544ce-6c82-4ba3-bc8b-877db115cd60/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=0ca544ce-6c82-4ba3-bc8b-877db115cd60&feed=AoV9DnVv',1383,'2025-05-28T08:57:03+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/0ca544ce-6c82-4ba3-bc8b-877db115cd60/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=0ca544ce-6c82-4ba3-bc8b-877db115cd60&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الحادية عشر: حلقة مخصصة للحديث عن مدرسة القيادة السعودية منذ البدايات إلى يومنا هذا.','مدرسة القيادة السعودية منذ البدايات إلى يومنا هذا حلقة خاصة تروي مسيرة مدرسة القيادة السعودية منذ بداياتها وحتى اليوم، ودورها في إعداد قادة ساهموا في نهضة الوطن','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/18d78df3-1a48-48db-83f5-c63449fdfb94/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=18d78df3-1a48-48db-83f5-c63449fdfb94&feed=AoV9DnVv',1319,'2025-05-28T08:56:31+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/18d78df3-1a48-48db-83f5-c63449fdfb94/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=18d78df3-1a48-48db-83f5-c63449fdfb94&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة العاشرة: أفضل برامج تطوير القادة وأهم البرمجيات التي تُصمم على أساسها','أفضل برامج تطوير القادة نستعرض أبرز البرامج العالمية والمحلية في تطوير القادة، مع تسليط الضوء على أفضل الممارسات والتقنيات التي تُبنى عليها هذه البرامج.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/e47fbd90-44be-4a2a-8eb0-db99a6c916f3/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=e47fbd90-44be-4a2a-8eb0-db99a6c916f3&feed=AoV9DnVv',1281,'2025-05-28T08:56:03+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/e47fbd90-44be-4a2a-8eb0-db99a6c916f3/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=e47fbd90-44be-4a2a-8eb0-db99a6c916f3&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة التاسعة: برامج تطوير القيادة النسائية','برامج تطوير القيادة النسائية نناقش أهمية تمكين المرأة في مواقع القيادة، والبرامج المخصصة لتطوير القيادات النسائية ودورها في تحقيق التوازن والشمولية','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/d2fc9ebc-903d-4c54-adaf-52d97de25c31/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=d2fc9ebc-903d-4c54-adaf-52d97de25c31&feed=AoV9DnVv',1262,'2025-05-28T08:55:33+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/d2fc9ebc-903d-4c54-adaf-52d97de25c31/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=d2fc9ebc-903d-4c54-adaf-52d97de25c31&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الثامنة: أهمية تطوير القادة والبرامج المتبعة في سبيل هذا التطوير','أهمية تطوير القادة والبرامج المتبعة نستعرض أبرز برامج تطوير القادة وكيف تسهم في تعزيز القدرات القيادية الوطنية، مع التركيز على التعلم المستمر وتبادل الخبرات.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/c5c81743-a95e-4685-a07d-5e29775e5ed7/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=c5c81743-a95e-4685-a07d-5e29775e5ed7&feed=AoV9DnVv',891,'2025-05-28T08:55:07+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/c5c81743-a95e-4685-a07d-5e29775e5ed7/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=c5c81743-a95e-4685-a07d-5e29775e5ed7&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة السابعة: ماذا يمكن أن يفعله القائد للاستمرار في النمو والتطور','ماذا يمكن أن يفعله القائد للاستمرار في النمو والتطور القيادة رحلة مستمرة من التعلم. نشارك استراتيجيات تساعد القائد على تنمية مهاراته وتطوير نفسه لمواكبة التغيرات.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/fb10ccb0-6742-4c11-b937-1de75b2634ff/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=fb10ccb0-6742-4c11-b937-1de75b2634ff&feed=AoV9DnVv',1332,'2025-05-28T08:54:35+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/fb10ccb0-6742-4c11-b937-1de75b2634ff/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=fb10ccb0-6742-4c11-b937-1de75b2634ff&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة السادسة: فائدة صفة التفاوض بالنسبة للقائد','فائدة صفة التفاوض بالنسبة للقائد التفاوض مهارة أساسية لكل قائد. نتحدث عن دورها في حل النزاعات، بناء العلاقات، وتحقيق مصالح مشتركة بين الفريق والمؤسسة','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/0269e0fa-8683-416a-8db4-943df1e64adb/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=0269e0fa-8683-416a-8db4-943df1e64adb&feed=AoV9DnVv',1246,'2025-05-28T08:54:04+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/0269e0fa-8683-416a-8db4-943df1e64adb/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=0269e0fa-8683-416a-8db4-943df1e64adb&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الخامسة: السلوك أو السماة التي تعرقل القائد.','السلوك أو السمات التي تعرقل القائد ليس كل سلوك يخدم القيادة. في هذه الحلقة نسلّط الضوء على السمات السلبية التي قد تعيق القائد وتؤثر سلبًا على أداء الفريق.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/c17cc499-0021-4b12-a52c-386820c938e8/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=c17cc499-0021-4b12-a52c-386820c938e8&feed=AoV9DnVv',1247,'2025-05-28T08:53:12+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/c17cc499-0021-4b12-a52c-386820c938e8/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=c17cc499-0021-4b12-a52c-386820c938e8&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الرابعة: الابتكار والإبداع من خلال نظرة القائد.','الابتكار والإبداع من خلال نظرة القائد القائد الناجح لا يكتفي بالإدارة بل يدعم الابتكار والإبداع. نتعرف على كيفية تحفيز الأفكار الجديدة وتحويلها إلى إنجازات عملية.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/00d63c96-770a-4935-a82f-e5f092d9a45d/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=00d63c96-770a-4935-a82f-e5f092d9a45d&feed=AoV9DnVv',1238,'2025-05-28T08:52:40+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/00d63c96-770a-4935-a82f-e5f092d9a45d/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=00d63c96-770a-4935-a82f-e5f092d9a45d&feed=AoV9DnVv');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الحلقة الثالثة: القيادي وتعزيز بيئة العمل الإيجابية','القيادي وتعزيز بيئة العمل الإيجابية كيف يخلق القائد بيئة عمل محفزة وإيجابية تدعم الإنتاجية؟ نناقش أهمية التشجيع، التواصل الفعّال، وبناء ثقافة عمل صحية.','https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/b5ce843c-7960-405e-b0c4-82e9007b74f7/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=b5ce843c-7960-405e-b0c4-82e9007b74f7&feed=AoV9DnVv',1210,'2025-05-28T08:52:11+00:00'::timestamptz,0 FROM podcasts p WHERE p.title='استراتيجيات تطوير القادة' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://pscrb.fm/rss/p/p.podderapp.com/5624967720/injector.simplecastaudio.com/1ee29648-0eed-4aae-a0ad-62c299196658/episodes/b5ce843c-7960-405e-b0c4-82e9007b74f7/audio/128/default.mp3?aid=rss_feed&awCollectionId=1ee29648-0eed-4aae-a0ad-62c299196658&awEpisodeId=b5ce843c-7960-405e-b0c4-82e9007b74f7&feed=AoV9DnVv');

-- El Maher Mindset - الماهر مايندست
INSERT INTO hosts (id,name_ar,slug,photo_url,title_ar,specialty_ar,bio_ar,country,category_id,is_verified,social_links,created_at)
SELECT '2c2afc32-1e0f-5b93-a48c-2dfde6816b4d'::uuid,'أحمد ماهر','ahmed-maher-mindset','https://media.rss.com/el-maher-mindset/20250823_020853_91f746bb864ed32e808f6025570677aa.jpg','مدرب تطوير عقلية وقيادة','تطوير العقلية والقيادة','أحمد ماهر مقدم بودكاست الماهر مايندست، يركز على تطوير العقلية والقيادة والتفكير مع خبراء وقادة.','مصر','01d3d03f-d063-45c9-be17-b6005758de96'::uuid,true,'{}'::jsonb,NOW()
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar='أحمد ماهر');
INSERT INTO podcasts (id,title,description,host_name,host_bio,category_id,type,cover_url,audience_level,host_id,plays_count,rating_avg,created_at)
SELECT '5e8c571c-9d1d-5809-a108-c69b6ca9f4c4'::uuid,'El Maher Mindset - الماهر مايندست','🎙️ الماهر مايندست | بودكاست تطوير العقلية والفكر مع أحمد ماهر وضيوف من نخبة القادة والخبراء، ننطلق في رحلة تهدف إلى كسر القوالب التقليدية، وإشعال ثورة في طريقة التفكير ✨. محاورنا ليست مجرد مواضيع، بل محركات تغيير: 🚀 قيادة وريادة تفتح آفاقاً جديدة 💡 وعي عاطفي وتواصل يغيّر العلاقات 💰 استراتيجيات مالية تبني المستقبل 🤝 علاقات فعّالة تصنع الأثر 🎯 تطوير ذات يقودك إلى تحقيق ما بدا مستحيلاً استمع إلينا لتعيد تشكيل عقلك، وتصبح جزءاً من ثورة فكرية حقيقية، تغيّر حياتك وتقرّبك من أحلامك 🌟.','أحمد ماهر','أحمد ماهر مقدم بودكاست الماهر مايندست، يركز على تطوير العقلية والقيادة والتفكير مع خبراء وقادة.','01d3d03f-d063-45c9-be17-b6005758de96'::uuid,'leadership','https://media.rss.com/el-maher-mindset/20250823_020853_91f746bb864ed32e808f6025570677aa.jpg','beginner',(SELECT id FROM hosts WHERE name_ar='أحمد ماهر' LIMIT 1),0,0,NOW()
WHERE NOT EXISTS (SELECT 1 FROM podcasts WHERE title='El Maher Mindset - الماهر مايندست');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'إزاي تبقى بياع شاطر (الجزء الأول) مع مستر محمد جلال الزيكي| الحلقة التاسعة من بودكاست الماهر مايندست','ياترى إيه اللي يخلي بياع شاطر أوي وبيقفل التارجت، وبياع تاني بيبيع بالعافية هل الموضوع موهبة؟ ولا عقلية وأدوات ووعي بالعميل؟ في الحلقة دي من الماهر مايندست، أستاذ محمد جلال الزيكي هيشرحلك بالتفصيل إزاي تبقى بياع شاطر قادر يفهم العميل اللي قدامه ويقدمله اللي هو فعلا محتاجه الحلقة مثرية ومهمة جدًا لأي بياع سواء في بداية طريقه، أو بياع واقف عطلان ومحتاج طريق واضح يمشي عليه كمان أستاذ محمد جلال الزيكي، هيقدملك نصايح عملية تخليك ترفع مستواك في البيع وتكون فعلًأ بياع واثق ومؤثر. فـ لو نفسك تبقى بياع أقوى وتعرف إزاي تقفل صفقات وتكسب ثقة العملاء بسرعة، الحلقة دي معمولة مخصوص عشانك! 👇 متنساش تعمل: ❤️ لايك وشير مع أي حد محتاج يطور نفسه في البيع 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: https://x.com/elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في ح','https://content.rss.com/episodes/326635/2428194/el-maher-mindset/2026_01_04_12_21_06_cfe66f6c-e4c7-4e82-8e94-77065b0524b3.mp3',2962,'2026-01-04T14:21:09'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2428194/el-maher-mindset/2026_01_04_12_21_06_cfe66f6c-e4c7-4e82-8e94-77065b0524b3.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'امتى تبقى مدير وإمتى تبقى قائد مع د. أحمد موسى | (الجزء الثاني) من الحلقة الثامنة من بودكاست الماهر مايندست','في حلقة النهاردة مع د. أحمد موسى، هنغوص سوا في مفاهيم القيادة والإدارة بشكل مختلف ومثمر فعلاً هتعرف: 📌لو بقيت مدير، تتصرف إزاي؟ 📌إيه أضعف وأقوى سلطة ممكن تبقى في إيدك؟ 📌هل الأفضل تكون محبوب ولا محترم؟ ولا ينفع تجمع بين الاتنين؟ 📌وإيه الفرق الحقيقي بين المدير والقائد، وامتى تبقى قائد، وإمتى لازم تبقى مدير! 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: https://x.com/elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في حياتك وشغلك!','https://content.rss.com/episodes/326635/2396654/el-maher-mindset/2025_12_17_10_19_28_60157499-dace-4ddb-860b-6a7bbba161ae.mp3',2367,'2025-12-17T10:19:59'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2396654/el-maher-mindset/2025_12_17_10_19_28_60157499-dace-4ddb-860b-6a7bbba161ae.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'امتى تبقا قائد وامتى تبقى مديرمع د. أحمد موسى | الجزء الأول من الحلقة الثامنة من بودكاست الماهر مايندست','في حلقة النهاردة مع د. أحمد موسى، هنغوص سوا في مفاهيم القيادة والإدارة بشكل مختلف ومثمر فعلاً هتعرف: 📌لو بقيت مدير، تتصرف إزاي؟ 📌إيه أضعف وأقوى سلطة ممكن تبقى في إيدك؟ 📌هل الأفضل تكون محبوب ولا محترم؟ ولا ينفع تجمع بين الاتنين؟ 📌وإيه الفرق الحقيقي بين المدير والقائد، وامتى تبقى قائد، وإمتى لازم تبقى مدير! تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: https://x.com/elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في حياتك وشغلك!','https://content.rss.com/episodes/326635/2396650/el-maher-mindset/2025_12_17_10_12_04_3aa068ad-dcb2-437c-98c9-fa7bd3c8ee0e.mp3',3178,'2025-12-17T10:12:14'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2396650/el-maher-mindset/2025_12_17_10_12_04_3aa068ad-dcb2-437c-98c9-fa7bd3c8ee0e.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'من مبتدئ لبياع محترف مع كوتش جومانا الحسيني| الحلقة السابعة من بودكاست الماهر مايندست','تقدروا تشوفوا أجزاء الحلقة كاملة على اليوتيوب دلوقتي وباقي منصاتنا 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: https://x.com/elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في حياتك وشغلك!','https://content.rss.com/episodes/326635/2391294/el-maher-mindset/2025_12_15_15_11_38_0da2fb66-456a-4b84-8c48-9a6bd222f15c.mp3',5118,'2025-12-15T15:11:45'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2391294/el-maher-mindset/2025_12_15_15_11_38_0da2fb66-456a-4b84-8c48-9a6bd222f15c.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'مفتاح العلاقات الناجحة (الجزء الثاني) مع د. محمد عبد الباقي| الحلقة الخامسة من بودكاست الماهر مايندست','هل عمرك حسيت إنك مش فاهم نفسك؟ أو إنك مش قادر تتعامل مع الناس في الشغل أو البيت؟ حاسس إن في فجوة بينك وبين اللي حواليك ومش عارف ليه؟ في الحلقة دي من الماهر مايندست، بنستضيف د. محمد عبد الباقي، خبير تحليل الشخصيات وتطوير الفرق، علشان نفهم معاه إزاي أداة تحليل الشخصية " MBTI" ممكن تغير طريقة تواصلك، شغلك، وحتى فهمك لنفسك. في الحلقة دي هنتكلم عن: 🔹 إزاي تحلل نمط شخصيتك وتفهم نقاط قوتك وضعفك 🔹 ليه مهم تفهم نمط شخصية زميلك أو مديرك؟ 🔹 الفرق بين التفكير المنطقي والعاطفي… وإزاي ده بيأثر على الشغل 🔹 أنماط التواصل المختلفة… وإزاي نتجنب سوء الفهم في العلاقات 🔹 إزاي الشركات العالمية بتستخدم أداة تحليل الشخصية "MBTI" في بناء فرق عمل ناجحة 💡 د. محمد بيقدملك أدوات عملية… هتخرج من الحلقة دي مش بس فاهم نفسك، ده كمان هتبقى شايف العالم حواليك من منظور جديد تمامًا! 📌 لو بتدور على التطوير الشخصي، والنجاح المهني، وفهم أعمق للعلاقات… الحلقة دي ليك! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس','https://content.rss.com/episodes/326635/2205294/el-maher-mindset/2025_09_08_13_44_12_501fecd7-c522-4123-bf80-45527e40c9fb.mp3',3164,'2025-09-08T14:23:44'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205294/el-maher-mindset/2025_09_08_13_44_12_501fecd7-c522-4123-bf80-45527e40c9fb.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'مفتاح العلاقات الناجحة (الجزء الأول) مع د. محمد عبد الباقي| الحلقة الخامسة من بودكاست الماهر مايندست','هل عمرك حسيت إنك مش فاهم نفسك؟ أو إنك مش قادر تتعامل مع الناس في الشغل أو البيت؟ حاسس إن في فجوة بينك وبين اللي حواليك ومش عارف ليه؟ في الحلقة دي من الماهر مايندست، بنستضيف د. محمد عبد الباقي، خبير تحليل الشخصيات وتطوير الفرق، علشان نفهم معاه إزاي أداة تحليل الشخصية " MBTI" ممكن تغير طريقة تواصلك، شغلك، وحتى فهمك لنفسك. في الحلقة دي هنتكلم عن: 🔹 إزاي تحلل نمط شخصيتك وتفهم نقاط قوتك وضعفك 🔹 ليه مهم تفهم نمط شخصية زميلك أو مديرك؟ 🔹 الفرق بين التفكير المنطقي والعاطفي… وإزاي ده بيأثر على الشغل 🔹 أنماط التواصل المختلفة… وإزاي نتجنب سوء الفهم في العلاقات 🔹 إزاي الشركات العالمية بتستخدم أداة تحليل الشخصية "MBTI" في بناء فرق عمل ناجحة 💡 د. محمد بيقدملك أدوات عملية… هتخرج من الحلقة دي مش بس فاهم نفسك، ده كمان هتبقى شايف العالم حواليك من منظور جديد تمامًا! 📌 لو بتدور على التطوير الشخصي، والنجاح المهني، وفهم أعمق للعلاقات… الحلقة دي ليك! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس','https://content.rss.com/episodes/326635/2205258/el-maher-mindset/2025_09_08_13_21_58_3fe4fb4b-dcc0-4cf8-8ad5-1f09db674721.mp3',3245,'2025-09-08T13:37:05'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205258/el-maher-mindset/2025_09_08_13_21_58_3fe4fb4b-dcc0-4cf8-8ad5-1f09db674721.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أسرار المال والثروات (الجزء الرابع) مع كوتش محمد باوزير | الحلقة الرابعة من بودكاست الماهر مايندست','هل عمرك حسيت إنك واقف في مكانك رغم إنك بتحاول؟ هل بتدور على المفتاح اللي يفتح لك باب النجاح الحقيقي والوفرة؟ في الحلقة دي، بنستضيف واحد من أقوى الكوتشز في العالم العربي: كوتش محمد باوزير، علشان نغوص معاه في أسرار التغيير الحقيقي، بناء الثروة، وتحقيق الأهداف مهما كانت بعيدة. 🔥 في الحلقة دي من بودكاست الماهر مايندست هنغوص في رحلة آخرها النجاح والمكاسب: ✨ ليه الهدف هو بداية كل شيء؟ ✨ إزاي تغير نظرتك للحياة فـ الكون كله يتجاوب معاك؟ ✨ ليه مش لازم تكون غني بس.. لازم تكون إيجابي وعالي الذبذبات؟ ✨ خطوات عملية تبدأ بيها رحلة تحقيق الثراء ومضاعفة دخلك ✨ الفرق بين اللي بيعيش عادي، واللي بيعيش بقصد وتخطيط ووعي! 💡 محمد باوزير مش مجرد مدرب… ده إنسان عاش صعود وهبوط، فشل ونجاح، وقرر يكرّس حياته علشان يساعد الآلاف يطلعوا النسخة الأقوى من نفسهم ويكسروا الحدود اللي بتوقفهم. 📌 لو بتدور على التغيير، الطاقة، والتحفيز الحقيقي… الحلقة دي ليك! اضغط Play وشوف الكون ممكن يتغير إزاي لما إنت تتغير! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 🔔 وسبسكرايب للقناة عشان توصلك باق','https://content.rss.com/episodes/326635/2205242/el-maher-mindset/2025_09_08_13_10_16_6a95d897-373d-4495-a8f4-b2fed7f5d85f.mp3',1517,'2025-09-08T13:10:37'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205242/el-maher-mindset/2025_09_08_13_10_16_6a95d897-373d-4495-a8f4-b2fed7f5d85f.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أسرار المال والثروات (الجزء الثالث) مع كوتش محمد باوزير | الحلقة الرابعة من بودكاست الماهر مايندست','هل عمرك حسيت إنك واقف في مكانك رغم إنك بتحاول؟ هل بتدور على المفتاح اللي يفتح لك باب النجاح الحقيقي والوفرة؟ في الحلقة دي، بنستضيف واحد من أقوى الكوتشز في العالم العربي: كوتش محمد باوزير، علشان نغوص معاه في أسرار التغيير الحقيقي، بناء الثروة، وتحقيق الأهداف مهما كانت بعيدة. 🔥 في الحلقة دي من بودكاست الماهر مايندست هنغوص في رحلة آخرها النجاح والمكاسب: ✨ ليه الهدف هو بداية كل شيء؟ ✨ إزاي تغير نظرتك للحياة فـ الكون كله يتجاوب معاك؟ ✨ ليه مش لازم تكون غني بس.. لازم تكون إيجابي وعالي الذبذبات؟ ✨ خطوات عملية تبدأ بيها رحلة تحقيق الثراء ومضاعفة دخلك ✨ الفرق بين اللي بيعيش عادي، واللي بيعيش بقصد وتخطيط ووعي! 💡 محمد باوزير مش مجرد مدرب… ده إنسان عاش صعود وهبوط، فشل ونجاح، وقرر يكرّس حياته علشان يساعد الآلاف يطلعوا النسخة الأقوى من نفسهم ويكسروا الحدود اللي بتوقفهم. 📌 لو بتدور على التغيير، الطاقة، والتحفيز الحقيقي… الحلقة دي ليك! اضغط Play وشوف الكون ممكن يتغير إزاي لما إنت تتغير! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 🔔 وسبسكرايب للقناة عشان توصلك باق','https://content.rss.com/episodes/326635/2205233/el-maher-mindset/2025_09_08_13_00_06_831fb423-3ed2-4314-b5c8-f5aa53b90c4e.mp3',1692,'2025-09-08T13:05:20'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205233/el-maher-mindset/2025_09_08_13_00_06_831fb423-3ed2-4314-b5c8-f5aa53b90c4e.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أسرار المال والثروات (الجزء الثاني) مع كوتش محمد باوزير | الحلقة الرابعة من بودكاست الماهر مايندست','هل عمرك حسيت إنك واقف في مكانك رغم إنك بتحاول؟ هل بتدور على المفتاح اللي يفتح لك باب النجاح الحقيقي والوفرة؟ في الحلقة دي، بنستضيف واحد من أقوى الكوتشز في العالم العربي: كوتش محمد باوزير، علشان نغوص معاه في أسرار التغيير الحقيقي، بناء الثروة، وتحقيق الأهداف مهما كانت بعيدة. 🔥 في الحلقة دي من بودكاست الماهر مايندست هنغوص في رحلة آخرها النجاح والمكاسب: ✨ ليه الهدف هو بداية كل شيء؟ ✨ إزاي تغير نظرتك للحياة فـ الكون كله يتجاوب معاك؟ ✨ ليه مش لازم تكون غني بس.. لازم تكون إيجابي وعالي الذبذبات؟ ✨ خطوات عملية تبدأ بيها رحلة تحقيق الثراء ومضاعفة دخلك ✨ الفرق بين اللي بيعيش عادي، واللي بيعيش بقصد وتخطيط ووعي! 💡 محمد باوزير مش مجرد مدرب… ده إنسان عاش صعود وهبوط، فشل ونجاح، وقرر يكرّس حياته علشان يساعد الآلاف يطلعوا النسخة الأقوى من نفسهم ويكسروا الحدود اللي بتوقفهم. 📌 لو بتدور على التغيير، الطاقة، والتحفيز الحقيقي… الحلقة دي ليك! اضغط Play وشوف الكون ممكن يتغير إزاي لما إنت تتغير! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 🔔 وسبسكرايب للقناة عشان توصلك باق','https://content.rss.com/episodes/326635/2205226/el-maher-mindset/2025_09_08_12_52_56_cd4f6ed3-4c63-4ede-8f19-e2f1384431f1.mp3',1644,'2025-09-08T12:53:23'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205226/el-maher-mindset/2025_09_08_12_52_56_cd4f6ed3-4c63-4ede-8f19-e2f1384431f1.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أسرار المال والثروات (الجزء الأول) مع كوتش محمد باوزير | الحلقة الرابعة من بودكاست الماهر مايندست','هل عمرك حسيت إنك واقف في مكانك رغم إنك بتحاول؟ هل بتدور على المفتاح اللي يفتح لك باب النجاح الحقيقي والوفرة؟ في الحلقة دي، بنستضيف واحد من أقوى الكوتشز في العالم العربي: كوتش محمد باوزير، علشان نغوص معاه في أسرار التغيير الحقيقي، بناء الثروة، وتحقيق الأهداف مهما كانت بعيدة. 🔥 في الحلقة دي من بودكاست الماهر مايندست هنغوص في رحلة آخرها النجاح والمكاسب: ✨ ليه الهدف هو بداية كل شيء؟ ✨ إزاي تغير نظرتك للحياة فـ الكون كله يتجاوب معاك؟ ✨ ليه مش لازم تكون غني بس.. لازم تكون إيجابي وعالي الذبذبات؟ ✨ خطوات عملية تبدأ بيها رحلة تحقيق الثراء ومضاعفة دخلك ✨ الفرق بين اللي بيعيش عادي، واللي بيعيش بقصد وتخطيط ووعي! 💡 محمد باوزير مش مجرد مدرب… ده إنسان عاش صعود وهبوط، فشل ونجاح، وقرر يكرّس حياته علشان يساعد الآلاف يطلعوا النسخة الأقوى من نفسهم ويكسروا الحدود اللي بتوقفهم. 📌 لو بتدور على التغيير، الطاقة، والتحفيز الحقيقي… الحلقة دي ليك! اضغط Play وشوف الكون ممكن يتغير إزاي لما إنت تتغير! 👇 متنساش تعمل: ❤️ لايك 💬 كومنت عن أكتر فكرة لمستك 🔁 شير مع حد محتاج يسمع الكلام ده 🔔 وسبسكرايب للقناة عشان توصلك باق','https://content.rss.com/episodes/326635/2205228/el-maher-mindset/2025_09_08_12_53_09_0201dbbf-1f72-4f48-a7c4-45bfbe6d5498.mp3',2166,'2025-09-08T12:53:18'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205228/el-maher-mindset/2025_09_08_12_53_09_0201dbbf-1f72-4f48-a7c4-45bfbe6d5498.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'لعبة البزنس (الجزء الثاني) مع د. تامر منتصر | الحلقة الثالثة من بودكاست الماهر مايندست','في حلقة جديدة من بودكاست الماهر مايندست، بنستضيف د. تامر منتصر اللي بيكسر مسلمات كتير عن النجاح، استخدام السوشيال ميديا، وفكرة التأثير. د. تامر منتصر هو استشاري إداري وخبير تطوير أعمال، اشتغل مع شركات ومؤسسات كبيرة على بناء الفريق، ووضع استراتيجيات نمو حقيقية. طريقته مختلفة، لأنه بيجمع بين العقل التحليلي والخبرة اللى جاية من أرض الواقع، بس دايمًا بيكلمك بلغة الواقع مش الأحلام. ليه لازم تفكر مرتين قبل ما تنبهر؟ وليه سرعة الوصول مش أهم من صحة الطريق؟ وإزاي تبني نفسك وشغلك وسط عالم بيحتفل بالمظاهر؟ هنغوص في مفاهيم زي: الفرق بين "إنجاز فعلي" و"انطباع مؤقت" خطر العلاقات الواسعة وعدم التركيز ازاي تحمي فكرتك من اللي ممكن يسرقها وينفذها قبلك 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: / elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في حياتك وشغلك!','https://content.rss.com/episodes/326635/2205196/el-maher-mindset/2025_09_08_12_28_42_27881658-2e26-420c-af84-21daa0092d0e.mp3',2450,'2025-09-08T12:44:49'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2205196/el-maher-mindset/2025_09_08_12_28_42_27881658-2e26-420c-af84-21daa0092d0e.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'لعبة البزنس (الجزء الأول) مع د. تامر منتصر | الحلقة الثالثة من بودكاست الماهر مايندست','في الحلقة جديدة من بودكاست الماهر مايندست، بنستضيف د. تامر منتصر اللي بيكسر مسلمات كتير عن النجاح، استخدام السوشيال ميديا، وفكرة التأثير. د. تامر منتصر هو استشاري إداري وخبير تطوير أعمال، اشتغل مع شركات ومؤسسات كبيرة على بناء الفريق، ووضع استراتيجيات نمو حقيقية. طريقته مختلفة، لأنه بيجمع بين العقل التحليلي والخبرة اللى جاية من أرض الواقع، بس دايمًا بيكلمك بلغة الواقع مش الأحلام. ليه لازم تفكر مرتين قبل ما تنبهر؟ وليه سرعة الوصول مش أهم من صحة الطريق؟ وإزاي تبني نفسك وشغلك وسط عالم بيحتفل بالمظاهر؟ هنغوص في مفاهيم زي: الفرق بين "إنجاز فعلي" و"انطباع مؤقت" خطر العلاقات الواسعة وعدم التركيز ازاي تحمي فكرتك من اللي ممكن يسرقها وينفذها قبلك 📲 تابعونا على: 🔹 إنستجرام: / el_maher_mindset محتوى يومي، نصائح سريعة، وكواليس البودكاست! 🔹 فيسبوك: / elmahermindset نقاشات عميقة ومجتمع بيتطور مع بعض! 🔹 إكس: / elmahermindset محتوى تعليمي حول كل ما يخص المايندست! 🔹 تيك توك: / el.maher.mindset مقاطع ملهمة قصيرة هتغير طريقة تفكيرك في دقيقة! 🔹 لينكد إن: / el-maher-mindset نصائح عملية للنجاح في حياتك وشغلك!','https://content.rss.com/episodes/326635/2193472/el-maher-mindset/2025_09_08_11_02_35_162665ab-7495-4ff3-b51c-580aee4e3352.mp3',2637,'2025-09-01T12:59:42'::timestamptz,0 FROM podcasts p WHERE p.title='El Maher Mindset - الماهر مايندست' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://content.rss.com/episodes/326635/2193472/el-maher-mindset/2025_09_08_11_02_35_162665ab-7495-4ff3-b51c-580aee4e3352.mp3');

-- لسن
INSERT INTO hosts (id,name_ar,slug,photo_url,title_ar,specialty_ar,bio_ar,country,category_id,is_verified,social_links,created_at)
SELECT '96928822-c4a2-514a-9ecc-eaf1d3370728'::uuid,'حسين الحباب','hussein-alhabbab-lasin','https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/1066256/1066256-1689326441772-7ed1f3f3f242f.jpg','مدرب تواصل وخطابة','فن التواصل والخطابة','حسين الحباب مؤسس شبكة لسن، متخصص في مهارات وفن التواصل والخطابة والإلقاء.','السعودية','3cb6e8f9-518d-4b33-a4a3-8c9a1b1be147'::uuid,true,'{}'::jsonb,NOW()
WHERE NOT EXISTS (SELECT 1 FROM hosts WHERE name_ar='حسين الحباب');
INSERT INTO podcasts (id,title,description,host_name,host_bio,category_id,type,cover_url,audience_level,host_id,plays_count,rating_avg,created_at)
SELECT 'e9eda82d-8d29-5399-bdb2-294066ca2613'::uuid,'لسن','فن التواصل باختصار لَسِن: كلمة عربية تصف من يجيد التحدث هذه القناة متخصصة في كل ما يتعلق بمهارات وفن التواصل من إعداد وتقديم: حسين الحباب كما يمكنكم متابعتنا على حساباتنا في تويتر, انستجرام وفيسبوك على @NetworkLasin يوتيوب على https://www.youtube.com/channel/UCZFUbU4WxV_GhvHwFJ9n0KA لخدمات التدريب في مجالات التواصل ولطلبات التعليق الصوتي يمكنكم التواصل على الايميل info@lasin.net www.Lasin.net','حسين الحباب','حسين الحباب مؤسس شبكة لسن، متخصص في مهارات وفن التواصل والخطابة والإلقاء.','3cb6e8f9-518d-4b33-a4a3-8c9a1b1be147'::uuid,'professional','https://d3t3ozftmdmh3i.cloudfront.net/staging/podcast_uploaded_nologo/1066256/1066256-1689326441772-7ed1f3f3f242f.jpg','beginner',(SELECT id FROM hosts WHERE name_ar='حسين الحباب' LIMIT 1),0,0,NOW()
WHERE NOT EXISTS (SELECT 1 FROM podcasts WHERE title='لسن');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'التعليق الصوتي','كيف تبدأ في التعليق الصوتي --------------------------------------------------------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية للتسجيل في الدورات التدريبية على الرابط http://www.lasin.net --------------------------------------------------------------- الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net ----------------------------------------------------------------- لا تنسوا الدعاء لصانع المحتوى ولتواصل أفضل شاركونا آرائكم على مواقع التواصل الاجتماعي تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ تيك توك https://www.tiktok.com/@networklasin سناب تشات https://www.snapchat.com/networklasin لتقديم هذا المحتوى أو أي ورشة لمهار','https://anchor.fm/s/4b64e74/podcast/play/87511795/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2024-5-2%2F3be1f0c5-45d7-4135-1693-be709cc8d3e2.mp3',1120,'2024-06-02T16:44:59'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/87511795/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2024-5-2%2F3be1f0c5-45d7-4135-1693-be709cc8d3e2.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'اطلق صوتك','كيف تتحكم في نبرات صوتك وتصل لمستوى احترافي ------------------------------------------------------------------------------ يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية للتسجيل في الدورات التدريبية على الرابط http://www.lasin.net --------------------------------------------------------------- الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net ----------------------------------------------------------------- لا تنسوا الدعاء لصانع المحتوى ولتواصل أفضل شاركونا آرائكم على مواقع التواصل الاجتماعي تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ تيك توك https://www.tiktok.com/@networklasin سناب تشات https://www.snapchat.com/networklasin اتقديم هذا المحتوى في ورشة تدريبية خاصة ولطلبات الت','https://anchor.fm/s/4b64e74/podcast/play/73033725/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2023-6-5%2F338132747-44100-2-bc57e61017b1c.mp3',2773,'2023-07-05T18:50:00'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/73033725/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2023-6-5%2F338132747-44100-2-bc57e61017b1c.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'مقياس بيركمان','ماهو مقياس تحليل بيركمان وما هي فائدته نستضيف في هذه الحلقة من حوار بودكاست #لسن الدكتور عبدالرحمن خفاجي لنتعرف بشكل مفصل عن مميزات هذا المقياس لكل فرد ضيف الحلقة االدكتور عبدالرحمن خفاجي: طبيب متخصص في الجراحة العامة مستشار معتمد بمقياس بيركمان العالمي للسلوك البشري مدرب معتمد من الاتحاد الدولي للمدربین في بريطانيا ICF مرشد مهني في التطوير الوظيفي من الجمعیة الوطنیة للتطویرالمهني بأمريكا عضو في أندية التوستماسترز للخطابة حاصل على المركز الثالث في الخطب العربية على مستوى المملكة تويتر https://twitter.com/abdulrhman_mkh/ انستجرام https://www.instagram.com/abdulrhman_khafagy/ واتساب https://wa.me/+966543055088 ايميل abdurhman.mk@gmail.com خصم خاص لكل متابعين بودكاست لسن على تحليل بيركمان ------------------------------------------- هذه الحلقة من انتاج مؤسسة #شبكة_لسن للتفاصيل والحجز https:// www.lasin.net تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ يوتيوب https://www.youtube.com/@networklasin تيك توك','https://anchor.fm/s/4b64e74/podcast/play/61907364/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-11-8%2F400f518a-d7f3-b7dc-737c-eac1cd8ec0af.mp3',2245,'2022-12-08T21:57:11'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/61907364/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-11-8%2F400f518a-d7f3-b7dc-737c-eac1cd8ec0af.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'كيف أفهم نفسي بتحليل ديسك','نستضيف في هذه الحلقة من حوار بودكاست #لسن عن تحليل ديسك DISC لفهم السلوك والتواصل مع الذات بشكل أفضل، المحاور 1-ليش مهم انك تتعرف على سماتك السلوكية؟ ٢-كيف بدات قصتك مع المقياس ؟ ٣-هل المقياس لفئة محددة ؟ ٤- ماهى فوائد التقييم الافراد والمنظمات؟ ٥-ما علاقة التقييم بمقياس هيرمان او بيركمان او سترونج او هولاند ٦-اعطينا فكرة عن المقياس ؟ ٧-هل هو فقط تقييم او في دورة متخصصة؟ ولمن تنصح ياخذها؟ ضيف الحلقة المهندس عبدالرحيم عمر محمد: مهندس كهربائي– باحث ماجستير جودة حالياً بجامعة القاهرة يعمل حالياً (بشركة) لأكثر من 25 سنة وخبير تطوير موارد بشرية وحاصل Level 5 L&D ) CIPD ) مستشار معتمد من وزارة التجارة ومدرب معتمد TVTC ومقيم تميز مؤسسي معتمد EFQM&KAQA Lead Auditor Certified IRCA ISO 9001:2015 أخصائي ابتكار معتمد من GIA حاصل على برنامج تعديل سلوك للأطفال والمراهقين ممارس كوتشينيج معتمد ICF مستشار التحسين المستمر والإدارة الرشيقة ( المنهجية اليابانية) معتمد في مقياس فهم التصرفات الشخصية DiSC من Wiley الامريكية ومدرب مدربين المقياس للحصول على الامتياز التجاري سفير جودة أول ضمن الاستراتيجية الوطن','https://anchor.fm/s/4b64e74/podcast/play/59780229/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-9-29%2F293881112-44100-2-dacd8561f4505.m4a',5587,'2022-10-29T22:13:52'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/59780229/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-9-29%2F293881112-44100-2-dacd8561f4505.m4a');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'طريقة فورد للحوار مع أي شخص','كيف تفتح موضوع مع احد حابب تتكلم معاه وتضمن انه الحوار يفضل مستمر --------------------------------------------------------------------------------------------------------------- الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net تصوير / عبدالرحمن الحباب https://www.instagram.com/dahmi1988/ https://twitter.com/DAHMI1988 --------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية على الرابط http://www.lasin.net ----------------------------------------------------------------- لا تنسوا 1- الاشتراك بالقناة ليصلكم كل جديد 2- الضغط على زر الإعجاب 3- مشاركتها مع من تحبون ولتواصل أفضل شاركونا آرائكم على هاشتاق #أصدقاء_بودكاست_لسن وذلك على مواقع التواصل الاجتماعي @networklasin تويتر https://twitter.com/NetworkLasin انستجرام','https://anchor.fm/s/4b64e74/podcast/play/58609199/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-9-5%2Fad42f8cd-1dad-5c9d-21ab-07bb16016fc5.mp3',533,'2022-10-05T14:41:21'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/58609199/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-9-5%2Fad42f8cd-1dad-5c9d-21ab-07bb16016fc5.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'فن المقاطعة','بعض الأشخاص ما يوقف لو بدا يتكلم، فكيف نقدر نقاطعهم؟ الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net تصوير / عبدالرحمن الحباب https://www.instagram.com/dahmi1988/ https://twitter.com/DAHMI1988 --------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية على الرابط http://www.lasin.net ----------------------------------------------------------------- لا تنسوا 1- الاشتراك بالقناة ليصلكم كل جديد 2- الضغط على زر الإعجاب 3- مشاركتها مع من تحبون ولتواصل أفضل شاركونا آرائكم على هاشتاق #أصدقاء_بودكاست_لسن وذلك على مواقع التواصل الاجتماعي @networklasin تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ لخدمات التدريب في مجالات التواصل ولطلبا','https://anchor.fm/s/4b64e74/podcast/play/56815617/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-7-29%2Fdbca97a3-8d74-8402-fdf1-5768393ad4c6.mp3',361,'2022-08-31T13:08:58'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/56815617/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-7-29%2Fdbca97a3-8d74-8402-fdf1-5768393ad4c6.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'كيف تحترف لغة الجسد','أسرار لغة الجسد كما لم تراها من قبل شاهد وتعلم كيف تتحكم في لغة جسدك - الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net تصوير / عبدالرحمن الحباب https://www.instagram.com/dahmi1988/ https://twitter.com/DAHMI1988 --------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية على الرابط http://www.lasin.net ----------------------------------------------------------------- لا تنسوا 1- الاشتراك بالقناة ليصلكم كل جديد 2- الضغط على زر الإعجاب 3- مشاركتها مع من تحبون ولتواصل أفضل شاركونا آرائكم على هاشتاق #أصدقاء_بودكاست_لسن وذلك على مواقع التواصل الاجتماعي @networklasin تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ لخدمات التدريب في مجا','https://anchor.fm/s/4b64e74/podcast/play/55387054/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-6-27%2F01218e68-4f68-bd7c-95ae-837798914be8.mp3',517,'2022-07-27T14:01:12'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/55387054/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-6-27%2F01218e68-4f68-bd7c-95ae-837798914be8.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'تقييم سترونج لتحديد الميول التخصصية والمهنية','نستضيف في هذه الحلقة من حوار بودكاست #لسن عن تقييم سترونج لتحديد الميول التخصصية والمهنية، المهندس عمر العماري: خبره اكثر من ٢٠ سنه كمهندس تخطيط بكبرى الشركات الخدميه بالقطاع الخاص، حاليا يشغل منصب خبير بمركز كفاءة الأداء. هو مدرب معتمد من مركز المدربون المتحدون للتدريب، ومعتمد من مركز اوكتاريوم السعوديه للاستشارات (advance life coach) حسب معايير ال ICF العالميه. مجاز من شركة مايرز آند بريجز الامريكيه في تحليل تقييم strong inventory assessment لمساعدة المستفيدين في تحديد الميول المهنيه والدراسية تويتر https://twitter.com/alammaryomar/ انستجرام https://www.instagram.com/alammaryomar/ يوتيوب https://www.youtube.com/alammaryomar/ بريد الكرتوني alammariomar@gmail.com ------------------------------------------- سنتعرف في هذه الحلقة على: -ليش مهم تعرف ميولك المهنية بدري -كيف تسأل نفسك الاسئلة الصح عشان تعرف ميولك المهنية -تقييم سترونج واهدافه وانواعه -قصص حقيقية من الاخرين -قصتك الشخصية -رسالة للمقبلين للجامعة -رسالة للموظفين الراغبين في تحويل مسار العمل او لمن فقد الشغف في مجال عمله -------','https://anchor.fm/s/4b64e74/podcast/play/54218263/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-5-30%2F0705908b-bfd1-ba20-00b0-f760c72554f4.mp3',5569,'2022-06-30T13:38:43'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/54218263/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-5-30%2F0705908b-bfd1-ba20-00b0-f760c72554f4.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'أنواع الاتفاقيات','هل تعرف انك بتستخدم أنواع من الاتفاقيات كل يوم ؟ شوف الحلقة واتعرف على أكثر أنواع الاتفاقيات استخداماً --------------------------------------------------------------------------------------------------------------- الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net تصوير / عبدالرحمن الحباب https://www.instagram.com/dahmi1988/ https://twitter.com/DAHMI1988 مراجعة قانونية / حمد اليحيى https://instagram.com/hamad_1412 https://twitter.com/hamad_1412 --------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية على الرابط http://www.lasin.net ----------------------------------------------------------------- لا تنسوا 1- الاشتراك بالقناة ليصلكم كل جديد 2- الضغط على زر الإعجاب 3- مشاركتها مع من تحبون ولتواصل أفضل شاركونا آرائ','https://anchor.fm/s/4b64e74/podcast/play/52425309/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-4-23%2F1a9bde68-da75-5a98-6a63-b5d50e5f3e7c.mp3',587,'2022-05-23T14:12:17'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/52425309/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-4-23%2F1a9bde68-da75-5a98-6a63-b5d50e5f3e7c.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'الخط العربي مع المهندس سراج علاف','نستضيف في هذه الحلقة من بودكاست #لسن عن الخط العربي، المهندس سراج علاف: فنان وخطاط سعودي مجاز في مجال الخط العربي. حاصل على العديد من الاستحقاقات والجوائز ومن أكثر المعلمين شهرة في مجال تعليم الخط العربي ومتخصص في التعليم عن بعد. أحد رواد دمج تقنيات الذكاء الصناعي والخط العربي. مستشار هندسي وطالب دكتوراه في هندسة الحاسبات. تويتر https://twitter.com/sirajallaf/ انستجرام https://www.instagram.com/sirajallaf/ لينكد ان https://www.linkedin.com/in/sirajallaf/ موقع الكرتوني https://sirajallaf.com/ ------------------------------------------- سنتعرف في هذه الحلقة على: الخط العربي ودوره في مهارات التواصل بين العرب ------------------------------------------- هذه الحلقة من انتاج مؤسسة #شبكة_لسن للتفاصيل والحجز https:// www.lasin.net تويتر https://twitter.com/NetworkLasin انستجرام https://www.instagram.com/networklasin/ فيسبوك https://www.facebook.com/Networklasin/ يوتيوب https://www.youtube.com/channel/UCZFUbU4WxV_GhvHwFJ9n0KA تصوير وتسجيل صوتي ومونتاج فيديو: معتز امبون https://www.instagram.com/','https://anchor.fm/s/4b64e74/podcast/play/51040892/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-4-8%2F45b6c66d-b212-aa9c-93e7-7e2baebcc61d.mp3',4723,'2022-04-24T23:55:28'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/51040892/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-4-8%2F45b6c66d-b212-aa9c-93e7-7e2baebcc61d.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'نموذج GROW','هل سمعت عن نموذج Grow أربعة خطوات سريعة تساعد في اتخاذ القرار --------------------------------------------------------------------------------------------------------------- الحلقة من إعداد وتقديم / م. حسين الحباب https://instagram.com/hussainalhabbab?igshid=8pwyl3ot0xpe https://twitter.com/hussainalhabbab h.alhabbab@lasin.net تصوير / عبدالرحمن الحباب https://www.instagram.com/dahmi1988/ https://twitter.com/DAHMI1988 --------------------------------------------------------------- يمكنكم مشاهدة الحلقة على اليوتيوب والاستماع لها عبر تطبيقات الـ #بودكاست أبل بودكاست قوقل بودكاست وبقية برامج البودكاست الأخرى ومواقع الكتب الصوتية والمكتبات الغنائية على الرابط http://www.lasin.net ----------------------------------------------------------------- لا تنسوا 1- الاشتراك بالقناة ليصلكم كل جديد 2- الضغط على زر الإعجاب 3- مشاركتها مع من تحبون ولتواصل أفضل شاركونا آرائكم على هاشتاق #أصدقاء_بودكاست_لسن وذلك على مواقع التواصل الاجتماعي @networklasin تويتر https://twitter.com/NetworkLasin انستجرام http','https://anchor.fm/s/4b64e74/podcast/play/49860201/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-2-30%2Fbbb6426c-f140-3e19-0909-d50f5c8e998a.mp3',470,'2022-03-30T18:51:54'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/49860201/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-2-30%2Fbbb6426c-f140-3e19-0909-d50f5c8e998a.mp3');
INSERT INTO episodes (podcast_id,title,description,audio_url,duration_seconds,published_at,plays_count)
SELECT p.id,'نموذج العمل الشخصي مع أ. عبدالله بن عفيف','نستضيف في هذه الحلقة من بودكاست #لسن ، الأستاذ عبدالله بن عفيف: صاحب خبرة تزيد عن العشرين عاما في تقديم الاستشارات التعليمية والتدريب والتيسير وتطوير الأداء المهني وقيادة التغير بعدد ساعات تجاوز الخمسة الاف ساعة. وفي مجال التعليم وتطوير المؤسسات والأفراد ساهم في تطوير وتنفيذ أكثر من 110 مشروع وفي المملكة وفي 14 دولة أخرى هو مستشار في في التميز المؤسسي وفي مقياس PQASSO للجودة ويحمل شهادة مهنية قياس العائد على الاستثار ومؤشرت الأداء المتوازن وفي التوستماسترز هو حاصل على أعلى درجاتها كعريف مميز وأحد أبطال المملكة في الخطابة الارتجالية تويتر https://twitter.com/aafeef?s=11 https://twitter.com/bmyarabic?s=11 تيليجرام https://t.me/bmyarabic ------------------------------------------- سنتعرف في هذه الحلقة على: نموذج العمل الشخصي لتحميل النموذج https://drive.google.com/file/d/1zRCHUJ1j6I_L17GNMgAOrktX1lxoeG3q/view?usp=sharing ------------------------------------------- هذه الحلقة من انتاج مؤسسة #شبكة_لسن للتفاصيل والحجز https://www.lasin.net تويتر https://twitter.com/NetworkLasin انستجرام http','https://anchor.fm/s/4b64e74/podcast/play/48323503/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-1-28%2Fa0c28c20-cf6c-2a21-72a0-9a8660234717.mp3',5154,'2022-02-28T11:35:48'::timestamptz,0 FROM podcasts p WHERE p.title='لسن' AND NOT EXISTS (SELECT 1 FROM episodes e WHERE e.podcast_id=p.id AND e.audio_url='https://anchor.fm/s/4b64e74/podcast/play/48323503/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2022-1-28%2Fa0c28c20-cf6c-2a21-72a0-9a8660234717.mp3');

-- ========================================================================
-- 2) دعم المفضلة للحلقات
-- from: 20261125130000_add_episode_favorites.sql
-- ========================================================================
/*
  Add episode favorites support.
  - New table episode_favorites (user_id, episode_id)
  - RLS owner-scoped CRUD
  - Idempotent
*/


CREATE TABLE IF NOT EXISTS episode_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, episode_id)
);

ALTER TABLE episode_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_episode_favorites" ON episode_favorites;
CREATE POLICY "select_own_episode_favorites"
ON episode_favorites FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_episode_favorites" ON episode_favorites;
CREATE POLICY "insert_own_episode_favorites"
ON episode_favorites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_episode_favorites" ON episode_favorites;
CREATE POLICY "delete_own_episode_favorites"
ON episode_favorites FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_episode_favorites_user_id ON episode_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_favorites_episode_id ON episode_favorites(episode_id);

-- ========================================================================
-- 3) إصلاح صورة/صوت د. أحمد عبد المنعم
-- from: 20261125140000_fix_ahmed_abdelmoneim_media.sql
-- ========================================================================
/*
  Fix Ahmed Abdel Moneim media issues.
  - Replace broken SoundCloud avatar (404) with verified working avatar.
  - Upgrade http://archive.org audio URLs to https://archive.org to avoid mixed-content blocking.
    Scoped to Ahmed Abdel Moneim podcasts first, then applies safe global archive.org upgrade.
  Idempotent.
*/


-- Fix host photo (broken 404 URL observed in live DB)
UPDATE hosts
SET photo_url = 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
WHERE id = '05e7036b-03df-54a2-9223-166bffd1fe16'::uuid
  AND (
    photo_url IS DISTINCT FROM 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
  );

-- Safety: also fix by slug/name if id differs
UPDATE hosts
SET photo_url = 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg'
WHERE slug = 'ahmed-abdelmoneim'
  AND name_ar = 'د. أحمد عبد المنعم'
  AND photo_url IS DISTINCT FROM 'https://i1.sndcdn.com/avatars-000038390708-0tx7sk-t500x500.jpg';

-- Upgrade archive.org audio URLs for Ahmed Abdel Moneim episodes
UPDATE episodes e
SET audio_url = replace(e.audio_url, 'http://archive.org/', 'https://archive.org/')
FROM podcasts p
WHERE e.podcast_id = p.id
  AND p.host_name = 'د. أحمد عبد المنعم'
  AND e.audio_url LIKE 'http://archive.org/%';

-- Global safe fix: archive.org supports https; http can be blocked as mixed content in webviews/browsers
UPDATE episodes
SET audio_url = replace(audio_url, 'http://archive.org/', 'https://archive.org/')
WHERE audio_url LIKE 'http://archive.org/%';

-- ========================================================================
-- 4) مسارات التعلّم الاحترافية
-- from: 20261125150000_professional_learning_paths.sql
-- ========================================================================
-- Professional learning paths linked to real platform content
-- Idempotent: upserts by fixed path IDs and replaces their steps.
-- Run in Supabase SQL Editor after previous migrations.


-- Ensure RLS/policies exist for anon/authenticated read if missing (safe if already present)
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_paths' AND policyname='select_learning_paths'
  ) THEN
    CREATE POLICY select_learning_paths ON learning_paths FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_path_steps' AND policyname='select_path_steps'
  ) THEN
    CREATE POLICY select_path_steps ON learning_path_steps FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Helper: pick category id by Arabic name
-- 1) Career growth
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'مسار النمو المهني وبناء العادات',
  'رحلة عملية تساعدك تبني عادات مهنية ثابتة، وتحوّل الاستماع إلى تطبيق واضح خلال أسبوعك.',
  (SELECT id FROM categories WHERE name_ar = 'المسيرة المهنية' ORDER BY created_at LIMIT 1),
  4, 'beginner', '🚀'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000001'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000101'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,1,'استمع: عادة صغيرة تصنع فرقًا','ابدأ بحلقة قصيرة من بودكاست د. خالد المنيف، واختر عادة واحدة قابلة للتنفيذ فورًا.','podcast','a1f1e879-b9a0-464b-9611-5f535c10b3ee'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000102'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,2,'طبّق: عادة 10 دقائق','التزم بعادة واحدة لمدة 10 دقائق يوميًا لمدة 3 أيام. سجّل الوقت والنتيجة.','mission',NULL,NULL,'اختر عادة مرتبطة بهدف مهني واضح، وليس مجرد انشغال.',30),
('b1000001-0000-4000-8000-000000000103'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,3,'استمع: اصنع عاداتك','حلقة عملية تساعدك تفهم كيف تتحول النية إلى سلوك متكرر.','podcast','a09c8a56-cf02-4492-a655-a55c08ef9ed8'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000104'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,4,'تأمل: ما الذي يعطّلك؟','اكتب العائق الأساسي الذي يمنعك من الاستمرار، ثم حلًا واحدًا بسيطًا له.','reflection',NULL,NULL,'الاستمرارية أهم من الكمال. إذا فاتك يوم، ارجع في اليوم التالي.',15),
('b1000001-0000-4000-8000-000000000105'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,5,'استمع: تجربة وخبرة مهنية','استمع لمحادثة ملهمة من ABtalks واستخرج درسًا واحدًا تطبقه في عملك.','podcast','206dac80-f8ed-4639-91b1-a6b7c149f41f'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000106'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,6,'نصيحة: راجع تقدمك أسبوعيًا','خصص 10 دقائق نهاية الأسبوع لمراجعة ما نجح وما يحتاج تعديلًا.','tip',NULL,NULL,'اكتب إنجازًا واحدًا وعائقًا واحدًا وخطوة واحدة للأسبوع القادم.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 2) Financial awareness
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000002'::uuid,
  'مسار الوعي المالي الذكي',
  'افهم المال واتخذ قرارات أفضل من خلال حلقات عملية وخطوات تطبيق قصيرة.',
  (SELECT id FROM categories WHERE name_ar = 'المال والاستثمار' ORDER BY created_at LIMIT 1),
  4, 'beginner', '📊'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000002'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000201'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,1,'استمع: نظرة عملية على المال','ابدأ بحلقة من ترانزيت لتكوين صورة عملية عن المال والحياة اليومية.','podcast','beb43afd-9246-423a-a45e-c9980192b567'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000202'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,2,'طبّق: تتبع مصروفاتك','سجّل مصروفاتك لمدة 3 أيام بدون حكم. الهدف هو الوعي قبل التغيير.','mission',NULL,NULL,'قسّم المصروفات إلى: ضروري، مهم، يمكن تأجيله.',30),
('b1000001-0000-4000-8000-000000000203'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,3,'استمع: قرار مالي أفضل','استمع لحلقة من فنجان واستخرج فكرة واحدة عن اتخاذ القرار.','podcast','b033bb94-26c4-4aa9-846b-b0f6443203ff'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000204'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,4,'نصيحة: افصل الرغبة عن الحاجة','قبل الشراء اسأل نفسك: هل أحتاجه الآن؟ هل له بديل؟ هل سأندم؟','tip',NULL,NULL,'انتظر 24 ساعة قبل أي شراء غير ضروري.',10),
('b1000001-0000-4000-8000-000000000205'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,5,'استمع: المال والأعمال','حلقة من Mix Business توسّع فهمك للمال والعمل.','podcast','0cae0ae6-d000-4d64-bd10-cef4a87b6dd1'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000206'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,6,'تأمل: قرار مالي هذا الأسبوع','ما قرار مالي صغير يمكنك اتخاذه هذا الأسبوع ليحسن وضعك؟','reflection',NULL,NULL,'التحسن المالي يبدأ بقرار صغير متكرر.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 3) Healthy balanced life
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000003'::uuid,
  'مسار الصحة والعافية المتوازنة',
  'خطوات واقعية لتحسين صحتك الجسدية ونمط حياتك مع محتوى مسموع قابل للتطبيق.',
  (SELECT id FROM categories WHERE name_ar = 'الصحة واللياقة' ORDER BY created_at LIMIT 1),
  3, 'beginner', '🌿'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000003'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000301'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,1,'استمع: ابدأ بعافية أفضل','حلقة من "عيشها صح" تضعك في مزاج صحي عملي.','podcast','7a23cc99-bb1b-4519-8625-721743e7bdba'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000302'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,2,'طبّق: حركة 15 دقيقة','امشِ أو تحرك لمدة 15 دقيقة اليوم. اجعلها سهلة بما يكفي لتتكرر.','mission',NULL,NULL,'اربط الحركة بموعد ثابت بعد صلاة أو قبل النوم.',25),
('b1000001-0000-4000-8000-000000000303'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,3,'استمع: طاقة وحركة','حلقة من بودكاست الجولة تمنحك دفعة نشاط.','podcast','7b499d61-470c-438d-9806-106bd74393ec'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000304'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,4,'نصيحة: النظام الصغير ينتصر','لا تبحث عن خطة مثالية؛ ابحث عن خطة تستطيع الالتزام بها.','tip',NULL,NULL,'الاستمرارية على القليل أفضل من الحماس الذي ينقطع.',10),
('b1000001-0000-4000-8000-000000000305'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,5,'استمع: الجانب النفسي للحركة','استمع لحلقة من أثير الكرة حول العامل النفسي وتأثيره على الأداء.','podcast','2268c81c-0152-442e-9fe1-af7abc821483'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000306'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,6,'تأمل: عادة صحية واحدة','ما العادة الصحية الأسهل التي يمكنك تثبيتها هذا الأسبوع؟','reflection',NULL,NULL,'اختر عادة واحدة فقط، وامنحها فرصة 7 أيام.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 4) Mental calm
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000004'::uuid,
  'مسار الطمأنينة والصحة النفسية',
  'مسار هادئ لفهم المشاعر، تخفيف الضغط، وبناء عادة مراجعة داخلية بسيطة.',
  (SELECT id FROM categories WHERE name_ar = 'الصحة النفسية' ORDER BY created_at LIMIT 1),
  4, 'beginner', '💙'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000004'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000401'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,1,'استمع: فهم المشاعر','ابدأ بحلقة من "نفسيتي" لفهم أثر المشاعر والتجارب على حياتك.','podcast','acd3c9b3-ad2f-470e-85c0-4038ff268a7f'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000402'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,2,'طبّق: 5 دقائق هدوء','خصص 5 دقائق بعيدًا عن الشاشة للتنفس الهادئ أو الجلوس دون تشتيت.','mission',NULL,NULL,'ضع المنبه على 5 دقائق فقط؛ البداية الصغيرة أسهل.',25),
('b1000001-0000-4000-8000-000000000403'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,3,'استمع: عندما يشتد القلق','حلقة تساعدك تميز الأفكار المقلقة وتتعامل معها بوعي.','podcast','6e9713f9-49b9-417d-8e2c-adab595423cc'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000404'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,4,'تأمل: سمِّ الشعور','اكتب الشعور الذي يزورك كثيرًا هذه الأيام، ومتى يظهر، وما الذي يخففه.','reflection',NULL,NULL,'تسمية الشعور بدقة خطوة أولى للسيطرة عليه.',15),
('b1000001-0000-4000-8000-000000000405'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,5,'نصيحة: الراحة جزء من الإنتاج','لا تؤجل الراحة حتى الإرهاق. ضع حدًا بسيطًا للتوقف اليومي.','tip',NULL,NULL,'راحة قصيرة يوميًا أفضل من انهيار طويل لاحقًا.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 5) Spiritual balance
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000005'::uuid,
  'مسار الروحانية والاتزان',
  'رحلة هادئة تجمع الاستماع والتطبيق والتأمل لبناء اتزان روحي يومي.',
  (SELECT id FROM categories WHERE name_ar = 'روحاني / ديني' ORDER BY created_at LIMIT 1),
  4, 'beginner', '🕌'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000005'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000501'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,1,'استمع: بداية هادئة','ابدأ بحلقة من السراج المنير في وقت هادئ بعيدًا عن المشتتات.','podcast','64d46333-17cb-490c-8462-310ea563c502'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000502'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,2,'طبّق: ورد يومي بسيط','حدد وردًا بسيطًا يمكنك الالتزام به لمدة 7 أيام.','mission',NULL,NULL,'اجعل الورد صغيرًا وثابتًا: دقائق معدودة تكفي.',25),
('b1000001-0000-4000-8000-000000000503'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,3,'استمع: استمرارية','حلقة أخرى تعزز الثبات والمعنى.','podcast','1babc486-23e6-45b9-8785-de89981f1c94'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000504'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,4,'تأمل: ما الذي يقربك؟','اكتب عادة روحية واحدة تشعر أنها تقربك وتريد تثبيتها.','reflection',NULL,NULL,'الثبات على القليل خير من الانقطاع بعد الكثير.',15),
('b1000001-0000-4000-8000-000000000505'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,5,'نصيحة: اجعلها بعد عادة ثابتة','اربط وردك بموعد ثابت مثل بعد صلاة أو قبل النوم.','tip',NULL,NULL,'الموعد الثابت يجعل الاستمرار أسهل.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 6) Culture and knowledge
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000006'::uuid,
  'مسار الثقافة والمعرفة اليومية',
  'وسّع أفقك بمعرفة وثقافة عربية متنوعة، مع خطوات استماع وتلخيص وتأمل.',
  (SELECT id FROM categories WHERE name_ar = 'ثقافة وأدب' ORDER BY created_at LIMIT 1),
  3, 'beginner', '📖'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000006'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000601'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,1,'استمع: فكرة من كتاب/معرفة','ابدأ بحلقة من ساندوتش ورقي واستخرج فكرة واحدة مفيدة.','podcast','8f25a400-acd9-48c8-8be1-562ca8bae138'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000602'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,2,'طبّق: لخص في 3 جمل','اكتب: الفكرة، لماذا تهمك، وكيف ستطبقها.','mission',NULL,NULL,'التلخيص القصير يحول الاستماع إلى معرفة.',25),
('b1000001-0000-4000-8000-000000000603'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,3,'استمع: حوار يوسع الأفق','استمع لحلقة من "استشارة مع سارة" ولاحظ طريقة طرح الأسئلة.','podcast','73a3fd1b-6af7-4584-baca-67de71a3c2d3'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000604'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,4,'استمع: اسأل بشكل أفضل','حلقة ثانية تمنحك زاوية مختلفة حول التفكير والحوار.','podcast','e6c68291-a456-48d8-8605-c45592124f07'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000605'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,5,'تأمل: فكرة غيّرت نظرتك','ما الفكرة التي سمعتها مؤخرًا وتستحق أن تطبقها؟','reflection',NULL,NULL,'المعرفة بلا تطبيق تبقى معلومة فقط.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 7) Relationships & family
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000007'::uuid,
  'مسار العلاقات والتواصل الأسري',
  'حسّن جودة علاقاتك عبر الاستماع الواعي، التطبيق العملي، والتأمل في المواقف اليومية.',
  (SELECT id FROM categories WHERE name_ar = 'العلاقات والأسرة' ORDER BY created_at LIMIT 1),
  3, 'intermediate', '💬'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000007'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000701'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,1,'استمع: فهم منظور مختلف','استمع لحلقة من "بداية الحكاية" وافهم كيف تتشكل القصة خلف السلوك.','podcast','873bdb9e-bde7-4b83-bddf-612ed702389b'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000702'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,2,'طبّق: استماع بدون مقاطعة','في محادثة اليوم، استمع 3 دقائق كاملة قبل الرد.','mission',NULL,NULL,'هدفك أن تفهم، ليس أن تفوز بالنقاش.',30),
('b1000001-0000-4000-8000-000000000703'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,3,'استمع: قصة وتعلّم','حلقة أخرى تذكرك أن خلف كل موقف سياقًا إنسانيًا.','podcast','13ae9228-3d01-4a2f-af5d-77e87aeddc49'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000704'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,4,'تأمل: علاقة تريد تحسينها','ما علاقة واحدة تريد تحسينها هذا الأسبوع؟ وما أول خطوة صغيرة؟','reflection',NULL,NULL,'ابدأ بسؤال صادق بدل افتراض.',15),
('b1000001-0000-4000-8000-000000000705'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,5,'نصيحة: وضّح لا تفترض','الافتراضات تفسد العلاقات؛ الوضوح اللطيف يحميها.','tip',NULL,NULL,'استخدم عبارة: "أريد أفهم قصدك أكثر".',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 8) Leadership & communication
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000008'::uuid,
  'مسار القيادة وفن التواصل',
  'طوّر حضورك القيادي وأسلوب تواصلك من خلال محتوى عربي وخطوات تطبيق عملية.',
  (SELECT id FROM categories WHERE name_ar = 'القيادة' ORDER BY created_at LIMIT 1),
  4, 'intermediate', '🎙️'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000008'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000801'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,1,'استمع: تعلم من خبرة','استمع لحلقة من ABtalks ولاحظ كيف يُبنى الحوار العميق.','podcast','8d0a3149-f0ab-4478-b3c5-77eb40e20edc'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000802'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,2,'طبّق: سؤال أفضل','في اجتماع أو محادثة، اسأل سؤالًا مفتوحًا واحدًا بدل إعطاء رأي سريع.','mission',NULL,NULL,'الأسئلة الجيدة علامة قيادة، لا ضعف.',30),
('b1000001-0000-4000-8000-000000000803'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,3,'استمع: قرار وتأثير','حلقة من فنجان عن الجامعات والمستقبل تمنحك زاوية تفكير قيادية.','podcast','1c36be5c-8cef-4b05-a292-9edeb78bfc9a'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000804'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,4,'تأمل: أسلوب تأثيرك','كيف تؤثر عادة: بالأوامر، بالقدوة، أم بالأسئلة؟ وما الذي تريد تطويره؟','reflection',NULL,NULL,'القائد الجيد يوضح الهدف ويستمع قبل أن يقرر.',15),
('b1000001-0000-4000-8000-000000000805'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,5,'نصيحة: تواصل واضح','اجعل رسالتك قصيرة: السياق، المطلوب، والموعد.','tip',NULL,NULL,'الوضوح يوفر وقت الفريق ويقلل الاحتكاك.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- Ensure guests can read public learning paths (the app queries them as anon too).
DO $$
BEGIN
  IF to_regclass('public.learning_paths') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.learning_paths TO anon, authenticated';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='learning_paths'
        AND policyname='select_learning_paths_anon'
    ) THEN
      EXECUTE 'CREATE POLICY select_learning_paths_anon ON public.learning_paths FOR SELECT TO anon USING (true)';
    END IF;
  END IF;

  IF to_regclass('public.learning_path_steps') IS NOT NULL THEN
    EXECUTE 'GRANT SELECT ON public.learning_path_steps TO anon, authenticated';
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='learning_path_steps'
        AND policyname='select_path_steps_anon'
    ) THEN
      EXECUTE 'CREATE POLICY select_path_steps_anon ON public.learning_path_steps FOR SELECT TO anon USING (true)';
    END IF;
  END IF;
END $$;


-- ========================================================================
-- 5) إزالة مصطفى حسني نهائياً
-- from: 20261125153000_remove_mustafa_hosny.sql
-- ========================================================================
-- Remove Mustafa Hosny presenter and all related content from catalog.
-- Idempotent. Run in Supabase SQL Editor.


DO $$
DECLARE
  v_host_id uuid := 'abe32afe-c6ba-4ebe-8b6f-5fc72afc3868'::uuid;
  v_podcast_ids uuid[] := ARRAY[
    '051ca534-aa82-4afb-866e-e376cf205918'::uuid,
    '69b1d3af-b52f-4f57-8161-e51fc0e9bb54'::uuid,
    '61af2925-a46b-42a0-904e-12df31895cca'::uuid,
    'c63dd2bb-6419-4fc8-884e-04cb319dd798'::uuid,
    '0fd27932-c467-4364-bf52-5837c44abc04'::uuid,
    '26e03615-7cfe-4aaa-b64b-b0ca39b746c2'::uuid,
    '4457247b-2edd-4286-a987-b0e6564a406d'::uuid,
    'd47cbf98-c2ec-439e-a973-3235451838e0'::uuid,
    '767fb90d-c94a-4a35-bd85-70713d64cc9b'::uuid,
    'a92c1fe1-b68d-4dd0-b013-c35b6b822c5c'::uuid
  ];
  v_episode_ids uuid[];
BEGIN
  SELECT COALESCE(array_agg(e.id), ARRAY[]::uuid[]) INTO v_episode_ids
  FROM episodes e
  WHERE e.podcast_id = ANY(v_podcast_ids);

  -- Dependent user/content rows
  DELETE FROM episode_favorites ef WHERE ef.episode_id = ANY(v_episode_ids);
  DELETE FROM listening_history lh WHERE lh.episode_id = ANY(v_episode_ids);
  DELETE FROM user_path_step_progress ups
  USING learning_path_steps lps
  WHERE ups.step_id = lps.id AND lps.linked_episode_id = ANY(v_episode_ids);

  UPDATE learning_path_steps SET linked_episode_id = NULL WHERE linked_episode_id = ANY(v_episode_ids);

  DELETE FROM favorites f WHERE f.podcast_id = ANY(v_podcast_ids);
  DELETE FROM episodes e WHERE e.podcast_id = ANY(v_podcast_ids);
  DELETE FROM podcasts p WHERE p.id = ANY(v_podcast_ids) OR p.host_id = v_host_id;

  -- Host follows/references if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='host_follows') THEN
    EXECUTE 'DELETE FROM host_follows WHERE host_id = $1' USING v_host_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_followed_hosts') THEN
    EXECUTE 'DELETE FROM user_followed_hosts WHERE host_id = $1' USING v_host_id;
  END IF;

  DELETE FROM hosts h WHERE h.id = v_host_id OR h.slug = 'mustafa-hosny';
END $$;

-- ========================================================================
-- 6) توحيد ياسر الحزيمي
-- from: 20261125160000_dedupe_yasser_hazimi.sql
-- ========================================================================
-- Dedupe Yasser Al Hazimi: keep full host (yasser-hizimi), remove duplicate host/podcast.
-- Idempotent. Run in Supabase SQL Editor.


DO $$
DECLARE
  v_keep_host uuid := '75474ef0-7037-4424-b0c2-23c22d94dda9'::uuid; -- yasser-hizimi
  v_dup_host  uuid := '998f0385-c2d2-470e-9ba0-d43b614df3f5'::uuid; -- yasser-alhazimi
  v_dup_pod   uuid := 'a3875752-ce56-4ede-847c-05332ae7b483'::uuid; -- duplicate "دورة الشخصية القوية"
  v_keep_pod  uuid := 'b4a07d09-39a2-4e34-9c2a-e04215eb455f'::uuid; -- canonical under keep host
BEGIN
  -- Move any non-duplicate podcasts from duplicate host to keep host (defensive)
  UPDATE podcasts
  SET host_id = v_keep_host,
      host_name = COALESCE(NULLIF(host_name, ''), 'ياسر الحزيمي')
  WHERE host_id = v_dup_host
    AND id <> v_dup_pod
    AND NOT EXISTS (SELECT 1 FROM podcasts p2 WHERE p2.id = podcasts.id AND p2.host_id = v_keep_host);

  -- Remap duplicate-episode references to canonical episodes by normalized title within keep podcast
  IF EXISTS (SELECT 1 FROM podcasts WHERE id = v_keep_pod) AND EXISTS (SELECT 1 FROM podcasts WHERE id = v_dup_pod) THEN
    -- listening_history
    UPDATE listening_history lh
    SET episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE lh.episode_id = dep.id
      AND dep.podcast_id = v_dup_pod
      AND NOT EXISTS (
        SELECT 1 FROM listening_history lh2
        WHERE lh2.user_id = lh.user_id AND lh2.episode_id = kep.id
      );

    DELETE FROM listening_history lh
    USING episodes dep
    WHERE lh.episode_id = dep.id AND dep.podcast_id = v_dup_pod;

    -- episode_favorites
    UPDATE episode_favorites ef
    SET episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE ef.episode_id = dep.id
      AND dep.podcast_id = v_dup_pod
      AND NOT EXISTS (
        SELECT 1 FROM episode_favorites ef2
        WHERE ef2.user_id = ef.user_id AND ef2.episode_id = kep.id
      );

    DELETE FROM episode_favorites ef
    USING episodes dep
    WHERE ef.episode_id = dep.id AND dep.podcast_id = v_dup_pod;

    -- learning_path_steps linked episodes
    UPDATE learning_path_steps lps
    SET linked_episode_id = kep.id
    FROM episodes dep
    JOIN episodes kep
      ON kep.podcast_id = v_keep_pod
     AND btrim(regexp_replace(kep.title, '\s+', ' ', 'g')) = btrim(regexp_replace(dep.title, '\s+', ' ', 'g'))
    WHERE lps.linked_episode_id = dep.id
      AND dep.podcast_id = v_dup_pod;

    UPDATE learning_path_steps lps
    SET linked_episode_id = NULL
    FROM episodes dep
    WHERE lps.linked_episode_id = dep.id
      AND dep.podcast_id = v_dup_pod;
  END IF;

  -- Favorites on duplicate podcast: move to canonical if missing, else delete
  UPDATE favorites f
  SET podcast_id = v_keep_pod
  WHERE f.podcast_id = v_dup_pod
    AND NOT EXISTS (
      SELECT 1 FROM favorites f2 WHERE f2.user_id = f.user_id AND f2.podcast_id = v_keep_pod
    );
  DELETE FROM favorites WHERE podcast_id = v_dup_pod;

  -- Host follows: move dup host followers to keep host
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='host_follows') THEN
    EXECUTE '
      INSERT INTO host_follows (user_id, host_id, created_at)
      SELECT user_id, $1, created_at
      FROM host_follows WHERE host_id = $2
      ON CONFLICT DO NOTHING
    ' USING v_keep_host, v_dup_host;
    EXECUTE 'DELETE FROM host_follows WHERE host_id = $1' USING v_dup_host;
  END IF;

  -- Remove duplicate podcast episodes/podcast
  DELETE FROM episodes WHERE podcast_id = v_dup_pod;
  DELETE FROM podcasts WHERE id = v_dup_pod;

  -- Any remaining podcasts under dup host: reassign to keep host
  UPDATE podcasts SET host_id = v_keep_host, host_name = COALESCE(NULLIF(host_name,''),'ياسر الحزيمي') WHERE host_id = v_dup_host;

  -- Remove duplicate host
  DELETE FROM hosts WHERE id = v_dup_host;

  -- Normalize keep host display
  UPDATE hosts
  SET name_ar = 'ياسر الحزيمي',
      slug = 'yasser-hizimi',
      title_ar = COALESCE(NULLIF(title_ar,''), 'كاتب ومتحدث'),
      specialty_ar = COALESCE(NULLIF(specialty_ar,''), 'القيادة وتطوير الذات')
  WHERE id = v_keep_host;
END $$;

-- ========================================================================
-- 7) إصلاح صور عبد الرحمن منصور
-- from: 20261125161000_fix_abdulrahman_mansour_images.sql
-- ========================================================================
-- Fix Abdulrahman Mansour presenter/profile/podcast images.
-- Idempotent. Run in Supabase SQL Editor.


DO $$
DECLARE
  v_host_id uuid := 'aba0b879-52a6-585e-9f37-d15d8d266b87'::uuid;
  v_photo text := 'https://graph.facebook.com/dr.abdelrahmenmansour/picture?width=720&height=720';
  v_cover text := 'https://graph.facebook.com/dr.abdelrahmenmansour/picture?width=1200&height=630';
BEGIN
  UPDATE hosts
  SET photo_url = v_photo,
      cover_url = v_cover
  WHERE id = v_host_id OR slug = 'abdulrahman-mansour';

  -- Replace generic Islamweb logo on all his podcasts/episodes-related podcast covers
  UPDATE podcasts
  SET cover_url = v_photo
  WHERE host_id = v_host_id
     OR (host_name = 'عبد الرحمن منصور' AND cover_url = 'https://audio.islamweb.net/media/contentver3/img/logo.png');
END $$;

COMMIT;
