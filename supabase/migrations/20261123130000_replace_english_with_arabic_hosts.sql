/*
  # Replace English-speaking hosts with Arabic-speaking hosts

  User requested Arabic-speaking presenters for comedy, communication,
  leadership, and improv. Removes the English-speaking hosts added in
  20261123120000_seed_comedy_leadership_comm_improv_security.sql and
  adds famous Arabic-speaking hosts instead. Keeps Ibrahim Hegazy (Arabic).

  Idempotent: guarded by slug checks; cleanup targets only the English slugs.
*/

DO $$
DECLARE
  v_audio text := 'https://www.buzzsprout.com/2196707/episodes/20137689-84.mp3';
  v_cat_culture    uuid;
  v_cat_career     uuid;
  v_cat_leadership uuid;
  v_cat_mental     uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;

  -- Cleanup English-speaking hosts added previously
  DELETE FROM episodes WHERE podcast_id IN (
    SELECT p.id FROM podcasts p JOIN hosts h ON p.host_id = h.id
    WHERE h.slug IN (
      'joe-rogan','conan-obrien','bill-burr','matt-abrahams','celeste-headlee',
      'simon-sinek','jocko-willink','brene-brown','scott-aukerman','matt-besser'
    )
  );
  DELETE FROM podcasts WHERE host_id IN (
    SELECT id FROM hosts WHERE slug IN (
      'joe-rogan','conan-obrien','bill-burr','matt-abrahams','celeste-headlee',
      'simon-sinek','jocko-willink','brene-brown','scott-aukerman','matt-besser'
    )
  );
  DELETE FROM hosts WHERE slug IN (
    'joe-rogan','conan-obrien','bill-burr','matt-abrahams','celeste-headlee',
    'simon-sinek','jocko-willink','brene-brown','scott-aukerman','matt-besser'
  );

  -- ==================== بدر صالح (كوميديا) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'bader-saleh') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'بدر صالح', 'bader-saleh',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/bader-saleh-cover/1200/400',
      'كوميديان وصانع محتوى', 'كوميديا ساخرة',
      'بدر صالح كوميديان سعودي من أشهر صناع المحتوى الكوميدي في العالم العربي، عُرف بأسلوبه الساخر الذكي في "ايش اللي" وبرامجه الحوارية الكوميدية، وله حضور قوي في تقديم الكوميديا بلهجة عربية قريبة من الشباب.',
      'السعودية', v_cat_culture, true, 4200000,
      '{"youtube":"https://www.youtube.com/@BaderSaleh","instagram":"https://www.instagram.com/badersaleh/","twitter":"https://twitter.com/badersaleh"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'جلسة مع بدر', 'حوارات كوميدية خفيفة مع ضيوف من عالم الفن والمحتوى، بروح سعودية ساخرة وعفوية.',
      v_host_id, v_cat_culture, 'comedy',
      'https://picsum.photos/seed/pod-bader-saleh/400/400', 'beginner', 8500000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'كيف تصنع كوميديا بدون إسفاف', 'بدر صالح يتحدث عن أسرار السخرية الذكية وصناعة الضحك المحترم.', v_audio, 2400, now() - interval '12 days', 920000),
      (v_pod_id, 'خلف كواليس المحتوى الكوميدي', 'قصة التحول من فيديوهات قصيرة إلى حضور كوميدي مؤثر.', v_audio, 2280, now() - interval '19 days', 860000),
      (v_pod_id, 'الضحك في الثقافة العربية', 'لماذا نحتاج الكوميديا أكثر في حياتنا اليومية؟', v_audio, 2100, now() - interval '26 days', 810000),
      (v_pod_id, 'مواقف محرجة صنعت نجومية', 'قصص واقعية مضحكة من رحلة بدر في صناعة المحتوى.', v_audio, 2220, now() - interval '33 days', 780000);
  END IF;

  -- ==================== شادي ألفونس (كوميديا) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'shady-alfons') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'شادي ألفونس', 'shady-alfons',
      'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/shady-alfons-cover/1200/400',
      'كوميديان وممثل', 'كوميديا وستاند أب',
      'شادي ألفونس كوميديان وممثل مصري، أحد الوجوه البارزة في موجة الكوميديا الحديثة في مصر، معروف بأسلوبه الذكي في الستاند أب والتعليق الساخر على الواقع الاجتماعي.',
      'مصر', v_cat_culture, true, 3100000,
      '{"youtube":"https://www.youtube.com/@ShadyAlfons","instagram":"https://www.instagram.com/shadyalfons/"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'كوميديا على الناشف', 'كوميديا مصرية ذكية عن الحياة، الشغل، والعلاقات بدون فلتر.',
      v_host_id, v_cat_culture, 'comedy',
      'https://picsum.photos/seed/pod-shady-alfons/400/400', 'intermediate', 6400000, 4.6
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'الستاند أب مش هزار وبس', 'رحلة كتابة النكتة من فكرة صغيرة لضحكة كاملة على المسرح.', v_audio, 2700, now() - interval '11 days', 730000),
      (v_pod_id, 'الكوميديا في الشارع المصري', 'كيف تتحول تفاصيل اليوم المصري لمادة كوميدية؟', v_audio, 2580, now() - interval '18 days', 690000),
      (v_pod_id, 'لما الجمهور ما يضحكش', 'أصعب لحظات الكوميديان وكيف يتعامل معها باحتراف.', v_audio, 2460, now() - interval '25 days', 640000),
      (v_pod_id, 'السخرية والحدود', 'فين الخط بين الكوميديا الذكية والإساءة؟', v_audio, 2520, now() - interval '32 days', 610000);
  END IF;

  -- ==================== محمد القحطاني (فن التواصل) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mohammed-alqahtani') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'محمد القحطاني', 'mohammed-alqahtani',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/mohammed-qahtani-cover/1200/400',
      'بطل العالم في الخطابة', 'فن التواصل والإلقاء',
      'محمد القحطاني مهندس ومتحدث سعودي، فاز ببطولة العالم في الخطابة Toastmasters World Championship of Public Speaking عام 2015، ويُعد من أقوى الأصوات العربية في فن الإلقاء والتأثير والتواصل.',
      'السعودية', v_cat_career, true, 2800000,
      '{"youtube":"https://www.youtube.com/results?search_query=%D9%85%D8%AD%D9%85%D8%AF+%D8%A7%D9%84%D9%82%D8%AD%D8%B7%D8%A7%D9%86%D9%8A+%D8%AE%D8%B7%D8%A7%D8%A8%D8%A9","x":"https://x.com/MohdQahtani"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'قوة الكلمة', 'بودكاست عملي عن الإلقاء، الحضور، والتأثير أمام الجمهور باللغة العربية.',
      v_host_id, v_cat_career, 'communication',
      'https://picsum.photos/seed/pod-qahtani/400/400', 'beginner', 7600000, 4.9
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'كيف تتغلب على خوف المسرح', 'خطوات عملية لتحويل التوتر إلى طاقة حضور أمام الجمهور.', v_audio, 2100, now() - interval '9 days', 980000),
      (v_pod_id, 'ابدأ خطبتك بقوة', 'كيف تخطف انتباه الجمهور في أول 30 ثانية.', v_audio, 1980, now() - interval '16 days', 910000),
      (v_pod_id, 'لغة الجسد والصوت', 'الصوت والإيماءات تصنع نصف تأثير رسالتك.', v_audio, 2040, now() - interval '23 days', 870000),
      (v_pod_id, 'فن الإقناع بالأفكار', 'كيف تبني حجة مؤثرة وتصل لقلب وعقل الجمهور.', v_audio, 2160, now() - interval '30 days', 840000);
  END IF;

  -- ==================== كانفاس (فن التواصل) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'khaled-almuneef') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'خالد المنيف', 'khaled-almuneef',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/khaled-muneef-cover/1200/400',
      'مدرب تواصل', 'التواصل المؤثر والعرض',
      'خالد المنيف مدرب ومتحدث سعودي متخصص في مهارات التواصل والعرض والتأثير، يقدم محتوى عمليًا يساعد الأفراد على التعبير بثقة وبناء حضور قوي في العمل والحياة.',
      'السعودية', v_cat_career, true, 950000,
      '{"youtube":"https://www.youtube.com/results?search_query=%D8%AE%D8%A7%D9%84%D8%AF+%D8%A7%D9%84%D9%85%D9%86%D9%8A%D9%81+%D8%AA%D9%88%D8%A7%D8%B5%D9%84","x":"https://x.com/kalmuneef"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'تواصل بذكاء', 'مهارات عملية للتواصل اليومي، الإقناع، والعرض أمام الآخرين.',
      v_host_id, v_cat_career, 'communication',
      'https://picsum.photos/seed/pod-khaled-muneef/400/400', 'beginner', 3200000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'كيف تقول فكرتك بوضوح', 'الوضوح هو أهم مهارة في التواصل المهني والشخصي.', v_audio, 1800, now() - interval '8 days', 410000),
      (v_pod_id, 'فن الإصغاء قبل الرد', 'التواصل الجيد يبدأ من الاستماع لا من الكلام.', v_audio, 1740, now() - interval '15 days', 390000),
      (v_pod_id, 'التعامل مع الاختلاف في الحوار', 'كيف تحافظ على علاقة جيدة حتى وأنت تختلف.', v_audio, 1860, now() - interval '22 days', 360000),
      (v_pod_id, 'اعرض فكرتك بثقة', 'أساسيات العرض المؤثر في الاجتماعات والعروض التقديمية.', v_audio, 1920, now() - interval '29 days', 340000);
  END IF;

  -- ==================== ياسر الحزيمي (قيادة) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'yasser-alhazimi') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'ياسر الحزيمي', 'yasser-alhazimi',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/yasser-hazimi-cover/1200/400',
      'كاتب ومتحدث', 'القيادة وتطوير الذات',
      'ياسر الحزيمي كاتب ومتحدث سعودي بارز في القيادة وتطوير الذات وبناء الشخصية، معروف ببرامجه ومحتواه المؤثر الذي يجمع بين العمق والوضوح والتطبيق العملي.',
      'السعودية', v_cat_leadership, true, 6500000,
      '{"youtube":"https://www.youtube.com/@YasserAlHazimi","x":"https://x.com/alhazimi","website":"https://alhazimi.sa"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'بوصلة القيادة', 'حوارات وأفكار عملية في القيادة، اتخاذ القرار، وبناء الأثر.',
      v_host_id, v_cat_leadership, 'leadership',
      'https://picsum.photos/seed/pod-yasser-hazimi/400/400', 'beginner', 12000000, 4.9
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'القائد يبدأ من نفسه', 'القيادة الحقيقية تبدأ بالانضباط الذاتي قبل قيادة الآخرين.', v_audio, 2400, now() - interval '10 days', 1350000),
      (v_pod_id, 'صناعة القرار', 'كيف تتخذ قرارًا واضحًا في وقت الضغط والتشويش؟', v_audio, 2280, now() - interval '17 days', 1260000),
      (v_pod_id, 'بناء عادة الالتزام', 'الالتزام هو الوقود الحقيقي للإنجاز والقيادة.', v_audio, 2340, now() - interval '24 days', 1190000),
      (v_pod_id, 'الأثر قبل المنصب', 'القيادة ليست لقبًا، بل أثر تتركه في الناس.', v_audio, 2460, now() - interval '31 days', 1120000);
  END IF;

  -- ==================== مشهور الدبيان (قيادة/ريادة) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mashhoor-aldubayan') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'مشهور الدبيان', 'mashhoor-aldubayan',
      'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/mashhoor-dubayan-cover/1200/400',
      'رائد أعمال ومقدّم', 'القيادة وريادة الأعمال',
      'مشهور الدبيان رائد أعمال سعودي ومقدم بودكاست سوالف بزنس، من أبرز الأصوات العربية في قيادة الشركات الناشئة وريادة الأعمال وبناء الفرق.',
      'السعودية', v_cat_leadership, true, 1900000,
      '{"x":"https://x.com/mashhoor_d","linkedin":"https://www.linkedin.com/in/mashhoor/"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'قيادة الأعمال', 'دروس عملية في قيادة الشركات، بناء الفرق، واتخاذ قرارات النمو.',
      v_host_id, v_cat_leadership, 'leadership',
      'https://picsum.photos/seed/pod-mashhoor/400/400', 'intermediate', 5400000, 4.8
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'كيف تقود فريقًا ناشئًا', 'القيادة في startups تختلف: سرعة، وضوح، وتحمل مسؤولية.', v_audio, 3000, now() - interval '13 days', 690000),
      (v_pod_id, 'القرار الصعب في وقت النمو', 'متى تتوسع ومتى تتوقف؟ دروس من سوق الأعمال.', v_audio, 2880, now() - interval '20 days', 640000),
      (v_pod_id, 'بناء ثقافة شركة قوية', 'الثقافة ليست شعارات، بل سلوك يومي يقوده المؤسس.', v_audio, 2760, now() - interval '27 days', 610000),
      (v_pod_id, 'من مؤسس إلى قائد', 'التحول الأصعب: أن تتوقف عن تنفيذ كل شيء وتقود الآخرين.', v_audio, 2940, now() - interval '34 days', 580000);
  END IF;

  -- ==================== علي الكلثمي (ارتجال/كوميديا ارتجالية) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ali-kalthami') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'علي الكلثمي', 'ali-kalthami',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/ali-kalthami-cover/1200/400',
      'مخرج وكوميديان', 'كوميديا ارتجالية وسرد',
      'علي الكلثمي مخرج وكاتب وممثل سعودي، أحد أبرز أعضاء تلفاز11، معروف بذكائه الكوميدي وقدرته على الارتجال وصناعة المواقف الساخرة بطريقة عفوية وذكية.',
      'السعودية', v_cat_culture, true, 2300000,
      '{"x":"https://x.com/alikalthami","instagram":"https://www.instagram.com/alikalthami/"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'ارتجال على السريع', 'جلسات ارتجالية عربية: أفكار، شخصيات، ومواقف تُبنى في اللحظة.',
      v_host_id, v_cat_culture, 'improv',
      'https://picsum.photos/seed/pod-ali-kalthami/400/400', 'beginner', 4700000, 4.7
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'مشهد من ولا شيء', 'كيف تبدأ مشهدًا ارتجاليًا من كلمة واحدة فقط.', v_audio, 2100, now() - interval '7 days', 560000),
      (v_pod_id, 'شخصيات تطلع في اللحظة', 'سر بناء شخصية كوميدية مقنعة أثناء الارتجال.', v_audio, 1980, now() - interval '14 days', 520000),
      (v_pod_id, 'لما الخطة تفشل', 'أجمل لحظات الارتجال تطلع من الأخطاء.', v_audio, 2040, now() - interval '21 days', 490000),
      (v_pod_id, 'الكيمياء بين الفريق', 'الارتجال لعبة جماعية: كيف تسمع وتبني مع غيرك.', v_audio, 2160, now() - interval '28 days', 460000);
  END IF;

  -- ==================== إبراهيم الخير الله (ارتجال/كوميديا) ====================
  IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ibrahim-alkhairallah') THEN
    INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
    VALUES (
      'إبراهيم الخير الله', 'ibrahim-alkhairallah',
      'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=400&h=400&fit=crop&crop=faces',
      'https://picsum.photos/seed/ibrahim-khairallah-cover/1200/400',
      'ممثل وكوميديان', 'ارتجال وكوميديا ساخرة',
      'إبراهيم الخير الله ممثل وكوميديان سعودي، معروف بأدواره الكوميدية العفوية وحضوره القوي في الأعمال الساخرة، ويتمتع بقدرة عالية على الارتجال والتفاعل اللحظي مع المواقف.',
      'السعودية', v_cat_culture, true, 2600000,
      '{"x":"https://x.com/ikhairallah","instagram":"https://www.instagram.com/ibrahimalkhairallah/"}'::jsonb
    ) RETURNING id INTO v_host_id;

    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    VALUES (
      'بدون سيناريو', 'بودكاست ارتجالي كوميدي عربي يعتمد على العفوية وردود الفعل اللحظية.',
      v_host_id, v_cat_culture, 'improv',
      'https://picsum.photos/seed/pod-khairallah/400/400', 'beginner', 3900000, 4.6
    ) RETURNING id INTO v_pod_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_pod_id, 'نعم، وكمل', 'أهم قاعدة في الارتجال وكيف تخلي المشهد يعيش.', v_audio, 1920, now() - interval '6 days', 480000),
      (v_pod_id, 'الضحكة اللي ما كانت في الخطة', 'كيف تتحول الغلطة إلى أجمل لحظة كوميدية.', v_audio, 1860, now() - interval '13 days', 450000),
      (v_pod_id, 'ارتجال المواقف اليومية', 'تحويل مواقف الحياة اليومية إلى مشاهد كوميدية مرتجلة.', v_audio, 1800, now() - interval '20 days', 430000),
      (v_pod_id, 'التوقيت الكوميدي', 'متى تتكلم ومتى تسكت؟ سر التوقيت في الارتجال.', v_audio, 1940, now() - interval '27 days', 410000);
  END IF;

END $$;
