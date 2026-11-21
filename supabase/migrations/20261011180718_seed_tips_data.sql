/*
# Seed 100+ tips across all 10 categories
Types: advice, quote, verse, hadith, fact
*/
DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid; v_career uuid;
  v_finance uuid; v_family uuid; v_mental uuid; v_leadership uuid; v_tech uuid;
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

  -- Spiritual (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('إن مع العسر يسراً، فلا تستعجل النهاية وأنت في بداية الطريق', 'القرآن الكريم', v_spiritual, 'verse'),
  ('إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('من حسن إسلام المرء تركه ما لا يعنيه', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('الصبر مفتاح الفرج، والشكر سبب للزيادة', 'حكمة', v_spiritual, 'advice'),
  ('وأن ليس للإنسان إلا ما سعى، وأن سعيه سوف يرى', 'القرآن الكريم', v_spiritual, 'verse'),
  ('الذكر طمأنينة للقلوب، اجعل له نصيباً من يومك', 'حكمة', v_spiritual, 'advice'),
  ('من لا يستحي من الناس لا يستحي من الله', 'حكمة', v_spiritual, 'advice'),
  ('تفاءلوا بالخير تجدوه', 'رسول الله ﷺ', v_spiritual, 'hadith'),
  ('الدعاء سلاح المؤمن، فاستخدمه كل يوم', 'حكمة', v_spiritual, 'advice'),
  ('إن الله لا يغير ما بقوم حتى يغيروا ما بأنفسهم', 'القرآن الكريم', v_spiritual, 'verse');

  -- Science (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('العلم هو النور الذي يضيء طريق الحياة', 'حكمة', v_science, 'advice'),
  ('إن العقل البشري لا يعمل بشكل جيد إلا عندما يكون فضولياً', 'ألبرت أينشتاين', v_science, 'quote'),
  ('اقرأ كل يوم شيئاً جديداً يوسع مداركك', 'حكمة', v_science, 'advice'),
  ('الخلية الواحدة تحتوي على ملياري نوع من البروتينات المختلفة', 'علم الأحياء', v_science, 'fact'),
  ('العلم يبني والجهل يهدم، فاختر البناء', 'حكمة', v_science, 'advice'),
  ('لو سرنا بسرعة الضوء لوقف الزمن بالنسبة لنا', 'النسبية الخاصة', v_science, 'fact'),
  ('لا توقف تعلمك أبداً، لأن الحياة لا تتوقف عن تعليمك', 'حكمة', v_science, 'advice'),
  ('الكمال في العلم هو أن تعرف حدود معرفتك', 'كونفوشيوس', v_science, 'quote'),
  ('الدماغ البشري يستهلك 20% من طاقة الجسم رغم أنه 2% من وزنه', 'علم الأعصاب', v_science, 'fact'),
  ('كل ما نعرفه عن الكون يمثل 5% فقط، والباقي مظلم', 'الفيزياء الفلكية', v_science, 'fact');

  -- Culture & Literature (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('الكتاب خير صديق في وقت الفراغ', 'حكمة', v_culture, 'advice'),
  ('اقرأ كأنك مؤلف، وفكّر كأنك ناقد', 'حكمة', v_culture, 'advice'),
  ('الأدب هو الحياة المرسومة بالكلمات', 'حكمة', v_culture, 'quote'),
  ('من لا يقرأ لا يعيش حياة كاملة', 'حكمة', v_culture, 'advice'),
  ('الكلمة الطيبة شجرة طيبة تؤتي أكلها كل حين', 'حكمة', v_culture, 'quote'),
  ('خصص 20 دقيقة يومياً للقراءة، وستنهي كتاباً كل أسبوعين', 'حكمة', v_culture, 'advice'),
  ('الثقافة هي ما يبقى بعد أن تنسى كل ما تعلمته', 'ألبرت أينشتاين', v_culture, 'quote'),
  ('الشعر هو موسيقى الروح، استمع إليه', 'حكمة', v_culture, 'advice'),
  ('اكتب ما تقرأه بخط يدك، يرسخ في ذاكرتك أكثر', 'حكمة', v_culture, 'advice'),
  ('القارئ الجيد يقرأ الكتاب مرتين: مرة للمتعة ومرة للتأمل', 'حكمة', v_culture, 'advice');

  -- Health & Fitness (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('المشي 30 دقيقة يومياً يقلل خطر أمراض القلب بنسبة 35%', 'دراسة طبية', v_health, 'fact'),
  ('جسمك هو بيتك الوحيد، اعتن به', 'حكمة', v_health, 'advice'),
  ('اشرب 8 أكواب ماء يومياً على الأقل', 'حكمة', v_health, 'advice'),
  ('النوم 7-8 ساعات يقوي جهاز المناعة', 'دراسة طبية', v_health, 'fact'),
  ('الرياضة صيدلية كاملة، والحركة نصف الدواء', 'حكمة', v_health, 'advice'),
  ('تناول الإفطار كل يوم يحسن التركيز والأداء', 'دراسة طبية', v_health, 'fact'),
  ('الوقوف لمدة دقيقة كل ساعة يقلل آثار الجلوس الطويل', 'دراسة طبية', v_health, 'fact'),
  ('التنفس العميق لمدة 5 دقائق يخفض التوتر', 'حكمة', v_health, 'advice'),
  ('العضلات تحرق السعرات حتى أثناء الراحة، فبنِ عضلاتك', 'حكمة', v_health, 'advice'),
  ('قلل السكر المضاف، وستلاحظ تحسناً في طاقتك خلال أسبوع', 'حكمة', v_health, 'advice');

  -- Career (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('النجاح ليس صدفة، بل تراكم خطوات صغيرة يومية', 'حكمة', v_career, 'advice'),
  ('استثمر في نفسك أولاً، فأنت أثمن أصولك', 'حكمة', v_career, 'advice'),
  ('بناء المهارات أهم من بناء السيرة الذاتية', 'حكمة', v_career, 'advice'),
  ('تواصل مع شخص جديد في مجالك كل أسبوع', 'حكمة', v_career, 'advice'),
  ('التركيز على مهمة واحدة في كل مرة يضاعف إنتاجيتك', 'حكمة', v_career, 'advice'),
  ('لا تنتظر الكمال، ابدأ وحسّن لاحقاً', 'حكمة', v_career, 'advice'),
  ('الخبرة تأتي من المواقف الصعبة، لا تتهرب منها', 'حكمة', v_career, 'advice'),
  ('اعرف نقاط قوتك وركّز عليها بدل إصلاح كل نقاط ضعفك', 'حكمة', v_career, 'advice'),
  ('التطوير المهني رحلة مدى الحياة، لا توقفها', 'حكمة', v_career, 'advice'),
  ('القائد الجيد يصنع قادة، لا أتباعاً', 'حكمة', v_career, 'advice');

  -- Finance (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('ادفع لنفسك أولاً: خصم 10% من دخلك قبل أي مصروف', 'حكمة', v_finance, 'advice'),
  ('لا تدخر ما يتبقى بعد الإنفاق، بل أنفق ما يتبقى بعد الادخار', 'وارن بافيت', v_finance, 'quote'),
  ('الاستثمار في المعرفة يعطي أفضل عائد', 'بنجامين فرانكلين', v_finance, 'quote'),
  ('الديون تأكل المستقبل، تجنبها قدر الإمكان', 'حكمة', v_finance, 'advice'),
  ('ابدأ بالاستثمار مبكراً، فالفائدة المركبة سحر الوقت', 'حكمة', v_finance, 'advice'),
  ('الميزانية الشهرية هي خريطة طريق لحرية مالية', 'حكمة', v_finance, 'advice'),
  ('لا تشتري ما لا تحتاج لتثير إعجاب من لا يهتم بك', 'حكمة', v_finance, 'advice'),
  ('نظرية 50/30/20: احتياجات 50%، رغبات 30%، ادخار 20%', 'قاعدة مالية', v_finance, 'fact'),
  ('الطوارئ المالية: اجمع مصاريف 3-6 أشهر قبل الاستثمار', 'حكمة', v_finance, 'advice'),
  ('تنويع الاستثمارات يقلل المخاطر: لا تضع كل مالك في سلة واحدة', 'حكمة', v_finance, 'advice');

  -- Family & Relationships (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('خيركم خيركم لأهله', 'رسول الله ﷺ', v_family, 'hadith'),
  ('الكلمة الطيبة صدقة، فابدأ بها مع أهلك', 'حكمة', v_family, 'advice'),
  ('الاستماع أعمق من السماع، فاستمع لمن تحب', 'حكمة', v_family, 'advice'),
  ('خصص وقتاً يومياً مع أطفالك بعيداً عن الهواتف', 'حكمة', v_family, 'advice'),
  ('الاعتذار لا يقلل من قدرك بل يرفع شأنك', 'حكمة', v_family, 'advice'),
  ('لا تجعل الاختلاف يفسد الود، فالناس مختلفون', 'حكمة', v_family, 'advice'),
  ('الصداقة الحقيقية تظهر في الأوقات الصعبة', 'حكمة', v_family, 'advice'),
  ('عبّر عن امتنانك لمن حولك كل يوم', 'حكمة', v_family, 'advice'),
  ('الحب ليس شعوراً فقط، بل أفعال يومية صغيرة', 'حكمة', v_family, 'advice'),
  ('لا تؤجل قول "أحبك" لمن تحب', 'حكمة', v_family, 'advice');

  -- Mental Health (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('من حاسب نفسه قبل أن يحاسَب، خفّ الله يوم القيامة', 'حكمة', v_mental, 'advice'),
  ('منع الأفكار السلبية أصعب من استبدالها، فعوّضها بإيجابية', 'حكمة', v_mental, 'advice'),
  ('اليومية اليومية: اكتب 3 أشياء ممتن لها كل صباح', 'حكمة', v_mental, 'advice'),
  ('القلق لا يفرغ غداً من أحزانه، بل يفرغ اليوم من قوته', 'حكمة', v_mental, 'quote'),
  ('التأمل 10 دقائق يومياً يقلل القلق بنسبة 40%', 'دراسة علمية', v_mental, 'fact'),
  ('لا تقارن يومك الأول بيوم الآخر العاشر، كلٌّ في مرحلة', 'حكمة', v_mental, 'advice'),
  ('البكاء ليس ضعفاً، بل تفريغ صحي للمشاعر', 'حكمة', v_mental, 'advice'),
  ('المشي في الطبيعة يخفض هرمون التوتر بنسبة 20%', 'دراسة علمية', v_mental, 'fact'),
  ('قبل النوم، فكّر في شيء جميل حدث اليوم', 'حكمة', v_mental, 'advice'),
  ('اطلب المساعدة المتخصصة عند الحاجة، ليست عيباً', 'حكمة', v_mental, 'advice');

  -- Leadership (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('القائد الحقيقي من يصنع قادة لا أتباعاً', 'حكمة', v_leadership, 'advice'),
  ('القدوة أبلغ من القول، فكن المثل الذي تدعو إليه', 'حكمة', v_leadership, 'advice'),
  ('من لا يستطيع قيادة نفسه لا يستطيع قيادة الآخرين', 'حكمة', v_leadership, 'quote'),
  ('الاستماع مهارة القائد الأهم', 'حكمة', v_leadership, 'advice'),
  ('الاعتراف بالخطأ أول خطوات القيادة الصادقة', 'حكمة', v_leadership, 'advice'),
  ('القائد يحمي فريقه في الأزمات، ويشاركهم النجاح', 'حكمة', v_leadership, 'advice'),
  ('فوّض المسؤوليات، لا تكن من يفعل كل شيء', 'حكمة', v_leadership, 'advice'),
  ('كن واضحاً في رؤيتك، فالفريق يحتاج وجهة', 'حكمة', v_leadership, 'advice'),
  ('القيادة ليست منصباً بل سلوك', 'حكمة', v_leadership, 'quote'),
  ('اقرب الناس منك من صدقك معهم', 'حكمة', v_leadership, 'advice');

  -- Technology (10)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('خصص وقتاً بعيداً عن الشاشات كل يوم', 'حكمة', v_tech, 'advice'),
  ('تعلم مهارة تقنية جديدة كل شهر', 'حكمة', v_tech, 'advice'),
  ('الذكاء الاصطناعي يغير العالم، فهمه أفضل من تجاهله', 'حكمة', v_tech, 'advice'),
  ('أطفئ الإشعارات غير الضرورية، ستلاحظ تحسناً في تركيزك', 'حكمة', v_tech, 'advice'),
  ('استخدم كلمات مرور قوية ومختلفة لكل حساب', 'حكمة', v_tech, 'advice'),
  ('البرمجة هي لغة المستقبل، تعلم ولو أساسياتها', 'حكمة', v_tech, 'advice'),
  ('احفظ نسخة احتياطية من بياناتك المهمة كل أسبوع', 'حكمة', v_tech, 'advice'),
  ('الإنترنت أداة، استخدمها ولا تدعها تستخدمك', 'حكمة', v_tech, 'advice'),
  ('قبل أن تنشر شيئاً، اسأل: هل أحب أن يراه الناس بعد 10 سنوات؟', 'حكمة', v_tech, 'advice'),
  ('البيانات هي نفط القرن الواحد والعشرين', 'حكمة', v_tech, 'quote');

  -- General (10, no category)
  INSERT INTO tips (text_ar, author_or_source, category_id, type) VALUES
  ('كن أفضل نسخة من نفسك كل يوم، ولو بسبة 1%', 'حكمة', NULL, 'advice'),
  ('الإجراء الصغير المتكرر يصنع التغيير الكبير', 'حكمة', NULL, 'advice'),
  ('لا تؤجل عمل اليوم إلى الغد', 'حكمة', NULL, 'advice'),
  ('الرضا بالقليل راحة، والطمع في الكثير تعب', 'حكمة', NULL, 'advice'),
  ('من جدّ وجد، ومن زرع حصد', 'حكمة', NULL, 'quote'),
  ('الوقت كالسيف إن لم تقطعه قطعك', 'حكمة', NULL, 'quote'),
  ('النجاح رحلة وليست وجهة، فاستمتع بالطريق', 'حكمة', NULL, 'quote'),
  ('كل شخص تلقاه يعلمك شيئاً، فكن تلميذاً للجميع', 'حكمة', NULL, 'advice'),
  ('الابتسامة أبسط أشكال التغيير، ابدأ بها', 'حكمة', NULL, 'advice'),
  ('الامتنان يحول ما لديك إلى ما تكفي', 'حكمة', NULL, 'quote');
END $$;
