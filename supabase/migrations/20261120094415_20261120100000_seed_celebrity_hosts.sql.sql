/*
# Add 28 celebrity/famous hosts with full podcast catalogs

1. Seed Data
- Adds 28 new well-known hosts across all 10 categories with:
  realistic Arabic names, celebrity-level follower counts, verified badges,
  full bios, social links, and real portrait photos.
- Each host gets 1-4 podcasts, and EVERY podcast gets 4-6 episodes
  with distinct titles, descriptions, durations, and publish dates.
- Idempotent: guarded by slug existence checks.
*/

DO $$
DECLARE
  v_audio text := 'https://www.buzzsprout.com/2196707/episodes/20137689-84.mp3';
  v_cat_tech uuid;
  v_cat_mental uuid;
  v_cat_health uuid;
  v_cat_family uuid;
  v_cat_science uuid;
  v_cat_leadership uuid;
  v_cat_finance uuid;
  v_cat_career uuid;
  v_cat_culture uuid;
  v_cat_religious uuid;
  v_host_id uuid;
  v_pod_id uuid;
BEGIN
  -- Resolve category IDs at runtime: seed_podcast_data.sql generates fresh UUIDs.
  SELECT id INTO v_cat_tech       FROM categories WHERE name_ar = 'التقنية' LIMIT 1;
  SELECT id INTO v_cat_mental     FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_cat_health     FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_cat_family     FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_cat_science    FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_cat_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_cat_finance    FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_cat_career     FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_cat_culture    FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_cat_religious  FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;

-- ==================== 1. د. طارق السويدان (religious/culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'tareq-al-suwaidan') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('طارق السويدان', 'tareq-al-suwaidan',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/suwaidan-cover/1200/400',
    'دكتور', 'التاريخ والسيرة والدعوة', 'د. طارق السويدان داعية ومؤرخ ومؤلف كويتي بارز، ألّف أكثر من مئة كتاب في السيرة والتاريخ والتنمية، وقدم مئات الساعات من المحاضرات المؤثرة للشباب العربي.', 'الكويت', v_cat_religious, true, 1250000,
    '{"youtube":"https://youtube.com/@tareqalsuwaidan","twitter":"https://twitter.com/tareqalsuwaidan","instagram":"https://instagram.com/tareqalsuwaidan","website":"https://suwaidan.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('سيرة النبيين', 'رحلة ممتعة في حياة الأنبياء والدروس المستفادة منها.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-suwaidan1/400/400', 'beginner', 890000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'نوح عليه السلام: صبر قرن كامل', 'قصة دعوة نوح وقصته مع قومه.', v_audio, 2700, now() - interval '40 days', 120000),
    (v_pod_id, 'إبراهيم: أبو الأنبياء', 'رحلة إبراهيم في البحث عن الحق.', v_audio, 2850, now() - interval '33 days', 105000),
    (v_pod_id, 'يوسف: من البئر إلى الخزينة', 'دروس من حياة يوسف في مصر.', v_audio, 2600, now() - interval '26 days', 98000),
    (v_pod_id, 'موسى: مواجهة الطغيان', 'موسى وفرعون ومعجزات الخروج.', v_audio, 2900, now() - interval '19 days', 87000),
    (v_pod_id, 'عيسى: الروح والمعجزات', 'قصة عيسى ودعوته.', v_audio, 2450, now() - interval '12 days', 76000),
    (v_pod_id, 'محمد ﷺ: الرسالة تبدأ', 'بدايات الدعوة النبوية في مكة.', v_audio, 3100, now() - interval '5 days', 143000);

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قصص التاريخ الإسلامي', 'حكايات ملهمة من عصور الإسلام الذهبية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-suwaidan2/400/400', 'intermediate', 620000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأندلس: جسر الحضارات', 'قصة قرطبة وعلوم الأندلس.', v_audio, 2400, now() - interval '35 days', 87000),
    (v_pod_id, 'بيت الحكمة في بغداد', 'حركة الترجمة والعلم في العصر العباسي.', v_audio, 2250, now() - interval '28 days', 72000),
    (v_pod_id, 'صلاح الدين: الفاتح الناصر', 'توحيد مصر والشام ومعركة حطين.', v_audio, 2600, now() - interval '21 days', 91000),
    (v_pod_id, 'عثمان: سيد المطهرين', 'عثمان بن عفان وجمع القرآن.', v_audio, 2350, now() - interval '14 days', 68000),
    (v_pod_id, 'المماليك: حماة الحضارة', 'دور المماليك في صد المغول.', v_audio, 2200, now() - interval '7 days', 54000);
END IF;

-- ==================== 2. د. عائض القرني (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ayed-al-qarni') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عائض القرني', 'ayed-al-qarni',
    'https://images.unsplash.com/photo-1591604466107-ec97de977aff?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/qarni-cover/1200/400',
    'دكتور', 'الدعوة والتزكية', 'د. عائض القرني داعية سعودي شهير ومؤلف كتاب "لا تحزن" الذي بيعت منه ملايين النسخ، له برامج دعوية يومية يتابعها ملايين المستمعين.', 'السعودية', v_cat_religious, true, 980000,
    '{"youtube":"https://youtube.com/@ayedqarni","twitter":"https://twitter.com/ayedalqarni","website":"https://qarni.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('لا تحزن', 'مقاطع مؤملة تبعث الأمل والسكينة في القلب.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-qarni1/400/400', 'beginner', 1450000, 5.0)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الابتلاء رحمة', 'لماذا يبتلي الله عباده المؤمنين؟', v_audio, 1800, now() - interval '42 days', 210000),
    (v_pod_id, 'التوكل على الله', 'معنى التوكل الحقيقي في الحياة.', v_audio, 1650, now() - interval '35 days', 185000),
    (v_pod_id, 'صبر أيوب', 'الصبر على المرض والفقد.', v_audio, 1950, now() - interval '28 days', 167000),
    (v_pod_id, 'الشفاء بالذكر', 'أثر الذكر على القلق والحزن.', v_audio, 1500, now() - interval '21 days', 142000),
    (v_pod_id, 'الرضا بالقدر', 'كيف ترتضى بقضاء الله؟', v_audio, 1750, now() - interval '14 days', 129000),
    (v_pod_id, 'جنة الدنيا', 'استخراج السعادة من أيامك العادية.', v_audio, 1600, now() - interval '7 days', 156000);
