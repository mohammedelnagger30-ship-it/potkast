/*
  # Seed comedy, communication, leadership, improv, and cybersecurity hosts

  Adds famous podcast hosts requested by user:
  - Comedy: Joe Rogan, Conan O'Brien, Bill Burr
  - Communication: Matt Abrahams, Celeste Headlee
  - Leadership: Simon Sinek, Jocko Willink, Brené Brown
  - Improv: Scott Aukerman, Matt Besser
  - Cybersecurity: Ibrahim Hegazy

  Idempotent: guarded by host slug and podcast title checks.
*/

DO $$
DECLARE
  v_audio text := 'https://www.buzzsprout.com/2196707/episodes/20137689-84.mp3';
  v_cat_culture    uuid;
  v_cat_career     uuid;
  v_cat_leadership uuid;
  v_cat_tech       uuid;
  v_cat_mental     uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_tech       FROM categories WHERE name_ar = 'التقنية' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;

  -- ==================== Joe Rogan (Comedy) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'joe-rogan') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'جو روغان', 'joe-rogan',
      'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/joe-rogan-cover/1200/400',
      'مقدّم بودكاست', 'كوميديا وحوارات طويلة',
      'جو روغان كوميديان ومقدّم واحد من أشهر البودكاستات في العالم، معروف بحواراته المفتوحة مع شخصيات من مجالات مختلفة، وأسلوبه الصريح الذي يمزج الكوميديا بالفضول.',
      'الولايات المتحدة', v_cat_culture, true, 18500000,
      '{"youtube":"https://www.youtube.com/@joerogan","spotify":"https://open.spotify.com/show/4rOoJ6Egrf8K2IrywzwOMk","website":"https://www.joerogan.com"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'The Joe Rogan Experience', 'حوارات طويلة تجمع الكوميديا والعلوم والثقافة والقصص الشخصية مع ضيوف من كل المجالات.',
      v_host_id, v_cat_culture, 'comedy',
      'https://picsum.photos/seed/pod-jre/400/400', 'intermediate', 95000000, 4.8
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Comedy, Curiosity, and Long Conversations', 'حلقة عن سر الحوارات الطويلة وكيف تصنع الكوميديا مساحة صادقة للنقاش.', v_audio, 7200, now() - interval '14 days', 3200000),
      (v_pod_id, 'Stand-Up, Discipline, and Staying Sharp', 'نقاش حول الانضباط خلف الكوميديا وكيف يحافظ الكوميديان على حدّته.', v_audio, 6840, now() - interval '21 days', 2800000),
      (v_pod_id, 'Funny Stories from the Road', 'قصص كوميدية من خلف الكواليس في جولات الستاند أب.', v_audio, 6600, now() - interval '28 days', 2500000),
      (v_pod_id, 'The Art of Honest Conversation', 'كيف تجعل الحوار ممتعًا وعميقًا بدون فقدان روح الفكاهة.', v_audio, 7020, now() - interval '35 days', 2400000);
  END IF;

  -- ==================== Conan O'Brien (Comedy) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'conan-obrien') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'كونان أوبراين', 'conan-obrien',
      'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/conan-cover/1200/400',
      'كوميديان ومقدّم', 'كوميديا وحوارات',
      'كونان أوبراين أسطورة الكوميديا التلفزيونية الأمريكية، مقدّم Conan O''Brien Needs a Friend، معروف بذكائه السريع وروحه المرحة وقدرته على جعل أي ضيف يضحك.',
      'الولايات المتحدة', v_cat_culture, true, 9200000,
      '{"youtube":"https://www.youtube.com/@TeamCoco","spotify":"https://open.spotify.com/show/3u26tlz7A3WyWRtXliX9a9","website":"https://teamcoco.com"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Conan O''Brien Needs a Friend', 'كونان يبحث عن أصدقاء حقيقيين عبر حوارات كوميدية ذكية مع نجوم العالم.',
      v_host_id, v_cat_culture, 'comedy',
      'https://picsum.photos/seed/pod-conan/400/400', 'beginner', 28000000, 4.9
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Finding Humor in Everyday Life', 'كيف تتحول المواقف اليومية العادية إلى مادة كوميدية ذهبية.', v_audio, 3600, now() - interval '10 days', 1900000),
      (v_pod_id, 'The Smartest Joke in the Room', 'كونان يتحدث عن الذكاء الكوميدي والتوقيت وأهمية الإصغاء.', v_audio, 3480, now() - interval '17 days', 1700000),
      (v_pod_id, 'Awkward Moments, Big Laughs', 'لماذا اللحظات المحرجة هي أفضل وقود للكوميديا؟', v_audio, 3300, now() - interval '24 days', 1600000),
      (v_pod_id, 'Friendship, Fame, and Funny Stories', 'حوارات صادقة ومضحكة عن الشهرة والصداقة.', v_audio, 3540, now() - interval '31 days', 1500000);
  END IF;

  -- ==================== Bill Burr (Comedy) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'bill-burr') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'بيل بير', 'bill-burr',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/bill-burr-cover/1200/400',
      'كوميديان', 'ستاند أب وكوميديا صريحة',
      'بيل بير أحد أقوى كوميديي الستاند أب في العالم، معروف بأسلوبه الصريح والمباشر وتعليقاته الكوميدية على الحياة والمجتمع والرياضة.',
      'الولايات المتحدة', v_cat_culture, true, 6100000,
      '{"youtube":"https://www.youtube.com/@BillBurrOfficial","spotify":"https://open.spotify.com/show/1T5bKJdXZZ1oV5i6Qk6YQH","website":"https://billburr.com"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Monday Morning Podcast', 'بيل بير يعلق بشكل كوميدي وصريح على الأحداث اليومية وتجارب الحياة.',
      v_host_id, v_cat_culture, 'comedy',
      'https://picsum.photos/seed/pod-bill-burr/400/400', 'intermediate', 19000000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Rants, Laughs, and Real Talk', 'كوميديا صريحة عن ضغوط الحياة اليومية وكيف تضحك منها.', v_audio, 3900, now() - interval '8 days', 1400000),
      (v_pod_id, 'Sports, Stress, and Stand-Up', 'تعليقات ساخرة على الرياضة والمواقف الاجتماعية.', v_audio, 3720, now() - interval '15 days', 1250000),
      (v_pod_id, 'The Honest Comedian', 'لماذا الصراحة هي أقوى أداة في الكوميديا؟', v_audio, 3600, now() - interval '22 days', 1180000),
      (v_pod_id, 'Turning Frustration into Comedy', 'كيف تتحول الإحباطات اليومية إلى مادة كوميدية.', v_audio, 3840, now() - interval '29 days', 1100000);
  END IF;

  -- ==================== Matt Abrahams (Communication) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'matt-abrahams') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'مات أبراهامز', 'matt-abrahams',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/matt-abrahams-cover/1200/400',
      'خبير تواصل', 'فن التواصل والتحدث',
      'مات أبراهامز خبير التواصل ومتحدث في Stanford GSB، ومقدم بودكاست Think Fast, Talk Smart، يساعد الناس على التحدث بوضوح وثقة في المواقف الصعبة.',
      'الولايات المتحدة', v_cat_career, true, 2400000,
      '{"website":"https://www.mattabrahams.com","spotify":"https://open.spotify.com/show/6ll0MwobDt1JW9gYaOONEo","linkedin":"https://www.linkedin.com/in/maabrahams/"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Think Fast, Talk Smart', 'أدوات عملية لتحسين التواصل، الإلقاء، والتحدث المرتجل بثقة.',
      v_host_id, v_cat_career, 'communication',
      'https://picsum.photos/seed/pod-matt-abrahams/400/400', 'beginner', 16000000, 4.9
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Speak with Confidence Under Pressure', 'كيف تحافظ على هدوئك وتوصل فكرتك بوضوح تحت الضغط.', v_audio, 1680, now() - interval '7 days', 980000),
      (v_pod_id, 'The Power of Clear Messaging', 'رسالتك القوية تبدأ من البساطة والتركيز.', v_audio, 1560, now() - interval '14 days', 910000),
      (v_pod_id, 'How to Handle Tough Questions', 'تقنيات عملية للإجابة على الأسئلة المفاجئة بذكاء.', v_audio, 1620, now() - interval '21 days', 870000),
      (v_pod_id, 'Better Conversations at Work', 'مهارات التواصل التي تجعل اجتماعاتك وعلاقاتك المهنية أفضل.', v_audio, 1500, now() - interval '28 days', 840000);
  END IF;

  -- ==================== Celeste Headlee (Communication) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'celeste-headlee') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'سيليست هيدلي', 'celeste-headlee',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/celeste-headlee-cover/1200/400',
      'صحفية وخبيرة تواصل', 'فن الحوار والاستماع',
      'سيليست هيدلي صحفية ومؤلفة ومتحدثة شهيرة، معروفة بعملها حول فن المحادثة والاستماع، وبقدرتها على تعليم الناس التواصل الإنساني العميق.',
      'الولايات المتحدة', v_cat_career, true, 1800000,
      '{"website":"https://www.celesteheadlee.com","youtube":"https://www.youtube.com/@CelesteHeadlee"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'We Need To Talk', 'كيف نحسن الحوار، نسمع بعمق، ونتواصل بإنسانية في عالم مشتت.',
      v_host_id, v_cat_career, 'communication',
      'https://picsum.photos/seed/pod-celeste/400/400', 'beginner', 7200000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'The Lost Art of Listening', 'لماذا أصبح الاستماع الحقيقي مهارة نادرة وقوية؟', v_audio, 1800, now() - interval '9 days', 620000),
      (v_pod_id, 'How to Have Better Conversations', 'قواعد بسيطة تجعل حواراتك أكثر وضوحًا وتأثيرًا.', v_audio, 1740, now() - interval '16 days', 590000),
      (v_pod_id, 'Talking Across Differences', 'كيف تتواصل باحترام حتى عندما تختلف مع الآخرين.', v_audio, 1860, now() - interval '23 days', 560000),
      (v_pod_id, 'Presence in Communication', 'التواجد الذهني هو سر التواصل الفعال.', v_audio, 1680, now() - interval '30 days', 530000);
  END IF;

  -- ==================== Simon Sinek (Leadership) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'simon-sinek') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'سايمون سينك', 'simon-sinek',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/simon-sinek-cover/1200/400',
      'كاتب وقائد فكري', 'القيادة والإلهام',
      'سايمون سينك كاتب ومتحدث عالمي، مشهور بفكرة Start With Why، وأحد أبرز الأصوات في القيادة وبناء الثقة والثقافة المؤسسية.',
      'المملكة المتحدة', v_cat_leadership, true, 7600000,
      '{"youtube":"https://www.youtube.com/@SimonSinek","website":"https://simonsinek.com","spotify":"https://open.spotify.com/show/4bUQCrHqFHEhWbFt0iX5Pq"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'A Bit of Optimism', 'حوارات قيادية ملهمة عن الثقة، الهدف، والعمل الإنساني.',
      v_host_id, v_cat_leadership, 'leadership',
      'https://picsum.photos/seed/pod-simon-sinek/400/400', 'beginner', 22000000, 4.8
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Start With Why in Leadership', 'القائد العظيم يبدأ من "لماذا" قبل "كيف" و"ماذا".', v_audio, 2400, now() - interval '11 days', 1800000),
      (v_pod_id, 'Building Trust in Teams', 'الثقة ليست شعارًا، بل ممارسة يومية من القائد.', v_audio, 2280, now() - interval '18 days', 1650000),
      (v_pod_id, 'Courageous Leadership', 'القيادة تتطلب شجاعة في القرارات الصعبة.', v_audio, 2340, now() - interval '25 days', 1570000),
      (v_pod_id, 'The Infinite Game', 'كيف يفكر القادة الناجحون بمنظور طويل المدى.', v_audio, 2460, now() - interval '32 days', 1490000);
  END IF;

  -- ==================== Jocko Willink (Leadership) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'jocko-willink') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'جوكو ويلينك', 'jocko-willink',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/jocko-cover/1200/400',
      'قائد ومؤلف', 'القيادة والانضباط',
      'جوكو ويلينك ضابط سابق في Navy SEALs، ومؤلف ومقدّم بودكاست Jocko Podcast، مشهور بفلسفته القوية حول الانضباط، المسؤولية، والقيادة.',
      'الولايات المتحدة', v_cat_leadership, true, 5400000,
      '{"youtube":"https://www.youtube.com/@JockoPodcastOfficial","website":"https://jocko.com","spotify":"https://open.spotify.com/show/7ir1cCw3e8N6gE9q6W4XwS"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Jocko Podcast', 'دروس في القيادة والانضباط والمسؤولية من الخبرة الميدانية والحياة.',
      v_host_id, v_cat_leadership, 'leadership',
      'https://picsum.photos/seed/pod-jocko/400/400', 'intermediate', 26000000, 4.8
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Extreme Ownership', 'القائد الحقيقي يتحمل المسؤولية كاملة بدلًا من البحث عن أعذار.', v_audio, 5400, now() - interval '12 days', 2100000),
      (v_pod_id, 'Discipline Equals Freedom', 'كيف يصنع الانضباط حرية حقيقية في العمل والحياة.', v_audio, 5100, now() - interval '19 days', 1950000),
      (v_pod_id, 'Leading Under Pressure', 'اتخاذ القرار عندما تكون المخاطر عالية والوقت ضيق.', v_audio, 5280, now() - interval '26 days', 1840000),
      (v_pod_id, 'Building Strong Teams', 'فرق قوية تُبنى بالثقة والمعايير الواضحة.', v_audio, 4980, now() - interval '33 days', 1730000);
  END IF;

  -- ==================== Brené Brown (Leadership) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'brene-brown') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'برينيه براون', 'brene-brown',
      'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/brene-brown-cover/1200/400',
      'باحثة ومؤلفة', 'القيادة الشجاعة',
      'برينيه براون باحثة ومؤلفة شهيرة، معروف عالمياً بأعمالها حول الشجاعة، الضعف، والثقة، ومقدمة Dare to Lead أحد أهم بودكاستات القيادة.',
      'الولايات المتحدة', v_cat_leadership, true, 6900000,
      '{"website":"https://brenebrown.com","spotify":"https://open.spotify.com/show/3oEPsPKDhPVoNNL7pH5db6","youtube":"https://www.youtube.com/@BreneBrown"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Dare to Lead', 'القيادة الشجاعة تبدأ بالوضوح، التعاطف، والقدرة على المحادثات الصعبة.',
      v_host_id, v_cat_leadership, 'leadership',
      'https://picsum.photos/seed/pod-brene-brown/400/400', 'beginner', 18000000, 4.9
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Vulnerability as Strength', 'لماذا الشجاعة الحقيقية تتطلب أن تكون واضحًا وصادقًا.', v_audio, 2700, now() - interval '13 days', 1500000),
      (v_pod_id, 'Brave Conversations', 'كيف تقود محادثات صعبة بدون فقدان الإنسانية.', v_audio, 2580, now() - interval '20 days', 1380000),
      (v_pod_id, 'Trust and Empathy at Work', 'الثقة والتعاطف أساس ثقافة الفريق الصحية.', v_audio, 2640, now() - interval '27 days', 1310000),
      (v_pod_id, 'Values-Driven Leadership', 'القائد الواضح القيم يصنع قرارات أقوى.', v_audio, 2520, now() - interval '34 days', 1240000);
  END IF;

  -- ==================== Scott Aukerman (Improv) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'scott-aukerman') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'سكوت أوكرمان', 'scott-aukerman',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/scott-aukerman-cover/1200/400',
      'كوميديان ومقدّم', 'كوميديا ارتجالية',
      'سكوت أوكرمان كوميديان وكاتب ومقدّم Comedy Bang! Bang!، أحد أهم الأسماء في الكوميديا الارتجالية الحديثة وصناعة البودكاست الكوميدي.',
      'الولايات المتحدة', v_cat_culture, true, 2100000,
      '{"website":"https://www.comedybangbang.com","spotify":"https://open.spotify.com/show/0GRO8Cq6QkN0M6fZ7k6Z2F"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Comedy Bang! Bang!', 'بودكاست ارتجالي أسطوري يمزج المقابلات بالشخصيات الكوميدية والعفوية الكاملة.',
      v_host_id, v_cat_culture, 'improv',
      'https://picsum.photos/seed/pod-cbb/400/400', 'intermediate', 14000000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Improv Chaos and Character Comedy', 'كيف تتحول فكرة بسيطة إلى مشهد ارتجالي كوميدي كامل.', v_audio, 3900, now() - interval '6 days', 980000),
      (v_pod_id, 'Yes, And: The Improv Engine', 'قاعدة "نعم، و..." وكيف تبني عوالم كوميدية في لحظتها.', v_audio, 3720, now() - interval '13 days', 920000),
      (v_pod_id, 'Building Scenes on the Fly', 'فن بناء المشهد الارتجالي مع شخصيات غير متوقعة.', v_audio, 3840, now() - interval '20 days', 880000),
      (v_pod_id, 'The Freedom of Spontaneous Comedy', 'لماذا الارتجال يجعل الكوميديا حية ومتفجرة.', v_audio, 3660, now() - interval '27 days', 850000);
  END IF;

  -- ==================== Matt Besser (Improv) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'matt-besser') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'مات بيسر', 'matt-besser',
      'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/matt-besser-cover/1200/400',
      'كوميديان ارتجالي', 'ارتجال وكوميديا',
      'مات بيسر أحد مؤسسي UCB وأحد أهم معلمي الارتجال في العالم، ومقدم improv4humans، معروف بتركيزه على الارتجال الحر والبناء اللحظي للمشاهد.',
      'الولايات المتحدة', v_cat_culture, true, 1200000,
      '{"website":"https://www.mattbesser.com","spotify":"https://open.spotify.com/show/2M3Y7k7Y5k2m0H2YxQ3n1c"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'improv4humans', 'ارتجال نقي، مشاهد تُبنى من الصفر، ودروس عملية في فن الارتجال.',
      v_host_id, v_cat_culture, 'improv',
      'https://picsum.photos/seed/pod-improv4humans/400/400', 'intermediate', 8500000, 4.6
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'Scene Work Without a Net', 'كيف تبني مشهدًا ارتجاليًا قويًا بدون أي سيناريو.', v_audio, 3600, now() - interval '5 days', 640000),
      (v_pod_id, 'Characters from Nothing', 'خلق شخصيات كوميدية مقنعة في ثوانٍ.', v_audio, 3480, now() - interval '12 days', 610000),
      (v_pod_id, 'The Rules That Free You', 'قواعد الارتجال التي تمنحك حرية أكبر على المسرح.', v_audio, 3540, now() - interval '19 days', 585000),
      (v_pod_id, 'Group Mind in Action', 'كيف يصبح فريق الارتجال عقلًا واحدًا على المسرح.', v_audio, 3420, now() - interval '26 days', 560000);
  END IF;

  -- ==================== Ibrahim Hegazy (Cybersecurity) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ibrahim-hegazy') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'إبراهيم حجازي', 'ibrahim-hegazy',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/ibrahim-hegazy-cover/1200/400',
      'خبير أمن سيبراني', 'الأمن السيبراني واختبار الاختراق',
      'إبراهيم حجازي خبير أمن سيبراني مصري، مؤسس مشارك ومدير تقني، معروف بمشاركته في نشر الوعي بالأمن السيبراني، واكتشاف الثغرات، وشرح مخاطر الهجمات الرقمية بشكل مبسط وعملي.',
      'مصر', v_cat_tech, true, 420000,
      '{"youtube":"https://www.youtube.com/@EbrahemHegazy","linkedin":"https://www.linkedin.com/in/zigoo0/","website":"https://darkentry.net"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'Cybersecurity with Ibrahim Hegazy', 'تبسيط الأمن السيبراني: من الاختراق الأخلاقي إلى حماية الأفراد والشركات من التهديدات الرقمية.',
      v_host_id, v_cat_tech, 'professional',
      'https://picsum.photos/seed/pod-ibrahim-hegazy/400/400', 'beginner', 980000, 4.8
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'كيف تفكر مثل الهاكر لتحمي نفسك', 'مقدمة عملية لفهم عقلية المهاجم وأهم خطوات الحماية.', v_audio, 2400, now() - interval '20 days', 145000),
      (v_pod_id, 'Bug Bounty: من أين تبدأ؟', 'خريطة بداية واضحة لدخول مجال اختبار الاختراق ومكافآت الثغرات.', v_audio, 2640, now() - interval '15 days', 132000),
      (v_pod_id, 'أخطاء شائعة تعرضك للاختراق', 'أخطاء يومية بسيطة قد تفتح بابًا للهجمات الإلكترونية.', v_audio, 2100, now() - interval '10 days', 121000),
      (v_pod_id, 'مستقبل الأمن السيبراني مع الذكاء الاصطناعي', 'كيف يغير الذكاء الاصطناعي مشهد الهجوم والدفاع السيبراني.', v_audio, 2520, now() - interval '5 days', 118000);
  END IF;

END $$;
