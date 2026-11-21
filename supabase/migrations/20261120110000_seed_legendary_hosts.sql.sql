/*
# Add renowned Arab presenters and public figures as hosts

- Adds well-known media figures, thinkers and self-development authors.
- Fully formatted records: Arabic name, slug, title, specialty, bio, country,
  category, verified badge, follower count, one podcast and four episodes each.
- Idempotent: every host is guarded by a slug existence check.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_cat_culture   uuid;
  v_cat_science   uuid;
  v_cat_mental    uuid;
  v_cat_career    uuid;
  v_cat_leadership uuid;
  v_cat_finance   uuid;
  v_cat_religious uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_science    FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_finance    FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_cat_religious  FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;

-- ==================== شرين حلمي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'sherine-helmy') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('شرين حلمي', 'sherine-helmy',
    'https://picsum.photos/seed/sherine-helmy/400/400',
    'https://picsum.photos/seed/sherine-cover/1200/400',
    'إعلامية', 'الإعلام والتواصل والتنمية البشرية',
    'إعلامية مصرية بارزة، عُرفت بأسلوبها الهادئ في تقديم البرامج والحوار مع ضيوف من مختلف المجالات، وتقدم محتوى يجمع بين الثقافة والتنمية الذاتية.',
    'مصر', v_cat_career, true, 860000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('بصمة شرين', 'حوارات وملاحظات حول الإعلام والتواصل وبناء الثقة.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-sherine/400/400', 'beginner', 410000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قوة الحضور', 'كيف تصنع انطباعاً يدوم في أول دقيقة.', v_audio, 1560, now() - interval '30 days', 58000),
    (v_pod_id, 'فن الإصغاء', 'الاستماع الجيد كأداة للقيادة والتأثير.', v_audio, 1440, now() - interval '22 days', 51000),
    (v_pod_id, 'الثقة ليست صدفة', 'خطوات عملية لبناء ثقة الجمهور.', v_audio, 1680, now() - interval '14 days', 47000),
    (v_pod_id, 'حين يصبح الإعلام رسالة', 'مسؤولية الكلمة في زمن السرعة.', v_audio, 1500, now() - interval '6 days', 43000);
END IF;

-- ==================== إيهاب فكري ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ihab-fakry') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('إيهاب فكري', 'ihab-fakry',
    'https://picsum.photos/seed/ihab-fakry/400/400',
    'https://picsum.photos/seed/ihab-cover/1200/400',
    'إعلامي', 'الإعلام والثقافة والحوار',
    'إعلامي مصري معروف ببرامجه الثقافية وحواراته المفتوحة مع المثقفين والمفكرين، يقدم رؤية معاصرة للقضايا الفكرية والأدبية.',
    'مصر', v_cat_culture, true, 740000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مساحة فكر', 'حوارات ثقافية تفتح آفاقاً جديدة للتفكير.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-ihab/400/400', 'intermediate', 360000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الثقافة والهوية', 'كيف نحافظ على هويتنا في عالم متغير.', v_audio, 1800, now() - interval '28 days', 49000),
    (v_pod_id, 'السؤال قبل الجواب', 'أهمية طرح الأسئلة الصحيحة.', v_audio, 1620, now() - interval '21 days', 44000),
    (v_pod_id, 'الكتاب والواقع', 'قراءة نقدية في علاقة الأدب بالمجتمع.', v_audio, 1740, now() - interval '13 days', 40000),
    (v_pod_id, 'الإعلام والمعنى', 'البحث عن العمق وسط الأخبار.', v_audio, 1680, now() - interval '5 days', 38000);
END IF;

-- ==================== صلاح أبو المجد ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'salah-abu-almajad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('صلاح أبو المجد', 'salah-abu-almajad',
    'https://picsum.photos/seed/salah-abu-almajad/400/400',
    'https://picsum.photos/seed/salah-cover/1200/400',
    'كاتب وإعلامي', 'القيادة والإعلام والرأي',
    'كاتب وإعلامي مصري، عمل في مجالات الصحافة والإعلام والتثقيف الجماهيري، واشتهر بطرح رؤى مباشرة في قضايا المجتمع والتنمية.',
    'مصر', v_cat_leadership, true, 690000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رأي وموقف', 'قراءات في القيادة والقرار والشأن العام.', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-salah/400/400', 'intermediate', 310000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'القرار مسؤولية', 'كيف يتحمل القائد تبعات اختياره.', v_audio, 1700, now() - interval '27 days', 42000),
    (v_pod_id, 'الإعلام بين المهنة والرسالة', 'حدود التأثير الإعلامي في المجتمع.', v_audio, 1580, now() - interval '20 days', 39000),
    (v_pod_id, 'التنمية تبدأ بالإنسان', 'استثمار العقل قبل استثمار المال.', v_audio, 1660, now() - interval '12 days', 36000),
    (v_pod_id, 'الكلمة أمانة', 'مسؤولية الرأي حين يسمعه الآخرون.', v_audio, 1520, now() - interval '4 days', 34000);
END IF;

-- ==================== محمود علاء الدين ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mahmoud-alaaddin') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('محمود علاء الدين', 'mahmoud-alaaddin',
    'https://picsum.photos/seed/mahmoud-alaaddin/400/400',
    'https://picsum.photos/seed/mahmoud-cover/1200/400',
    'دكتور', 'العلوم والابتكار والتعليم',
    'أكاديمي ومتحدث في مجالات العلوم والابتكار، يهتم بتبسيط المعرفة العلمية وتقريبها من الشباب العربي داخل وخارج الجامعة.',
    'مصر', v_cat_science, true, 520000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عقول وعلم', 'رحلات مبسطة في عالم العلم والاكتشاف.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-mahmoud/400/400', 'beginner', 280000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'كيف يفكر العلماء؟', 'منهج البحث العلمي خطوة بخطوة.', v_audio, 1620, now() - interval '26 days', 38000),
    (v_pod_id, 'الذكاء الاصطناعي قريباً منا', 'تأثير التقنية على حياتنا اليومية.', v_audio, 1740, now() - interval '19 days', 35000),
    (v_pod_id, 'الفشل جزء من التجربة', 'دروس من محاولات لم تنجح أول مرة.', v_audio, 1500, now() - interval '11 days', 32000),
    (v_pod_id, 'العلم للجميع', 'لماذا يجب أن تكون المعرفة متاحة للكل.', v_audio, 1560, now() - interval '3 days', 30000);
END IF;

-- ==================== ياسر حيزيمي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'yasser-hazimi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('ياسر حيزيمي', 'yasser-hazimi',
    'https://picsum.photos/seed/yasser-hazimi/400/400',
    'https://picsum.photos/seed/yasser-cover/1200/400',
    'خبير', 'ريادة الأعمال والاستثمار',
    'خبير في ريادة الأعمال والاستثمار، يشارك خبرته في بناء المشاريع واتخاذ القرارات المالية مع رواد الأعمال الشباب.',
    'السعودية', v_cat_finance, true, 480000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مال وفكر', 'ثقافة مالية وريادية بلغة بسيطة.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-yasser/400/400', 'intermediate', 240000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قبل أن تبدأ مشروعك', 'الأسئلة التي يجب أن تجيب عليها أولاً.', v_audio, 1680, now() - interval '25 days', 33000),
    (v_pod_id, 'المخاطرة المحسوبة', 'كيف توازن بين المخاطرة والفرصة.', v_audio, 1560, now() - interval '18 days', 30000),
    (v_pod_id, 'التمويل دون تخطيط', 'أخطاء شائعة في إدارة السيولة.', v_audio, 1620, now() - interval '10 days', 28000),
    (v_pod_id, 'النجاح ليس رقمياً', 'قيمة العمل التي تبقى بعد الأرباح.', v_audio, 1500, now() - interval '2 days', 26000);
END IF;

-- ==================== إبراهيم الفقي ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ibrahim-alfaqi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('إبراهيم الفقي', 'ibrahim-alfaqi',
    'https://picsum.photos/seed/ibrahim-alfaqi/400/400',
    'https://picsum.photos/seed/ibrahim-cover/1200/400',
    'دكتور', 'التنمية البشرية والبرمجة اللغوية العصبية',
    'د. إبراهيم الفقي من أبرز خبراء التنمية البشرية في العالم العربي، قدّم مئات المحاضرات والمؤلفات عن البرمجة اللغوية العصبية وإدارة الذات وصناعة النجاح.',
    'مصر', v_cat_mental, true, 1120000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('صناعة النجاح', 'مبادئ عملية في التنمية البشرية وإدارة الذات.', v_host_id, v_cat_mental, 'motivational', 'https://picsum.photos/seed/pod-ibrahim/400/400', 'beginner', 680000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'أنت ما تفكر فيه', 'كيف تشكّل أفكارك واقعك.', v_audio, 1740, now() - interval '29 days', 95000),
    (v_pod_id, 'إدارة الوقت بإتقان', 'أولويات تصنع فرقاً كل يوم.', v_audio, 1620, now() - interval '22 days', 87000),
    (v_pod_id, 'البرمجة اللغوية العصبية', 'مدخل مبسط إلى عالم NLP.', v_audio, 1860, now() - interval '15 days', 82000),
    (v_pod_id, 'التغيير يبدأ منك', 'خطوات صغيرة تصنع تحولاً كبيراً.', v_audio, 1680, now() - interval '7 days', 78000);
END IF;

-- ==================== مصطفى محمود ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mustafa-mahmoud') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('مصطفى محمود', 'mustafa-mahmoud',
    'https://picsum.photos/seed/mustafa-mahmoud/400/400',
    'https://picsum.photos/seed/mustafa-cover/1200/400',
    'دكتور', 'العلم والفكر والإيمان',
    'د. مصطفى محمود مفكر وعالم وكاتب مصري، صاحب برنامج «العلم والإيمان»، جمع بين البحث العلمي والتأمل الفكري وترك أثراً واسعاً في الثقافة العربية.',
    'مصر', v_cat_science, true, 1350000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('العلم والإيمان', 'تأملات في العلم والكون والإنسان.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-mustafa/400/400', 'intermediate', 920000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'العلم والإيمان', 'حين يلتقي اليقين العلمي باليقين الروحي.', v_audio, 1800, now() - interval '30 days', 140000),
    (v_pod_id, 'الكون تساؤل لا جواب', 'أسئلة الإنسان أمام اتساع الكون.', v_audio, 1680, now() - interval '23 days', 128000),
    (v_pod_id, 'الإنسان بين المادة والروح', 'قراءة في التركيب الإنساني.', v_audio, 1740, now() - interval '16 days', 116000),
    (v_pod_id, 'زمن الحقيقة', 'كيف نفرز المعرفة في عصر المعلومات.', v_audio, 1620, now() - interval '8 days', 105000);
END IF;

-- ==================== عمرو شريف ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'amro-sharif') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('عمرو شريف', 'amro-sharif',
    'https://picsum.photos/seed/amro-sharif/400/400',
    'https://picsum.photos/seed/amro-cover/1200/400',
    'إعلامي', 'الإعلام والمقابلات الملهمة',
    'إعلامي مصري معروف بأسلوبه في الحوار وتقديم البرامج، يقدم لقاءات مع شخصيات مؤثرة من مختلف المجالات.',
    'مصر', v_cat_career, true, 630000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('لقاءات عمرو', 'حوارات قصيرة مع أصحاب التجارب الملهمة.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-amro/400/400', 'beginner', 330000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'حكاية بداية', 'كيف بدأت الرحلة من الصفر.', v_audio, 1500, now() - interval '24 days', 41000),
    (v_pod_id, 'لحظة القرار', 'القرار الذي غيّر مسار حياة ضيفنا.', v_audio, 1560, now() - interval '17 days', 38000),
    (v_pod_id, 'ما بعد النجاح', 'كيف تحافظ على توازنك بعد الوصول.', v_audio, 1620, now() - interval '9 days', 35000),
    (v_pod_id, 'رسالة للشباب', 'نصائح من تجارب واقعية.', v_audio, 1440, now() - interval '2 days', 33000);
END IF;

-- ==================== أسامة السيد ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'osama-elsayed') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('أسامة السيد', 'osama-elsayed',
    'https://picsum.photos/seed/osama-elsayed/400/400',
    'https://picsum.photos/seed/osama-cover/1200/400',
    'دكتور', 'الطب النفسي والتنمية البشرية',
    'طبيب نفسي ومتحدث في التنمية البشرية، يقدم محتوى يجمع بين الفهم النفسي والتطبيق العملي لمساعدة الشباب على إدارة حياتهم بثقة.',
    'مصر', v_cat_mental, true, 570000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('توازن', 'صحة نفسية وأفكار عملية لحياة أهدأ.', v_host_id, v_cat_mental, 'motivational', 'https://picsum.photos/seed/pod-osama/400/400', 'beginner', 290000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قلق بلا سبب', 'كيف تفهم إشارات جسدك ونفسك.', v_audio, 1620, now() - interval '23 days', 37000),
    (v_pod_id, 'حدود صحية في العلاقات', 'أن تقول لا دون تأنيب ضمير.', v_audio, 1560, now() - interval '16 days', 34000),
    (v_pod_id, 'الراحة ليست كسلاً', 'أهمية التوقف والتعافي.', v_audio, 1500, now() - interval '8 days', 32000),
    (v_pod_id, 'خطط صغيرة لنهاية أسبوع أفضل', 'روتين بسيط لتقليل التوتر.', v_audio, 1440, now() - interval '1 day', 29000);
END IF;

-- ==================== فيصل القاسم ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'faisal-alqassem') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count)
  VALUES ('فيصل القاسم', 'faisal-alqassem',
    'https://picsum.photos/seed/faisal-alqassem/400/400',
    'https://picsum.photos/seed/faisal-cover/1200/400',
    'إعلامي', 'الحوار الإعلامي والثقافة',
    'إعلامي سوري من أشهر مقدمي برامج الحوار في العالم العربي، تميز بأسلوبه في إدارة النقاش وطرح وجهات النظر المختلفة.',
    'سوريا', v_cat_culture, true, 980000)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('حوال', 'حوار مفتوح حول الأفكار والقضايا الثقافية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-faisal/400/400', 'intermediate', 520000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'فن إدارة الحوار', 'كيف تدير نقاشاً بين وجهتين مختلفتين.', v_audio, 1800, now() - interval '28 days', 62000),
    (v_pod_id, 'الاختلاف والاحترام', 'ثقافة الاستماع إلى الآخر.', v_audio, 1680, now() - interval '21 days', 58000),
    (v_pod_id, 'الإعلام والسلطة', 'حدود السؤال ومسؤولية الجواب.', v_audio, 1740, now() - interval '13 days', 54000),
    (v_pod_id, 'السؤال المزعج', 'حين يفتح الحوار أبواباً مغلقة.', v_audio, 1620, now() - interval '5 days', 50000);
END IF;

END $$;