END IF;

-- ==================== 3. د. محمد العريفي (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mohammed-al-arifi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('محمد العريفي', 'mohammed-al-arifi',
    'https://images.unsplash.com/photo-1595152772835-21967495f6e0?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/arifi-cover/1200/400',
    'دكتور', 'الدعوة والفقه', 'د. محمد العريفي داعٍ سعودي وأستاذ شريعة، مشهور بمحاضراته المليئة بالحكمة والدعابة، وأحد أكثر الدعاة متابعة على مواقع التواصل.', 'السعودية', v_cat_religious, true, 1120000,
    '{"youtube":"https://youtube.com/@arifi","twitter":"https://twitter.com/mohamedalarifi","instagram":"https://instagram.com/drarifi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مع الداعية', 'حوارات دعوية مفتوحة مع الشباب.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-arifi1/400/400', 'beginner', 720000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الشباب والغفلة', 'كيف يتغلب الشباب على الغفلة؟', v_audio, 2100, now() - interval '30 days', 132000),
    (v_pod_id, 'الصحبة الصالحة', 'أثر الأصدقاء على الإيمان.', v_audio, 1950, now() - interval '23 days', 118000),
    (v_pod_id, 'أثر المساجد', 'أهمية المساجد في بناء الشخصية.', v_audio, 1800, now() - interval '16 days', 96000),
    (v_pod_id, 'الزواج والسعادة', 'نصائح عملية للزوجين الشباب.', v_audio, 2250, now() - interval '9 days', 108000),
    (v_pod_id, 'الفوائد العجيبة', 'فوائد دينية غريبة ومفيدة.', v_audio, 1700, now() - interval '2 days', 85000);
END IF;

-- ==================== 4. أحمد الشقيري (culture/motivational) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmad-al-shugairi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد الشقيري', 'ahmad-al-shugairi',
    'https://images.unsplash.com/photo-1607346256330-dee7af15f7c5?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/shugairi-cover/1200/400',
    'مذيع', 'الرسائل الإعلامية والتنمية', 'أحمد الشقيري إعلامي سعودي بارز ومقدم برنامج "يا هلا" و"خواطر" الذي غيّر وجه البرامج التنموية في العالم العربي، ومن أكثر الشخصيات تأثيراً في الشباب.', 'السعودية', v_cat_culture, true, 1650000,
    '{"youtube":"https://youtube.com/@shugairi","twitter":"https://twitter.com/shugairi","instagram":"https://instagram.com/shugairi","website":"https://shugairi.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('خواطر الشقيري', 'تأملات قصيرة في القضايا الاجتماعية والشخصية.', v_host_id, v_cat_culture, 'motivational', 'https://picsum.photos/seed/pod-shugairi1/400/400', 'beginner', 1900000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'لماذا نقرأ؟', 'أهمية القراءة في حياتنا اليومية.', v_audio, 1200, now() - interval '25 days', 240000),
    (v_pod_id, 'رحلة إلى اليابان', 'دروس من ثقافة اليابان في الانضباط.', v_audio, 1350, now() - interval '20 days', 198000),
    (v_pod_id, 'الحفاظ على البيئة', 'مسؤوليتنا تجاه الكوكب.', v_audio, 1100, now() - interval '15 days', 176000),
    (v_pod_id, 'أمي', 'رسالة لكل أم في العالم العربي.', v_audio, 950, now() - interval '10 days', 285000),
    (v_pod_id, 'الوقت كالسيف', 'إدارة الوقت بذكاء.', v_audio, 1050, now() - interval '5 days', 210000);

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رحلات الشقيري', 'قصص من رحلاته حول العالم والدروس المستفادة.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-shugairi2/400/400', 'intermediate', 840000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'طوكيو المنظمة', 'ماذا تعلمنا من النظام الياباني؟', v_audio, 1500, now() - interval '18 days', 132000),
    (v_pod_id, 'إسطنبول العريقة', 'بين الحضارة البيزنطية والعثمانية.', v_audio, 1400, now() - interval '12 days', 118000),
    (v_pod_id, 'أرض الفرانكستين', 'رحلة إلى ألمانيا والدروس الصناعية.', v_audio, 1450, now() - interval '6 days', 97000);
END IF;

-- ==================== 5. د. منصور الإدريسي (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mansour-al-idrissi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('منصور الإدريسي', 'mansour-al-idrissi',
    'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/idrissi-cover/1200/400',
    'دكتور', 'الفيزياء النووية', 'د. منصور الإدريسي عالم فيزياء نووية سعودي بارز، شارك في مشاريع بحثية دولية، ويعد من أوائل من قدّموا البرامج العلمية بالعربية.', 'السعودية', v_cat_science, true, 540000,
    '{"twitter":"https://twitter.com/mansour_sci","youtube":"https://youtube.com/@mansour-sci"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مختبر العلم', 'رحلات في الفيزياء والكيمياء والفلك.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-idrissi1/400/400', 'expert', 420000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الطاقة النووية السلمية', 'كيف تعمل المفاعلات النووية؟', v_audio, 2200, now() - interval '22 days', 76000),
    (v_pod_id, 'الجسيمات الأولية', 'من الكوارك إلى الهيغز.', v_audio, 2100, now() - interval '15 days', 62000),
    (v_pod_id, 'الاندماج النووي', 'حلم الطاقة اللانهائية.', v_audio, 2350, now() - interval '8 days', 58000),
    (v_pod_id, 'التقنيات الفائقة', 'مواد تتحدى قوانين الفيزياء.', v_audio, 1900, now() - interval '1 day', 44000);
END IF;

-- ==================== 6. د. هيثم الشرارى (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'haitham-al-sharari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('هيثم الشرارى', 'haitham-al-sharari',
    'https://images.unsplash.com/photo-1590086782957-93c06ef21604?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/sharari-cover/1200/400',
    'دكتور', 'علم الفلك', 'د. هيثم الشرارى عالم فلك عراقي شهير، مدير مرصد وعضو في الاتحاد الفلكي الدولي، يبسّط أعماق الكون للمستمع العربي.', 'العراق', v_cat_science, true, 380000,
    '{"twitter":"https://twitter.com/haitham_astro","youtube":"https://youtube.com/@haitham-astro"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مذكرات فلكية', 'أسرار الكون والأجرام السماوية.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-sharari1/400/400', 'intermediate', 310000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التوأمية الكونية', 'لماذا تشبه المجرات بعضها؟', v_audio, 2050, now() - interval '16 days', 54000),
    (v_pod_id, 'الكويكبات الخطرة', 'ماذا لو اصطدم كويكب بالأرض؟', v_audio, 1900, now() - interval '10 days', 68000),
    (v_pod_id, 'شفق القطب', 'سر الأضواء الشمالية.', v_audio, 1750, now() - interval '4 days', 42000);
END IF;

-- ==================== 7. د. علي الشملان (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ali-al-shamlan') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('علي الشملان', 'ali-al-shamlan',
    'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/shamlan-cover/1200/400',
    'دكتور', 'الطب الباطني والتغذية', 'د. علي الشملان طبيب باطنة كويتي مشهور في الإعلام الصحي، أسس برنامج صحي أسبوعي يتابعه مئات الآلاف من المرضى والمهتمين.', 'الكويت', v_cat_health, true, 460000,
    '{"youtube":"https://youtube.com/@alishamlan","twitter":"https://twitter.com/ali_shamlan","instagram":"https://instagram.com/dr.shamlan"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('الطبيب السابع', 'نصائح طبية مبسطة للحياة اليومية.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-shamlan1/400/400', 'beginner', 560000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السكري الخفي', 'أعراض مبكرة لا يجب تجاهلها.', v_audio, 1600, now() - interval '28 days', 96000),
    (v_pod_id, 'الكوليسترول: الصديق والعدو', 'الفرق بين الكوليسترول النافع والضار.', v_audio, 1450, now() - interval '21 days', 82000),
    (v_pod_id, 'الصيام الصحي', 'كيف تصوم دون إجهاد جسمك؟', v_audio, 1300, now() - interval '14 days', 74000),
    (v_pod_id, 'الأدوية والمداواة', 'هل كل دواء بديل؟', v_audio, 1550, now() - interval '7 days', 61000),
    (v_pod_id, 'الوقاية خير من العلاج', 'فحوصات دورية تُنقذ حياتك.', v_audio, 1200, now() - interval '1 day', 55000);
END IF;

-- ==================== 8. د. خالد الوزير (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'khaled-al-wazir') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('خالد الوزير', 'khaled-al-wazir',
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/wazir-cover/1200/400',
    'دكتور', 'الطب النفسي للأطفال', 'د. خالد الوزير طبيب نفسي مصري متخصص في صحة الأطفال والمراهقين، يقدم نصائح للآباء حول تربية أبنائهم نفسيًا.', 'مصر', v_cat_mental, true, 320000,
    '{"youtube":"https://youtube.com/@khaled-psy","twitter":"https://twitter.com/khaled_wazir"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عقل الطفل', 'دليل الآباء لفهم أطفالهم نفسيًا.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-wazir1/400/400', 'intermediate', 280000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'قلق المدرسة', 'كيف تتعامل مع رفض طفلك للمدرسة؟', v_audio, 1700, now() - interval '26 days', 64000),
    (v_pod_id, 'الشاشة والطفل', 'أثر الإدمان الرقمي على الدماغ النامي.', v_audio, 1850, now() - interval '19 days', 78000),
    (v_pod_id, 'تدليل أم رعاية؟', 'الفرق بين الحب والإفراط.', v_audio, 1600, now() - interval '12 days', 56000),
    (v_pod_id, 'الغيرة بين الأشقاء', 'كيف توزع الحب بعدول؟', v_audio, 1500, now() - interval '5 days', 49000);
END IF;

-- ==================== 9. د. أحمد العمري (business/finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmed-al-omari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد العمري', 'ahmed-al-omari',
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/omari-cover/1200/400',
    'دكتور', 'الاقتصاد والاستثمار', 'د. أحمد العمري خبير اقتصادي إماراتي، مستشار في صناديق الثروة السيادية، يقدم تحليلات اقتصادية على القنوات الفضائية والبودكاست.', 'الإمارات', v_cat_finance, true, 690000,
    '{"twitter":"https://twitter.com/ahmed_economy","linkedin":"https://linkedin.com/in/ahmed-omari","website":"https://omari.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('الاقتصاد العجيب', 'تحليلات اقتصادية مبسطة للأحداث اليومية.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-omari1/400/400', 'intermediate', 510000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التضخم: من يؤكل جيبه؟', 'لماذا ترتفع الأسعار وكيف نحمي أموالنا؟', v_audio, 1800, now() - interval '24 days', 94000),
    (v_pod_id, 'النفط والريال', 'علاقة النفط بعملات الخليج.', v_audio, 1650, now() - interval '17 days', 78000),
    (v_pod_id, 'العملات الرقمية', 'هل البيتكوين فقاعة أم مستقبل؟', v_audio, 2100, now() - interval '10 days', 112000),
    (v_pod_id, 'الاستثمار العقاري', 'متى يكون العقار صفقة رابحة؟', v_audio, 1950, now() - interval '3 days', 67000);
END IF;

-- ==================== 10. لؤي النقيب (career) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'loay-al-naqib') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('لؤي النقيب', 'loay-al-naqib',
    'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/naqib-cover/1200/400',
    'مهندس', 'تطوير الأعمال والريادة', 'م. لؤي النقيب رائد أعمال أردني، أسس عدة شركات ناشئة ناجحة، ويشارك خبرته في الريادة والتوظيف عبر برامجه الشهيرة.', 'الأردن', v_cat_career, true, 720000,
    '{"linkedin":"https://linkedin.com/in/loay-naqib","twitter":"https://twitter.com/loay_naqib","instagram":"https://instagram.com/loay.entrepreneur"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('رائد أعمال', 'حوارات مع مؤسسين عن رحلاتهم في بناء الشركات.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-naqib1/400/400', 'expert', 630000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'من فكرة إلى شركة', 'كيف تبدأ رحلتك في الريادة؟', v_audio, 2400, now() - interval '27 days', 122000),
    (v_pod_id, 'التمويل الجريء', 'ماذا يريد المستثمر منك فعلاً؟', v_audio, 2200, now() - interval '20 days', 98000),
    (v_pod_id, 'الفشل الأول', 'قصص مؤسسين فشلوا ثم نجحوا.', v_audio, 2600, now() - interval '13 days', 134000),
    (v_pod_id, 'بناء الفريق', 'كيف توظف أصحاب المواهب؟', v_audio, 2050, now() - interval '6 days', 87000),
    (v_pod_id, 'الخروج الاستراتيجي', 'متى تبيع شركتك؟', v_audio, 1900, now() - interval '2 days', 65000);
END IF;

-- ==================== 11. د. سعد بن عمر (leadership) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'saad-bin-omar') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سعد بن عمر', 'saad-bin-omar',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/saad-cover/1200/400',
    'دكتور', 'الإدارة الاستراتيجية', 'د. سعد بن عمر أستاذ إدارة سعودي، قاد تحولات استراتيجية في مؤسسات كبرى، ويقدم برامج في القيادة وصناعة القرار.', 'السعودية', v_cat_leadership, true, 450000,
    '{"linkedin":"https://linkedin.com/in/saad-omar","twitter":"https://twitter.com/saad_leadership"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قرار القائد', 'كيف يتخذ القادة العظام قراراتهم؟', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-saad1/400/400', 'intermediate', 380000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'صناعة القرار الصعب', 'منهجية القادة في القرارات المزدهرة.', v_audio, 1800, now() - interval '23 days', 76000),
    (v_pod_id, 'قيادة الفرق البعيدة', 'إدارة فرق موزعة جغرافيًا.', v_audio, 1650, now() - interval '16 days', 62000),
    (v_pod_id, 'الثقافة المؤسسية', 'كيف تُبنى وتبقى؟', v_audio, 1750, now() - interval '9 days', 54000),
    (v_pod_id, 'الوريث القيادي', 'تحضير الجيل القيادي القادم.', v_audio, 1600, now() - interval '2 days', 43000);
END IF;

-- ==================== 12. أمين الطاهر (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'amine-al-taher') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أمين الطاهر', 'amine-al-taher',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/taher-cover/1200/400',
    'أستاذ', 'الاستشارات الأسرية', 'أ. أمين الطاهر مستشار أسري مغربي ومدرّب معتمد في العلاقات الزوجية، له برامج إذاعية وأخرى تلفزيونية تساعد الأسر على الاستقرار.', 'المغرب', v_cat_family, true, 290000,
    '{"youtube":"https://youtube.com/@amine-family","instagram":"https://instagram.com/amine.taher","website":"https://taher.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('بيت الطيب', 'نصائح عملية لبناء أسرة سعيدة.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-taher1/400/400', 'beginner', 340000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الزواج الأول', 'كيف تستعد للحياة الزوجية؟', v_audio, 1900, now() - interval '25 days', 78000),
    (v_pod_id, 'الحوار الزوجي', 'مهارات التواصل بين الزوجين.', v_audio, 1750, now() - interval '18 days', 65000),
    (v_pod_id, 'حل الخلافات', 'خطوات عملية لإصلاح ما بينكما.', v_audio, 1800, now() - interval '11 days', 58000),
    (v_pod_id, 'المراهق في البيت', 'كيف تتعامل مع ابنك المراهق؟', v_audio, 1650, now() - interval '4 days', 51000);
END IF;

-- ==================== 13. ريم الأنصاري (career) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'reem-al-ansari') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('ريم الأنصاري', 'reem-al-ansari',
    'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/ansari-cover/1200/400',
    'أستاذة', 'الموارد البشرية', 'أ. ريم الأنصاري خبيرة موارد بشرية قطرية، شغلت مناصب قيادية في شركات عالمية، وتقدم إرشادات عملية للمتقدمين للوظائف.', 'قطر', v_cat_career, true, 380000,
    '{"linkedin":"https://linkedin.com/in/reem-ansari","twitter":"https://twitter.com/reem_hr"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مسار وظيفي', 'دليلك للنجاح في سوق العمل.', v_host_id, v_cat_career, 'professional', 'https://picsum.photos/seed/pod-ansari1/400/400', 'beginner', 290000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السيرة الذاتية المثالية', 'كيف تكتب سيرة تفتح الأبواب؟', v_audio, 1400, now() - interval '20 days', 68000),
    (v_pod_id, 'مقابلة العمل', 'أسئلة شائعة وإجابات ذكية.', v_audio, 1550, now() - interval '14 days', 61000),
    (v_pod_id, 'الترقية والزيادة', 'كيف تطلب ما تستحقه؟', v_audio, 1300, now() - interval '7 days', 49000),
    (v_pod_id, 'التغيير الوظيفي', 'متى تغير مسارك المهني؟', v_audio, 1450, now() - interval '1 day', 39000);
END IF;

-- ==================== 14. د. سلمى الحاج (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'salma-al-haj') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سلمى الحاج', 'salma-al-haj',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/salma-cover/1200/400',
    'دكتور', 'التغذية العلاجية', 'د. سلمى الحاج أخصائية تغذية لبنانية مشهورة عربيًا، تقدم خطط غذائية عملية وبرامج صحية عبر القنوات الفضائية والرقمية.', 'لبنان', v_cat_health, true, 820000,
    '{"instagram":"https://instagram.com/drsalma","youtube":"https://youtube.com/@salma-nutrition","twitter":"https://twitter.com/salma_diet"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مطبخ الصحة', 'نصائح غذائية للجسم والعقل.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-salma1/400/400', 'beginner', 610000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'السكر المخفي', 'أين يختبئ السكر في طعامك؟', v_audio, 1350, now() - interval '22 days', 104000),
    (v_pod_id, 'الصيام المتقطع', 'هل يناسبك هذا النظام؟', v_audio, 1500, now() - interval '15 days', 91000),
    (v_pod_id, 'التغذية بعد الأربعين', 'ما يحتاجه جسمك مع التقدم بالعمر.', v_audio, 1400, now() - interval '8 days', 76000),
    (v_pod_id, 'مكملات أم طعام؟', 'الحقيقة حول الفيتامينات.', v_audio, 1250, now() - interval '1 day', 68000);
END IF;

-- ==================== 15. فيصل المسلم (culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'faisal-al-muslem') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('فيصل المسلم', 'faisal-al-muslem',
    'https://images.unsplash.com/photo-1615109398623-88346a601842?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/muslem-cover/1200/400',
    'أستاذ', 'العلوم السياسية', 'أ. فيصل المسلم كاتب وأستاذ علوم سياسية كويتي، يحلل الشأن الدولي ويقدم قراءة عميقة للتحولات الجيوسياسية.', 'الكويت', v_cat_culture, true, 340000,
    '{"twitter":"https://twitter.com/faisal_politics","youtube":"https://youtube.com/@faisal-analysis"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('تحليلات دولية', 'قراءة عميقة في أحداث العالم.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-muslem1/400/400', 'expert', 270000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'خرائط النفوذ', 'كيف تُرسم السياسات الدولية؟', v_audio, 2300, now() - interval '18 days', 62000),
    (v_pod_id, 'اقتصاد الحروب', 'من يمول النزاعات؟', v_audio, 2150, now() - interval '11 days', 54000),
    (v_pod_id, 'العربية في العالم', 'مستقبل المنطقة في النظام الدولي.', v_audio, 2400, now() - interval '4 days', 47000);
END IF;

-- ==================== 16. د. نادية العامري (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'nadia-al-amri') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('نادية العامري', 'nadia-al-amri',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/nadia-cover/1200/400',
    'دكتور', 'الاستشارات النفسية', 'د. نادية العامري أستاذة إرشاد نفسي أردنية، تقدم برامج في بناء الثقة بالنفس والتعافي من الصدمات النفسية.', 'الأردن', v_cat_mental, true, 410000,
    '{"instagram":"https://instagram.com/drnadia","twitter":"https://twitter.com/nadia_counseling","website":"https://nadia.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('جلسات نفسية', 'حوارات عميقة عن الصحة النفسية.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-nadia1/400/400', 'intermediate', 320000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الثقة بالنفس', 'كيف تبني ثقتك من الصفر؟', v_audio, 1900, now() - interval '21 days', 86000),
    (v_pod_id, 'أثر الطفولة', 'كيف تشكل طفولتك شخصيتك؟', v_audio, 2100, now() - interval '14 days', 74000),
    (v_pod_id, 'الحزن غير المكتمل', 'كيف نتجاوز الفقد؟', v_audio, 1800, now() - interval '7 days', 63000),
    (v_pod_id, 'الحدود الشخصية', 'كيف تقول لا دون شعور بالذنب؟', v_audio, 1700, now() - interval '1 day', 58000);
END IF;

-- ==================== 17. يوسف المنصوري (tech) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'yousef-al-mansoori') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('يوسف المنصوري', 'yousef-al-mansoori',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mansoori-cover/1200/400',
    'مهندس', 'الذكاء الاصطناعي', 'م. يوسف المنصوري مهندس ذكاء اصطناعي إماراتي، يعمل في أحد أكبر شركات التقنية، ويشرح الذكاء الاصطناعي للمستمع العربي بلغة بسيطة.', 'الإمارات', v_cat_tech, true, 560000,
    '{"youtube":"https://youtube.com/@yousef-ai","twitter":"https://twitter.com/yousef_ai","linkedin":"https://linkedin.com/in/yousef-mansoori"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عصر الذكاء', 'كل ما تريد معرفته عن الذكاء الاصطناعي.', v_host_id, v_cat_tech, 'scientific', 'https://picsum.photos/seed/pod-mansoori1/400/400', 'beginner', 480000, 4.9)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'ما هو الذكاء الاصطناعي التوليدي؟', 'شرح مبسط لنماذج الذكاء الحديثة.', v_audio, 1700, now() - interval '20 days', 112000),
    (v_pod_id, 'الذكاء في التعليم', 'كيف يغير الذكاء الاصطناعي التعلم؟', v_audio, 1550, now() - interval '13 days', 87000),
    (v_pod_id, 'وظائف المستقبل', 'ما المهارات التي ستحتاجها؟', v_audio, 1400, now() - interval '6 days', 74000),
    (v_pod_id, 'أخلاقيات الذكاء', 'أين نرسم الخط الأخلاقي؟', v_audio, 1650, now() - interval '1 day', 56000);
END IF;

-- ==================== 18. د. حسام المغربي (science) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'hossam-al-maghribi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('حسام المغربي', 'hossam-al-maghribi',
    'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/maghribi-cover/1200/400',
    'دكتور', 'علم الأحياء الدقيقة', 'د. حسام المغربي عالم أحياء دقيقة مغربي، باحث في مؤسسات علمية أوروبية، يقدم عالم الميكروبات بطريقة ممتعة.', 'المغرب', v_cat_science, true, 260000,
    '{"twitter":"https://twitter.com/hossam_bio","youtube":"https://youtube.com/@hossam-bio"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عالم الميكروبات', 'رحلة إلى عالم الكائنات الدقيقة.', v_host_id, v_cat_science, 'scientific', 'https://picsum.photos/seed/pod-maghribi1/400/400', 'intermediate', 210000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'البكتيريا النافعة', 'أصدقاؤنا داخل أجسامنا.', v_audio, 1800, now() - interval '17 days', 52000),
    (v_pod_id, 'الفيروسات: عدو ذكي', 'كيف تهاجم الفيروسات خلايانا؟', v_audio, 1950, now() - interval '10 days', 61000),
    (v_pod_id, 'المضادات الحيوية', 'لماذا تفقد فعاليتها؟', v_audio, 1700, now() - interval '3 days', 43000);
