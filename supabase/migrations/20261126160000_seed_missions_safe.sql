-- Idempotent missions seed without PL/pgSQL variables or dollar quoting.
-- Run once in Supabase SQL Editor. The WHERE guard prevents duplicates.

INSERT INTO public.missions
  (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
SELECT v.* FROM (VALUES
  ('تأمل لمدة 5 دقائق', 'اجلس في هدوء وتأمل في نعم الله عليك. ابدأ يومك بالطمأنينة.', (SELECT id FROM public.categories WHERE name_ar = 'روحاني / ديني' LIMIT 1), 'easy', 30, 5, 'daily'),
  ('اقرأ ورداً من القرآن', 'اقرأ صفحة من القرآن الكريم بتدبر وتأمل في معانيها.', (SELECT id FROM public.categories WHERE name_ar = 'روحاني / ديني' LIMIT 1), 'easy', 40, 10, 'daily'),
  ('اقرأ مقالاً علمياً واحداً', 'ابحث عن مقال علمي حديث واقرأه للاطلاع على جديد العلم.', (SELECT id FROM public.categories WHERE name_ar = 'العلوم' LIMIT 1), 'easy', 40, 15, 'daily'),
  ('اقرأ 10 صفحات من كتاب', 'القراءة اليومية تبني عادة الاستمرارية وتوسّع مداركك.', (SELECT id FROM public.categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1), 'easy', 50, 20, 'daily'),
  ('اكتب اليوم في يومياتك', 'خصّص 5 دقائق لكتابة أفكارك ومشاعرك في دفتر يوميات.', (SELECT id FROM public.categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1), 'easy', 30, 5, 'daily'),
  ('امشِ 20 دقيقة', 'المشي اليومي يحسّن صحتك البدنية والنفسية. اخرج وامشِ في الهواء الطلق.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'easy', 50, 20, 'daily'),
  ('اشرب 8 أكواب ماء', 'اشرب كوبين ماء عند كل وجبة للحفاظ على ترطيب جسمك.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'easy', 30, 0, 'daily'),
  ('تمرين 15 دقيقة في المنزل', 'قم بتمارين بسيطة: قفزات، ضغط، وتمارين بطن بدون معدات.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'medium', 60, 15, 'daily'),
  ('تعلم مهارة جديدة لمدة 15 دقيقة', 'شاهد فيديو تعليمي أو اقرأ عن مهارة تريد إتقانها.', (SELECT id FROM public.categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1), 'easy', 40, 15, 'daily'),
  ('خطط ليومك غداً', 'اكتب 3 أهم مهام لليوم التالي قبل النوم.', (SELECT id FROM public.categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1), 'easy', 30, 5, 'daily'),
  ('سجّل مصروفات اليوم', 'اكتب كل ما أنفقته اليوم لمراقبة عاداتك المالية.', (SELECT id FROM public.categories WHERE name_ar = 'المال والاستثمار' LIMIT 1), 'easy', 30, 5, 'daily'),
  ('اتصل بقريب', 'اتصل بصديق أو قريب لم تتصل به منذ فترة وصفِّ يومك معه.', (SELECT id FROM public.categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1), 'easy', 40, 10, 'daily'),
  ('امضِ 15 دقيقة مع أسرتك بدون هاتف', 'ضع هاتفك بعيداً وامضِ وقتاً نوعياً مع عائلتك.', (SELECT id FROM public.categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1), 'easy', 40, 15, 'daily'),
  ('اكتب 3 أشياء أنت ممتنٌ لها', 'تدوين الامتنان يومياً يحسّن صحتك النفسية ويُريك ما تملكه من نِعم.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'easy', 30, 5, 'daily'),
  ('تنفّس بعمق لمدة دقيقتين', 'تقنية التنفس 4-7-8: شهيق 4 ثوانٍ، حبس 7، زفير 8.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'easy', 30, 2, 'daily'),
  ('تأمل في قرار اتخذته اليوم', 'راجع قراراً اتخذته اليوم: ما الذي جعله جيداً؟ ما الذي يمكنك تحسينه؟', (SELECT id FROM public.categories WHERE name_ar = 'القيادة' LIMIT 1), 'easy', 40, 10, 'daily'),
  ('تعلم مفهوماً تقنياً جديداً', 'ابحث عن مصطلح تقني لم تفهمه من قبل واقرأ عنه لمدة 10 دقائق.', (SELECT id FROM public.categories WHERE name_ar = 'التقنية' LIMIT 1), 'easy', 40, 10, 'daily'),
  ('استمع لحلقة بودكاست واكتب 3 ملاحظات', 'اختر حلقة من بودكاست نمّي واستمع لها ثم دوّن أهم 3 أفكار تعلمتها.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'medium', 80, 25, 'daily'),
  ('نم مبكراً قبل 11 مساءً', 'النوم المبكر يحسّن تركيزك وطاقتك في اليوم التالي.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'easy', 40, 0, 'daily'),
  ('أتمم قراءة كتاب كامل', 'اختر كتاباً واقرأه من الغلاف للغلاف خلال الأسبوع.', (SELECT id FROM public.categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1), 'hard', 150, 300, 'weekly'),
  ('تمرّن 4 مرات هذا الأسبوع', 'التزم بجدول رياضي: 4 جلسات تمرين لا تقل عن 30 دقيقة.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'hard', 200, 120, 'weekly'),
  ('اكتب أهداف الأسبوع', 'حدد 5 أهداف رئيسية لهذا الأسبوع ورتّبها حسب الأولوية.', (SELECT id FROM public.categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1), 'medium', 80, 20, 'weekly'),
  ('اجلس مع عائلتك على مائدة واحدة', 'نظّم اجتماعاً عائلياً أو وجبة جماعية بدون شاشات.', (SELECT id FROM public.categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1), 'medium', 80, 60, 'weekly'),
  ('تصدّق بصدقة', 'أطعم مسكيناً أو تبرّع لعمل خيري لو لم يكن مالاً.', (SELECT id FROM public.categories WHERE name_ar = 'روحاني / ديني' LIMIT 1), 'medium', 100, 0, 'weekly'),
  ('راجع ميزانية الأسبوع', 'اجلس مع نفسك وراجع ما أنفقته هذا الأسبوع وخطط للأسبوع القادم.', (SELECT id FROM public.categories WHERE name_ar = 'المال والاستثمار' LIMIT 1), 'medium', 80, 30, 'weekly'),
  ('تعلم مهارة جديدة لمدة ساعة', 'خصّص ساعة لتعلم مهارة عملية جديدة: لغة، برمجة، تصميم...', (SELECT id FROM public.categories WHERE name_ar = 'التقنية' LIMIT 1), 'medium', 100, 60, 'weekly'),
  ('مارس التأمل 5 أيام متتالية', 'تأمل لمدة 5 دقائق كل يوم لخمسة أيام في الأسبوع.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'medium', 100, 25, 'weekly'),
  ('قُد اجتماعاً أو مبادرة', 'نظّم نشاطاً جماعياً أو قُد اجتماعاً في عملك أو مجتمعك.', (SELECT id FROM public.categories WHERE name_ar = 'القيادة' LIMIT 1), 'hard', 150, 60, 'weekly'),
  ('شاهد فيلماً وثائقياً علمياً', 'اختر فيلماً وثائقياً عن موضوع علمي واكتب ملاحظة عنه.', (SELECT id FROM public.categories WHERE name_ar = 'العلوم' LIMIT 1), 'medium', 80, 60, 'weekly'),
  ('زُر مكاناً ثقافياً', 'زر متحفاً أو معرضاً أو موقعاً تاريخياً واكتب عن تجربتك.', (SELECT id FROM public.categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1), 'medium', 100, 90, 'weekly'),
  ('تواصل مع 3 أشخاص من شبكتك المهنية', 'راسل 3 زملاء أو معارف لتقوية علاقاتك المهنية.', (SELECT id FROM public.categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1), 'medium', 80, 30, 'weekly'),
  ('تحدي 30 يوماً: تأمل يومياً', 'تأمل لمدة 10 دقائق كل يوم لمدة 30 يوماً متتالية.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'hard', 500, 300, 'challenge'),
  ('تحدي 21 يوماً: اقرأ 20 صفحة يومياً', 'اقرأ 20 صفحة من كتاب كل يوم لمدة 3 أسابيع.', (SELECT id FROM public.categories WHERE name_ar = 'ثقافة وأدب' LIMIT 1), 'hard', 400, 420, 'challenge'),
  ('تحدي صيام 3 أيام', 'صم 3 أيام في هذا الشهر تقرباً وتهذيباً للنفس.', (SELECT id FROM public.categories WHERE name_ar = 'روحاني / ديني' LIMIT 1), 'hard', 300, 0, 'challenge'),
  ('تحدي اللياقة: 10,000 خطوة يومياً لمدة أسبوع', 'حقق 10,000 خطوة كل يوم لمدة أسبوع كامل.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة واللياقة' LIMIT 1), 'hard', 350, 0, 'challenge'),
  ('تحدي المال: ادخر 10% من راتبك', 'ادخر 10% من دخلك هذا الشهر في حساب ادخار مستقل.', (SELECT id FROM public.categories WHERE name_ar = 'المال والاستثمار' LIMIT 1), 'hard', 300, 0, 'challenge'),
  ('تحدي القيادة: قُد مشروعاً تطوعياً', 'ابنِ فريقاً ونفّذ مشروعاً تطوعياً يخدم مجتمعك.', (SELECT id FROM public.categories WHERE name_ar = 'القيادة' LIMIT 1), 'hard', 500, 600, 'challenge'),
  ('تحدي التقنية: ابنِ مشروعاً صغيراً', 'استخدم مهارة تقنية لبناء مشروع بسيط (موقع، تطبيق، سكربت).', (SELECT id FROM public.categories WHERE name_ar = 'التقنية' LIMIT 1), 'hard', 400, 600, 'challenge'),
  ('تحدي العلاقات: اكتب رسالة شكر لـ 5 أشخاص', 'اكتب رسالة شكر صادقة لـ 5 أشخاص أثروا في حياتك.', (SELECT id FROM public.categories WHERE name_ar = 'العلاقات والأسرة' LIMIT 1), 'hard', 250, 60, 'challenge'),
  ('تحدي العلم: اقرأ كتاباً علمياً كاملاً', 'اختر كتاباً علمياً واقرأه كاملاً مع تدوين أهم الأفكار.', (SELECT id FROM public.categories WHERE name_ar = 'العلوم' LIMIT 1), 'hard', 400, 600, 'challenge'),
  ('تحدي المهنة: حدّث سيرتك الذاتية وملفك المهني', 'راجع وحدّث سيرتك الذاتية وملفك في لينكد إن.', (SELECT id FROM public.categories WHERE name_ar = 'المسيرة المهنية' LIMIT 1), 'medium', 120, 90, 'challenge')
) AS v(title, description, category_id, difficulty, xp_reward, duration_minutes, type)
WHERE NOT EXISTS (SELECT 1 FROM public.missions);

INSERT INTO public.missions
  (title, description, category_id, difficulty, xp_reward, duration_minutes, type, linked_episode_id)
SELECT v.* FROM (VALUES
  ('استمع لحلقة "العادات الذرية"', 'استمع للحلقة وطبّق فكرة واحدة منها في يومك.', (SELECT id FROM public.categories WHERE name_ar = 'الصحة النفسية' LIMIT 1), 'medium', 80, 20, 'daily', (SELECT id FROM public.episodes ORDER BY published_at DESC LIMIT 1 OFFSET 0))
) AS v(title, description, category_id, difficulty, xp_reward, duration_minutes, type, linked_episode_id)
WHERE NOT EXISTS (SELECT 1 FROM public.missions WHERE linked_episode_id IS NOT NULL);
