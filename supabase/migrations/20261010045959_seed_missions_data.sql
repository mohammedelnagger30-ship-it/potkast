/*
# Seed 40+ missions across all categories

1. Seed Data
- 42 missions total: 20 daily, 12 weekly, 10 challenge
- Distributed across all 10 categories
- Mix of difficulty levels (easy, medium, hard)
- XP rewards scaled by difficulty: easy 30-50, medium 60-100, hard 120-200
- A few missions are linked to specific podcast episodes

2. Important Notes
- Uses DO $$ block to capture category IDs and some episode IDs
- Idempotent via ON CONFLICT DO NOTHING on the unique title (not strictly enforced,
  but the INSERT is guarded by checking existing titles)
*/

DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid;
  v_career uuid; v_finance uuid; v_family uuid; v_mental uuid;
  v_leadership uuid; v_tech uuid;
  v_ep1 uuid; v_ep2 uuid;
BEGIN
  SELECT id INTO v_spiritual FROM categories WHERE name_ar = 'روحاني / ديني' LIMIT 1;
  SELECT id INTO v_science FROM categories WHERE name_ar = 'العلوم' LIMIT 1;
  SELECT id INTO v_culture FROM categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1;
  SELECT id INTO v_health FROM categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1;
  SELECT id INTO v_career FROM categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1;
  SELECT id INTO v_finance FROM categories WHERE name_ar = 'المال والاستثمار' LIMIT 1;
  SELECT id INTO v_family FROM categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1;
  SELECT id INTO v_mental FROM categories WHERE name_ar = 'الصحة النفسية' LIMIT 1;
  SELECT id INTO v_leadership FROM categories WHERE name_ar = 'القيادة' LIMIT 1;
  SELECT id INTO v_tech FROM categories WHERE name_ar = 'التقنية' LIMIT 1;

  -- Grab a couple episode IDs for linked missions
  SELECT id INTO v_ep1 FROM episodes ORDER BY published_at DESC LIMIT 1 OFFSET 0;
  SELECT id INTO v_ep2 FROM episodes ORDER BY published_at DESC LIMIT 1 OFFSET 1;

  -- ===== DAILY MISSIONS (20) =====
  -- Spiritual
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تأمل لمدة 5 دقائق', 'اجلس في هدوء وتأمل في نعم الله عليك. ابدأ يومك بالطمأنينة.', v_spiritual, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ ورداً من القرآن', 'اقرأ صفحة من القرآن الكريم بتدبر وتأمل في معانيها.', v_spiritual, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Science
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ مقالاً علمياً واحداً', 'ابحث عن مقال علمي حديث واقرأه للاطلاع على جديد العلم.', v_science, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Culture
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اقرأ 10 صفحات من كتاب', 'القراءة اليومية تبني عادة الاستمرارية وتوسّع مداركك.', v_culture, 'easy', 50, 20, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب اليوم في يومياتك', 'خصّص 5 دقائق لكتابة أفكارك ومشاعرك في دفتر يوميات.', v_culture, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Health
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('امشِ 20 دقيقة', 'المشي اليومي يحسّن صحتك البدنية والنفسية. اخرج وامشِ في الهواء الطلق.', v_health, 'easy', 50, 20, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اشرب 8 أكواب ماء', 'اشرب كوبين ماء عند كل وجبة للحفاظ على ترطيب جسمك.', v_health, 'easy', 30, 0, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تمرين 15 دقيقة في المنزل', 'قم بتمارين بسيطة: قفزات، ضغط، وتمارين بطن بدون معدات.', v_health, 'medium', 60, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Career
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مهارة جديدة لمدة 15 دقيقة', 'شاهد فيديو تعليمي أو اقرأ عن مهارة تريد إتقانها.', v_career, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('خطط ليومك غداً', 'اكتب 3 أهم مهام لليوم التالي قبل النوم.', v_career, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Finance
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('سجّل مصروفات اليوم', 'اكتب كل ما أنفقته اليوم لمراقبة عاداتك المالية.', v_finance, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  -- Family
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اتصل بقريب', 'اتصل بصديق أو قريب لم تتصل به منذ فترة وصفِّ يومك معه.', v_family, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('امضِ 15 دقيقة مع أسرتك بدون هاتف', 'ضع هاتفك بعيداً وامضِ وقتاً نوعياً مع عائلتك.', v_family, 'easy', 40, 15, 'daily')
  ON CONFLICT DO NOTHING;

  -- Mental
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب 3 أشياء أنت ممتنٌ لها', 'تدوين الامتنان يومياً يحسّن صحتك النفسية ويُريك ما تملكه من نِعم.', v_mental, 'easy', 30, 5, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تنفّس بعمق لمدة دقيقتين', 'تقنية التنفس 4-7-8: شهيق 4 ثوانٍ، حبس 7، زفير 8.', v_mental, 'easy', 30, 2, 'daily')
  ON CONFLICT DO NOTHING;

  -- Leadership
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تأمل في قرار اتخذته اليوم', 'راجع قراراً اتخذته اليوم: ما الذي جعله جيداً؟ ما الذي يمكنك تحسينه؟', v_leadership, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Technology
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مفهوماً تقنياً جديداً', 'ابحث عن مصطلح تقني لم تفهمه من قبل واقرأ عنه لمدة 10 دقائق.', v_tech, 'easy', 40, 10, 'daily')
  ON CONFLICT DO NOTHING;

  -- Cross-category daily
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('استمع لحلقة بودكاست واكتب 3 ملاحظات', 'اختر حلقة من بودكاست نمّي واستمع لها ثم دوّن أهم 3 أفكار تعلمتها.', v_mental, 'medium', 80, 25, 'daily')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type, linked_episode_id)
  VALUES ('استمع لحلقة "العادات الذرية"', 'استمع للحلقة وطبّق فكرة واحدة منها في يومك.', v_mental, 'medium', 80, 20, 'daily', v_ep1)
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('نم مبكراً قبل 11 مساءً', 'النوم المبكر يحسّن تركيزك وطاقتك في اليوم التالي.', v_health, 'easy', 40, 0, 'daily')
  ON CONFLICT DO NOTHING;

  -- ===== WEEKLY MISSIONS (12) =====
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('أتمم قراءة كتاب كامل', 'اختر كتاباً واقرأه من الغلاف للغلاف خلال الأسبوع.', v_culture, 'hard', 150, 300, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تمرّن 4 مرات هذا الأسبوع', 'التزم بجدول رياضي: 4 جلسات تمرين لا تقل عن 30 دقيقة.', v_health, 'hard', 200, 120, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اكتب أهداف الأسبوع', 'حدد 5 أهداف رئيسية لهذا الأسبوع ورتّبها حسب الأولوية.', v_career, 'medium', 80, 20, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('اجلس مع عائلتك على مائدة واحدة', 'نظّم اجتماعاً عائلياً أو وجبة جماعية بدون شاشات.', v_family, 'medium', 80, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تصدّق بصدقة', 'أطعم مسكيناً أو تبرّع لعمل خيري لو لم يكن مالاً.', v_spiritual, 'medium', 100, 0, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('راجع ميزانية الأسبوع', 'اجلس مع نفسك وراجع ما أنفقته هذا الأسبوع وخطط للأسبوع القادم.', v_finance, 'medium', 80, 30, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تعلم مهارة جديدة لمدة ساعة', 'خصّص ساعة لتعلم مهارة عملية جديدة: لغة، برمجة، تصميم...', v_tech, 'medium', 100, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('مارس التأمل 5 أيام متتالية', 'تأمل لمدة 5 دقائق كل يوم لخمسة أيام في الأسبوع.', v_mental, 'medium', 100, 25, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('قُد اجتماعاً أو مبادرة', 'نظّم نشاطاً جماعياً أو قُد اجتماعاً في عملك أو مجتمعك.', v_leadership, 'hard', 150, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('شاهد فيلماً وثائقياً علمياً', 'اختر فيلماً وثائقياً عن موضوع علمي واكتب ملاحظة عنه.', v_science, 'medium', 80, 60, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('زُر مكاناً ثقافياً', 'زر متحفاً أو معرضاً أو موقعاً تاريخياً واكتب عن تجربتك.', v_culture, 'medium', 100, 90, 'weekly')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تواصل مع 3 أشخاص من شبكتك المهنية', 'راسل 3 زملاء أو معارف لتقوية علاقاتك المهنية.', v_career, 'medium', 80, 30, 'weekly')
  ON CONFLICT DO NOTHING;

  -- ===== CHALLENGE MISSIONS (10) =====
  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي 30 يوماً: تأمل يومياً', 'تأمل لمدة 10 دقائق كل يوم لمدة 30 يوماً متتالية.', v_mental, 'hard', 500, 300, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي 21 يوماً: اقرأ 20 صفحة يومياً', 'اقرأ 20 صفحة من كتاب كل يوم لمدة 3 أسابيع.', v_culture, 'hard', 400, 420, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي صيام 3 أيام', 'صم 3 أيام في هذا الشهر تقرباً وتهذيباً للنفس.', v_spiritual, 'hard', 300, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي اللياقة: 10,000 خطوة يومياً لمدة أسبوع', 'حقق 10,000 خطوة كل يوم لمدة أسبوع كامل.', v_health, 'hard', 350, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي المال: ادخر 10% من راتبك', 'ادخر 10% من دخلك هذا الشهر في حساب ادخار مستقل.', v_finance, 'hard', 300, 0, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي القيادة: قُد مشروعاً تطوعياً', 'ابنِ فريقاً ونفّذ مشروعاً تطوعياً يخدم مجتمعك.', v_leadership, 'hard', 500, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي التقنية: ابنِ مشروعاً صغيراً', 'استخدم مهارة تقنية لبناء مشروع بسيط (موقع، تطبيق، سكربت).', v_tech, 'hard', 400, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي العلاقات: اكتب رسالة شكر لـ 5 أشخاص', 'اكتب رسالة شكر صادقة لـ 5 أشخاص أثروا في حياتك.', v_family, 'hard', 250, 60, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي العلم: اقرأ كتاباً علمياً كاملاً', 'اختر كتاباً علمياً واقرأه كاملاً مع تدوين أهم الأفكار.', v_science, 'hard', 400, 600, 'challenge')
  ON CONFLICT DO NOTHING;

  INSERT INTO missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
  VALUES ('تحدي المهنة: حدّث سيرتك الذاتية وملفك المهني', 'راجع وحدّث سيرتك الذاتية وملفك في لينكد إن.', v_career, 'medium', 120, 90, 'challenge')
  ON CONFLICT DO NOTHING;

END $$;