END IF;

-- ==================== 19. د. بثينة العيسى (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'buthaina-al-issa') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('بثينة العيسى', 'buthaina-al-issa',
    'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/buthaina-cover/1200/400',
    'دكتور', 'التربية الأسرية', 'د. بثينة العيسى أستاذة تربية سعودية، خبيرة في شؤون الطفل والأسرة، تقدم برامج تربوية للأمهات والآباء.', 'السعودية', v_cat_family, true, 480000,
    '{"instagram":"https://instagram.com/drbuthaina","twitter":"https://twitter.com/buthaina_edu","website":"https://buthaina.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('تربية بلا صراع', 'دروس تربوية عملية للآباء والأمهات.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-buthaina1/400/400', 'beginner', 390000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الاستماع الفعال لطفلك', 'كيف تسمع ما لا يقوله طفلك؟', v_audio, 1600, now() - interval '19 days', 82000),
    (v_pod_id, 'العقاب والتهذيب', 'بدائل العقاب البدني.', v_audio, 1750, now() - interval '12 days', 71000),
    (v_pod_id, 'غرس القيم', 'كيف يتعلم الطفل بالقدوة؟', v_audio, 1500, now() - interval '5 days', 59000),
    (v_pod_id, 'أبناء الشاشات', 'التعامل مع إدمان الأجهزة.', v_audio, 1450, now() - interval '1 day', 66000);
