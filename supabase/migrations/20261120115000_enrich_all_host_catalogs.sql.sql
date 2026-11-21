/*
# Give every host a complete, professional podcast catalog

- Ensures each host has at least 3 podcasts with 4 episodes each.
- Uses category-specific titles/descriptions so the content matches the host's field.
- Idempotent: only fills the gap, never duplicates existing podcasts.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_host RECORD;
  v_existing int;
  v_index int;
  v_cat_name text;
  v_titles text[];
  v_descs text[];
  v_types text[];
  v_title text;
  v_pod_id uuid;
BEGIN
  FOR v_host IN SELECT id, slug, name_ar, category_id FROM hosts LOOP
    SELECT count(*) INTO v_existing FROM podcasts WHERE host_id = v_host.id;
    CONTINUE WHEN v_existing >= 3;

    SELECT name_ar INTO v_cat_name FROM categories WHERE id = v_host.category_id;

    v_titles := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['تأملات روحية','من قصص السيرة','الإيمان في الحياة']
      WHEN 'العلوم' THEN ARRAY['عقول فضولية','اكتشافات تغيّر العالم','العلم بلغة بسيطة']
      WHEN 'ثقافة وأدب' THEN ARRAY['مساحة ثقافية','قراءات في الأدب','حوارات فكرية']
      WHEN 'الصحة واللياقة' THEN ARRAY['صحة بلا تعقيد','جسدك رسالة','خطوات نحو اللياقة']
      WHEN 'المسيرة المهنية' THEN ARRAY['مسارك المهني','مهارات العمل','قصص من الميدان']
      WHEN 'المال والاستثمار' THEN ARRAY['ثقافة مالية','مال وفكر','قرارات استثمارية']
      WHEN 'العلاقات والأسرة' THEN ARRAY['بيت وعلاقات','فن الحوار الأسري','علاقات أصحّ']
      WHEN 'الصحة النفسية' THEN ARRAY['توازن داخلي','فهم الذات','خطوات هادئة']
      WHEN 'القيادة' THEN ARRAY['قرار القائد','صفات القادة','القيادة بالمثال']
      WHEN 'التقنية' THEN ARRAY['تقنية اليوم','مستقبل رقمي','أدوات ذكية']
      ELSE ARRAY['حوارات ملهمة','مساحة فكر','قصص نجاح']
    END;

    v_descs := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['تأملات قصيرة في المعاني الروحية.', 'دروس مستفادة من سير الأنبياء والصالحين.', 'كيف يترجم الإيمان إلى سلوك يومي.']
      WHEN 'العلوم' THEN ARRAY['رحلة مبسطة في عالم العلم والاكتشاف.', 'أبحاث وابتكارات تقربها من حياتك.', 'شرح أفكار علمية بلغة سهلة.']
      WHEN 'ثقافة وأدب' THEN ARRAY['لقاءات وقراءات في عالم الثقافة.', 'نصوص وأفكار تستحق الوقوف عندها.', 'حوار مفتوح حول القضايا الفكرية.']
      WHEN 'الصحة واللياقة' THEN ARRAY['نصائح عملية لجسد أفضل.', 'الاستماع إلى إشارات جسدك.', 'عادات صغيرة تصنع فرقاً كبيراً.']
      WHEN 'المسيرة المهنية' THEN ARRAY['خطوات عملية لتطوير مسارك المهني.', 'مهارات يطلبها سوق العمل اليوم.', 'تجارب واقعية من أصحاب الخبرة.']
      WHEN 'المال والاستثمار' THEN ARRAY['مفاهيم مالية أساسية بلغة بسيطة.', 'كيف تفكر في المال والقرار.', 'قراءات في الأسواق والفرص.']
      WHEN 'العلاقات والأسرة' THEN ARRAY['بناء علاقات أفضل كل يوم.', 'حوار أسري أكثر هدوءاً ووضوحاً.', 'مساحة لفهم الآخر وتقبّله.']
      WHEN 'الصحة النفسية' THEN ARRAY['أفكار تساعدك على الهدوء والتركيز.', 'رحلة لفهم مشاعرك واحتياجاتك.', 'ممارسات بسيطة لتقليل التوتر.']
      WHEN 'القيادة' THEN ARRAY['قرارات تصنع الفرق في الفريق.', 'صفات القادة الذين يلهمون الناس.', 'كيف تكون قدوة قبل أن تكون مديراً.']
      WHEN 'التقنية' THEN ARRAY['تقنيات تغير طريقة عملنا.', 'استشراف مستقبل الأدوات الرقمية.', 'أدوات عملية توفر وقتك وجهدك.']
      ELSE ARRAY['حوار مع ضيوف من مختلف المجالات.', 'أفكار وتجارب تستحق المشاركة.', 'حكايات ملهمة من رحلات مختلفة.']
    END;

    v_types := CASE v_cat_name
      WHEN 'روحاني / ديني' THEN ARRAY['religious','religious','motivational']
      WHEN 'العلوم' THEN ARRAY['scientific','scientific','scientific']
      WHEN 'ثقافة وأدب' THEN ARRAY['cultural','cultural','cultural']
      WHEN 'المسيرة المهنية' THEN ARRAY['professional','professional','motivational']
      WHEN 'المال والاستثمار' THEN ARRAY['professional','professional','professional']
      WHEN 'القيادة' THEN ARRAY['professional','professional','motivational']
      WHEN 'التقنية' THEN ARRAY['scientific','professional','professional']
      ELSE ARRAY['motivational','cultural','motivational']
    END;

    v_index := v_existing;
    WHILE v_index < 3 LOOP
      v_index := v_index + 1;
      v_title := v_host.name_ar || ' | ' || v_titles[v_index];

      INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
      VALUES (v_title, v_descs[v_index], v_host.id, v_host.category_id, v_types[v_index],
        'https://picsum.photos/seed/' || replace(v_host.slug, '-', '') || v_index || '/400/400',
        'beginner', 120000 + v_index * 45000, 4.7)
      RETURNING id INTO v_pod_id;

      INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count)
      SELECT v_pod_id,
        v_title || ' — الحلقة ' || k,
        'حلقة جديدة من ' || v_titles[v_index] || '، نظرة عملية قريبة من حياتك اليومية.',
        v_audio,
        1400 + k * 120,
        now() - ((v_index * 12 + k * 3) || ' days')::interval,
        6000 + k * 2200 + v_index * 1000
      FROM generate_series(1, 4) AS k;
    END LOOP;
  END LOOP;
END $$;
