/*
# Seed learning paths and their steps
Creates 6 curated multi-week learning paths with ordered steps.
*/
DO $$
DECLARE
  v_path_habits uuid; v_path_confidence uuid; v_path_finance uuid;
  v_path_leadership uuid; v_path_spiritual uuid; v_path_health uuid;
  v_spiritual_cat uuid; v_health_cat uuid; v_career_cat uuid; v_finance_cat uuid; v_leadership_cat uuid; v_mental_cat uuid;
  v_ep1 uuid; v_ep2 uuid; v_ep3 uuid; v_ep4 uuid; v_ep5 uuid; v_ep6 uuid;
BEGIN
  SELECT id INTO v_spiritual_cat FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_health_cat FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career_cat FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance_cat FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_leadership_cat FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_mental_cat FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;

  -- Grab some episode IDs
  SELECT id INTO v_ep1 FROM episodes LIMIT 1;
  SELECT id INTO v_ep2 FROM episodes OFFSET 1 LIMIT 1;
  SELECT id INTO v_ep3 FROM episodes OFFSET 2 LIMIT 1;
  SELECT id INTO v_ep4 FROM episodes OFFSET 3 LIMIT 1;
  SELECT id INTO v_ep5 FROM episodes OFFSET 4 LIMIT 1;
  SELECT id INTO v_ep6 FROM episodes OFFSET 5 LIMIT 1;

  -- Path 1: 30 days to better habits
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('30 يوماً لعادات أفضل', 'رحلة عملية لبناء عادات يومية قوية تستمر مدى الحياة', v_mental_cat, 4, 'beginner', '🌱')
  RETURNING id INTO v_path_habits;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_habits, 1, 'استمع: أساسيات بناء العادات', 'ابدأ بحلقة عن كيف تتشكل العادات', 'podcast', v_ep1, 10),
  (v_path_habits, 2, 'مهمة: اكتب عادتك الجديدة', 'حدد عادة واحدة تريد بناءها هذا الشهر', 'mission', NULL, 15),
  (v_path_habits, 3, 'تأمل: لماذا هذه العادة مهمة لك؟', 'اكتب في مذكرتك سبب رغبتك في التغيير', 'reflection', NULL, 10),
  (v_path_habits, 4, 'نصيحة: قاعدة الدقيقتين', 'اقرأ نصيحة عن قاعدة الدقيقتين للتغلب على التسويف', 'tip', NULL, 5),
  (v_path_habits, 5, 'مهمة: نفّذ عادتك 7 أيام متتالية', 'سجل تنفيذك يومياً في المذكرات', 'mission', NULL, 25),
  (v_path_habits, 6, 'استمع: كيف تحافظ على العادات', 'حلقة عن استدامة العادات بعد البداية', 'podcast', v_ep2, 10),
  (v_path_habits, 7, 'تأمل: ما الذي تغيّر فيك؟', 'اكتب عن التغييرات التي لاحظتها', 'reflection', NULL, 15),
  (v_path_habits, 8, 'مهمة: أضف عادة ثانية', 'الآن أضف عادة جديدة تراكمياً', 'mission', NULL, 20);

  -- Path 2: Confidence & self-esteem
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('بناء الثقة بالنفس', 'تعرّف على مصادر الثقة ومفاتيح تعزيزها عملياً', v_mental_cat, 3, 'beginner', '💪')
  RETURNING id INTO v_path_confidence;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_confidence, 1, 'استمع: ما هي الثقة الحقيقية؟', 'حلقة عن مفهوم الثقة بالنفس', 'podcast', v_ep3, 10),
  (v_path_confidence, 2, 'مهمة: اكتب 5 نقاط قوتك', 'حدد صفاتك الإيجابية دون تقليل', 'mission', NULL, 15),
  (v_path_confidence, 3, 'نصيحة: لغة الجسد والثقة', 'اقرأ عن تأثير وضعية الجسد على ثقتك', 'tip', NULL, 5),
  (v_path_confidence, 4, 'تأمل: موقف تجاوزت فيه خوفك', 'اكتب عن مرة واجهت فيها خوفك', 'reflection', NULL, 10),
  (v_path_confidence, 5, 'مهمة: افعل شيئاً خارج منطقة راحتك', 'اختر تحدياً صغيراً هذا الأسبوع', 'mission', NULL, 25),
  (v_path_confidence, 6, 'استمع: التعامل مع النقد', 'حلقة عن كيف تستقبل النقد بصحة', 'podcast', v_ep4, 10);

  -- Path 3: Financial foundations
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('أساسيات المال الذكي', 'تعلم أسس الإدارة المالية والادخار والاستثمار المسؤول', v_finance_cat, 4, 'beginner', '💰')
  RETURNING id INTO v_path_finance;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_finance, 1, 'استمع: عقلية المال الصحيحة', 'حلقة عن العلاقة النفسية بالمال', 'podcast', v_ep5, 10),
  (v_path_finance, 2, 'مهمة: اكتب ميزانيتك الشهرية', 'استخدم قاعدة 50/30/20', 'mission', NULL, 20),
  (v_path_finance, 3, 'نصيحة: ادفع لنفسك أولاً', 'اقرأ عن أهمية الادخار قبل الإنفاق', 'tip', NULL, 5),
  (v_path_finance, 4, 'تأمل: علاقتك بالديون', 'اكتب عن نظرتك للديون وكيف تتجنبها', 'reflection', NULL, 10),
  (v_path_finance, 5, 'مهمة: اجمع مصاريف 3 أيام', 'تتبع كل ريال أنفقته لمدة 3 أيام', 'mission', NULL, 15),
  (v_path_finance, 6, 'استمع: مقدمة في الاستثمار', 'حلقة عن أساسيات تنمية المال', 'podcast', v_ep6, 10),
  (v_path_finance, 7, 'مهمة: حدد هدفاً مالياً', 'اكتب هدفاً مالياً لـ 6 أشهر قادمة', 'mission', NULL, 20),
  (v_path_finance, 8, 'تأمل: ماذا تعلمت عن مالك؟', 'لخص أهم 3 أفكار تعلمتها', 'reflection', NULL, 15);

  -- Path 4: Leadership journey
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('رحلة القيادة', 'من قيادة الذات إلى قيادة الآخرين بطريقة ملهمة', v_leadership_cat, 5, 'intermediate', '🧭')
  RETURNING id INTO v_path_leadership;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_leadership, 1, 'استمع: القيادة تبدأ بقيادة الذات', 'حلقة عن انضباط القائد الشخصي', 'podcast', v_ep1, 10),
  (v_path_leadership, 2, 'مهمة: حدد رؤيتك الشخصية', 'اكتب رؤية لـ 5 سنوات قادمة', 'mission', NULL, 20),
  (v_path_leadership, 3, 'نصيحة: الاستماع مهارة القائد', 'اقرأ عن أهمية الاستماع الفعال', 'tip', NULL, 5),
  (v_path_leadership, 4, 'تأمل: قائد ألهمك — لماذا؟', 'اكتب عن شخصية قيادية تأثرت بها', 'reflection', NULL, 10),
  (v_path_leadership, 5, 'مهمة: قُد مشروعاً صغيراً', 'نظّم نشاطاً جماعياً ولو بسيطاً', 'mission', NULL, 30),
  (v_path_leadership, 6, 'استمع: فن التحفيز', 'حلقة عن كيف تلهم الآخرين', 'podcast', v_ep2, 10),
  (v_path_leadership, 7, 'مهمة: قدّم تغذية راجعة', 'اعطِ تقييماً صادقاً لشخصين', 'mission', NULL, 15),
  (v_path_leadership, 8, 'تأمل: أسلوبك القيادي', 'اكتب عن نمط قيادتك ونقاط تطويره', 'reflection', NULL, 15),
  (v_path_leadership, 9, 'استمع: القيادة في الأزمات', 'حلقة عن اتخاذ القرار تحت الضغط', 'podcast', v_ep3, 10),
  (v_path_leadership, 10, 'مهمة: صغ رسالة قيادية', 'اكتب رسالة تلخص قيمك القيادية', 'mission', NULL, 25);

  -- Path 5: Spiritual growth
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('نمو روحي عميق', 'رحلة لتعزيز الصلة الروحية وتزكية النفس', v_spiritual_cat, 4, 'beginner', '🕊️')
  RETURNING id INTO v_path_spiritual;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_spiritual, 1, 'استمع: كيف تطمئن القلوب', 'حلقة عن الطمأنينة الروحية', 'podcast', v_ep4, 10),
  (v_path_spiritual, 2, 'مهمة: اكتب وردك اليومي', 'حدد ورداً روحياً تنفذه كل صباح', 'mission', NULL, 15),
  (v_path_spiritual, 3, 'نصيحة: الصبر مفتاح الفرج', 'اقرأ عن قيمة الصبر في حياتك', 'tip', NULL, 5),
  (v_path_spiritual, 4, 'تأمل: نعمة في حياتك', 'اكتب عن نعمة تشكر الله عليها', 'reflection', NULL, 10),
  (v_path_spiritual, 5, 'مهمة: نفّذ وردك 14 يوماً', 'التزم بوردك الروحي أسبوعين متتاليين', 'mission', NULL, 30),
  (v_path_spiritual, 6, 'استمع: التأمل والذكر', 'حلقة عن فوائد الذكر والتأمل', 'podcast', v_ep5, 10),
  (v_path_spiritual, 7, 'تأمل: كيف تغيّرت روحياً؟', 'اكتب عن التغيير الداخلي الذي لاحظته', 'reflection', NULL, 15),
  (v_path_spiritual, 8, 'مهمة: اكتب خطة نموك الروحي', 'صغ خطة شهرية لنموك المستمر', 'mission', NULL, 25);

  -- Path 6: Health & energy
  INSERT INTO learning_paths (title, description, category_id, duration_weeks, difficulty, cover_emoji)
  VALUES ('طاقة وصحة', 'ابنِ جسداً قوياً وعقلاً نشطاً بعادات بسيطة', v_health_cat, 3, 'beginner', '🏃')
  RETURNING id INTO v_path_health;

  INSERT INTO learning_path_steps (path_id, step_order, title, description, step_type, linked_episode_id, xp_reward) VALUES
  (v_path_health, 1, 'استمع: الصحة أساس النجاح', 'حلقة عن علاقة الجسد بالإنجاز', 'podcast', v_ep6, 10),
  (v_path_health, 2, 'مهمة: اشرب 8 أكواب ماء يومياً', 'تابع شربك للماء أسبوعاً كاملاً', 'mission', NULL, 20),
  (v_path_health, 3, 'نصيحة: النوم 7 ساعات', 'اقرأ عن أهمية النوم للطاقة', 'tip', NULL, 5),
  (v_path_health, 4, 'مهمة: امشِ 30 دقيقة يومياً', 'التزم بالمشي 5 أيام متتالية', 'mission', NULL, 25),
  (v_path_health, 5, 'تأمل: كيف تشعر بطاقتك؟', 'اكتب عن مستوى طاقتك وتأثير عاداتك', 'reflection', NULL, 10),
  (v_path_health, 6, 'استمع: التغذية والتركيز', 'حلقة عن تأثير الطعام على الذهن', 'podcast', v_ep1, 10),
  (v_path_health, 7, 'مهمة: قلّل السكر أسبوعاً', 'تجنب المشروبات السكرية لمدة أسبوع', 'mission', NULL, 20);
END $$;