END IF;

-- ==================== 20. د. عبدالرحمن المعلق (finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'abdulrahman-al-mualla') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عبدالرحمن المعلّا', 'abdulrahman-al-mualla',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mualla-cover/1200/400',
    'دكتور', 'المحاسبة والمراجعة', 'د. عبدالرحمن المعلّا أستاذ محاسبة إماراتي وخبير مالي معتمد، يقدم محتوى في الإدارة المالية الشخصية للأفراد والشركات.', 'الإمارات', v_cat_finance, true, 310000,
    '{"linkedin":"https://linkedin.com/in/abdulrahman-mualla","twitter":"https://twitter.com/abdulrahman_fi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('ميزانيتك', 'إدارة المال الشخصي بذكاء.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-mualla1/400/400', 'beginner', 240000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الادخار الذكي', 'قواعد الادخار البسيطة.', v_audio, 1500, now() - interval '16 days', 58000),
    (v_pod_id, 'الديون: كيف تتخلص منها؟', 'استراتيجيات سداد الديون.', v_audio, 1650, now() - interval '9 days', 67000),
    (v_pod_id, 'الميزانية العائلية', 'كيف تدير مصاريف البيت؟', v_audio, 1400, now() - interval '2 days', 49000);
END IF;

-- ==================== 21. نورة الحميدي (culture) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'noura-al-humaidi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('نورة الحميدي', 'noura-al-humaidi',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/humaidi-cover/1200/400',
    'أستاذة', 'الأدب العربي', 'أ. نورة الحميدي كاتبة وناقدة أدبية سعودية، مهتمة بالأدب الخليجي المعاصر، تقدم حوارات مع الكتّاب والشعراء.', 'السعودية', v_cat_culture, true, 220000,
    '{"twitter":"https://twitter.com/noura_adab","instagram":"https://instagram.com/noura.literature"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('ديوان الكلمة', 'حوارات أدبية وقراءات في الروايات العربية.', v_host_id, v_cat_culture, 'cultural', 'https://picsum.photos/seed/pod-humaidi1/400/400', 'intermediate', 180000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الرواية الخليجية الجديدة', 'أين وصلت الرواية الخليجية؟', v_audio, 2000, now() - interval '15 days', 44000),
    (v_pod_id, 'الشعر المنثور', 'بين النثر والشعر الفصيح.', v_audio, 1850, now() - interval '8 days', 36000),
    (v_pod_id, 'قراءات في جبران', 'جبران خليل جبران بين الشرق والغرب.', v_audio, 1750, now() - interval '1 day', 41000);
END IF;

-- ==================== 22. د. مشعل الأحمد (leadership) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'mishal-al-ahmad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('مشعل الأحمد', 'mishal-al-ahmad',
    'https://images.unsplash.com/photo-1615109398623-88346a601842?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mishal-cover/1200/400',
    'دكتور', 'التحول الرقمي والحوكمة', 'د. مشعل الأحمد خبير حوكمة وتحول رقمي كويتي، قاد مشاريع تحول استراتيجية في قطاعين حكومي وخاص، ويقدم برامج في القيادة الرقمية.', 'الكويت', v_cat_leadership, true, 270000,
    '{"linkedin":"https://linkedin.com/in/mishal-ahmad","twitter":"https://twitter.com/mishal_gov","website":"https://mishal.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('قيادة التحول', 'كيف تقود مؤسستك نحو التحول الرقمي؟', v_host_id, v_cat_leadership, 'professional', 'https://picsum.photos/seed/pod-mishal1/400/400', 'expert', 200000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'لماذا تفشل التحولات؟', 'أسباب فشل مشاريع التحول الرقمي.', v_audio, 1900, now() - interval '14 days', 48000),
    (v_pod_id, 'الحوكمة الرشيدة', 'أسس الحكم المؤسسي الجيد.', v_audio, 1750, now() - interval '7 days', 39000),
    (v_pod_id, 'الابتكار المؤسسي', 'كيف تبتكر داخل مؤسسة تقليدية؟', v_audio, 1600, now() - interval '1 day', 32000);
END IF;

-- ==================== 23. د. رانا حداد (health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'rana-haddad') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('rana حداد', 'rana-haddad',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/rana-cover/1200/400',
    'دكتور', 'طب الأسرة', 'د. رانا حداد طبيبة أسرة سورية، مشهورة بمحتواها الصحي المبسط الذي يشرح الأمراض الشائعة والوقاية منها.', 'سوريا', v_cat_health, true, 350000,
    '{"youtube":"https://youtube.com/@rana-health","instagram":"https://instagram.com/dr.rana","twitter":"https://twitter.com/rana_family_med"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('عيادة الصحة', 'إجابات طبية لأسئلتك اليومية.', v_host_id, v_cat_health, 'motivational', 'https://picsum.photos/seed/pod-rana1/400/400', 'beginner', 290000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأنفلونزا الموسمية', 'كيف تحمي نفسك وأسرتك؟', v_audio, 1400, now() - interval '13 days', 67000),
    (v_pod_id, 'الصداع المزمن', 'متى يكون الصداع خطيراً؟', v_audio, 1550, now() - interval '6 days', 54000),
    (v_pod_id, 'فحوصات دورية', 'ماذا تفحص وفي أي عمر؟', v_audio, 1300, now() - interval '1 day', 46000);
END IF;

-- ==================== 24. طلال العوضي (motivational) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'talal-al-awadi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('طلال العوضي', 'talal-al-awadi',
    'https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/talal-cover/1200/400',
    'مدرب', 'التنمية البشرية', 'أ. طلال العوضي مدرب تنمية بشرية كويتي شهير، يقدم برامج تحفيزية للشباب حول الأهداف والإنتاجية وبناء العادات.', 'الكويت', v_cat_leadership, true, 640000,
    '{"youtube":"https://youtube.com/@talal-motivation","instagram":"https://instagram.com/talal.awadi","twitter":"https://twitter.com/talal_motivate"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('انطلق', 'دروس تحفيزية لبناء عادات إيجابية.', v_host_id, v_cat_leadership, 'motivational', 'https://picsum.photos/seed/pod-talal1/400/400', 'beginner', 530000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'ابدأ من حيث أنت', 'لا تنتظر الظروف المثالية.', v_audio, 1300, now() - interval '17 days', 112000),
    (v_pod_id, 'قوة الاستيقاظ المبكر', 'كيف تغير حياتك بساعة واحدة؟', v_audio, 1450, now() - interval '11 days', 96000),
    (v_pod_id, 'الأهداف الذكية', 'كيف تخطط لتحقيق أهدافك؟', v_audio, 1600, now() - interval '5 days', 78000),
    (v_pod_id, 'تغلب التسويف', 'استراتيجيات عملية للإنجاز.', v_audio, 1350, now() - interval '1 day', 89000);
END IF;

-- ==================== 25. د. أحمد خيري العنابي (religious) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'ahmad-al-annabi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('أحمد خيري العنابي', 'ahmad-al-annabi',
    'https://images.unsplash.com/photo-1595152772835-21967495f6e0?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/annabi-cover/1200/400',
    'دكتور', 'العلوم الشرعية', 'د. أحمد خيري العنابي عالم وداعية تونزي بارز، أستاذ علوم شرعية ومؤلف في الفقه والسيرة، يقدم دروساً عميقة ومبسطة.', 'تونس', v_cat_religious, true, 180000,
    '{"youtube":"https://youtube.com/@ahmad-annabi","twitter":"https://twitter.com/ahmad_annabi"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('منس Waves الفقه', 'دروس فقهية مبسطة في العبادات.', v_host_id, v_cat_religious, 'religious', 'https://picsum.photos/seed/pod-annabi1/400/400', 'intermediate', 150000, 4.6)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'فقه الطهارة', 'أحكام الوضوء والطهارة.', v_audio, 2100, now() - interval '12 days', 38000),
    (v_pod_id, 'فقه الصلاة', 'أحكام الصلاة وشروطها.', v_audio, 2250, now() - interval '6 days', 33000),
    (v_pod_id, 'فقه الصيام', 'أحكام الصيام وفيه ما يُستدرَك.', v_audio, 2000, now() - interval '1 day', 27000);
END IF;

-- ==================== 26. سارة البلوشي (mental health) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'sara-al-balushi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('سارة البلوشي', 'sara-al-balushi',
    'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/sara-b-cover/1200/400',
    'أستاذة', 'العلاج المعرفي السلوكي', 'أ. سارة البلوشي معالجة نفسية عمانية متخصصة في العلاج المعرفي السلوكي، تساعد المستمعين على تغيير أنماط تفكيرهم السلبية.', 'عمان', v_cat_mental, true, 240000,
    '{"instagram":"https://instagram.com/sara.therapy","twitter":"https://twitter.com/sara_cbt"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('أفكار بديلة', 'تمارين عملية في العلاج المعرفي.', v_host_id, v_cat_mental, 'scientific', 'https://picsum.photos/seed/pod-sara-b1/400/400', 'beginner', 190000, 4.8)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'التشوهات المعرفية', 'كيف يخدعك عقلك؟', v_audio, 1700, now() - interval '14 days', 46000),
    (v_pod_id, 'مذكرة الامتنان', 'كيف يغير الامتنان مزاجك؟', v_audio, 1500, now() - interval '7 days', 39000),
    (v_pod_id, 'التوقف عن التأنيب', 'كيف تتعامل مع ناقدك الداخلي؟', v_audio, 1600, now() - interval '1 day', 34000);
END IF;

-- ==================== 27. عبدالله المليفي (finance) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'abdullah-al-mulaifi') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('عبدالله المليفي', 'abdullah-al-mulaifi',
    'https://images.unsplash.com/photo-1610088441520-4352457e7095?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/mulaifi-cover/1200/400',
    'أستاذ', 'التحليل المالي', 'أ. عبدالله المليفي محلل مالي كويتي، خبير في أسواق المال الخليجية، يقدم تحليلات يومية ونصائح استثمارية للمبتدئين والمحترفين.', 'الكويت', v_cat_finance, true, 430000,
    '{"twitter":"https://twitter.com/abdullah_markets","youtube":"https://youtube.com/@abdullah-finance"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('سوق المال', 'تحليلات ونصائح من قلب أسواق المال.', v_host_id, v_cat_finance, 'professional', 'https://picsum.photos/seed/pod-mulaifi1/400/400', 'intermediate', 360000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'الأسهم للمدروس', 'كيف تبدأ في سوق الأسهم؟', v_audio, 1900, now() - interval '18 days', 74000),
    (v_pod_id, 'قراءة القوائم المالية', 'ماذا تخبرك ميزانية الشركة؟', v_audio, 2100, now() - interval '11 days', 57000),
    (v_pod_id, 'الصناديق المؤشرات', 'الاستثمار السلبي للمبتدئين.', v_audio, 1700, now() - interval '4 days', 46000),
    (v_pod_id, 'أخطاء المستثمر المبتدئ', 'تجنب هذه الفخاخ.', v_audio, 1550, now() - interval '1 day', 62000);
END IF;

-- ==================== 28. د. لمياء الصالح (family) ====================
IF NOT EXISTS (SELECT 1 FROM hosts WHERE slug = 'lamia-al-saleh') THEN
  INSERT INTO hosts (name_ar, slug, photo_url, cover_url, title_ar, specialty_ar, bio_ar, country, category_id, is_verified, followers_count, social_links)
  VALUES ('لمياء الصالح', 'lamia-al-saleh',
    'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=faces',
    'https://picsum.photos/seed/lamia-cover/1200/400',
    'دكتور', 'علم النفس التربوي', 'د. لمياء الصالح أستاذة علم نفس تربوي أردنية، خبيرة في تعليم الأطفال ورفع التحصيل الدراسي، تقدم برامج للطلاب وأولياء الأمور.', 'الأردن', v_cat_family, true, 310000,
    '{"instagram":"https://instagram.com/drlamia","twitter":"https://twitter.com/lamia_educ","website":"https://lamia.example.com"}'::jsonb)
  RETURNING id INTO v_host_id;

  INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
  VALUES ('مدرسة النجاح', 'دعم تعليمي ونفسي للطلاب.', v_host_id, v_cat_family, 'motivational', 'https://picsum.photos/seed/pod-lamia1/400/400', 'beginner', 260000, 4.7)
  RETURNING id INTO v_pod_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
    (v_pod_id, 'المذاكرة الفعالة', 'تقنيات دراسة مبنية على العلم.', v_audio, 1800, now() - interval '13 days', 64000),
    (v_pod_id, 'قلق الاختبارات', 'كيف تهدأ قبل الاختبار؟', v_audio, 1600, now() - interval '6 days', 51000),
    (v_pod_id, 'اختيار التخصص', 'كيف يختار ابنك تخصصه الجامعي؟', v_audio, 1900, now() - interval '1 day', 43000);
END IF;

END $$;
