/*
# Seed podcast categories, podcasts, and episodes

1. Seed Data
- 10 categories matching the onboarding interest areas
- 20+ realistic Arabic podcasts across all categories and types
- 3 episodes per podcast with placeholder audio URLs

2. Audio URLs
- Using a public sample MP3 (Google's "correct" tone) as placeholder audio
- All episodes share the same audio file — enough for UI demonstration

3. Important Notes
- Uses DO $$ blocks to capture category IDs via SELECT INTO
- Idempotent: checks for existing data before inserting
- Podcast covers use picsum.photos placeholder images
*/

-- Seed categories
INSERT INTO categories (name_ar, icon, color) VALUES
  ('روحاني / ديني', 'Heart', '#0F766E'),
  ('العلوم', 'FlaskConical', '#0EA5E9'),
  ('ثقافة وأدب', 'BookOpen', '#8B5CF6'),
  ('الصحة واللياقة', 'Dumbbell', '#EF4444'),
  ('المسيرة المهنية', 'Briefcase', '#F59E0B'),
  ('المال والاستثمار', 'Coins', '#10B981'),
  ('العلاقات والأسرة', 'Users', '#EC4899'),
  ('الصحة النفسية', 'Brain', '#6366F1'),
  ('القيادة', 'Crown', '#D4A017'),
  ('التقنية', 'Cpu', '#0F766E')
ON CONFLICT DO NOTHING;

-- Seed podcasts and episodes
DO $$
DECLARE
  v_spiritual uuid; v_science uuid; v_culture uuid; v_health uuid;
  v_career uuid; v_finance uuid; v_family uuid; v_mental uuid;
  v_leadership uuid; v_tech uuid;
  v_podcast_id uuid;
  v_audio text := 'https://www.buzzsprout.com/2196707/episodes/20137689-84.mp3';
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

  -- 1. Spiritual
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مشارف الروح', 'بودكاست أسبوعي يستلهم الحكمة من الموروث الديني ويطبّقها على الحياة المعاصرة.', 'الشيخ عبدالله الحارثي', 'داعية وكاتب متخصص في التزكية الروحية', v_spiritual, 'religious', 'https://picsum.photos/seed/podcast1/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الطمأنينة في زمن السرعة', 'كيف نجدها وسط ضجيج الحياة.', v_audio, 1620, now() - interval '14 days'),
    (v_podcast_id, 'أدب المحاورة في القرآن', 'تأملات في آيات الحوار.', v_audio, 1380, now() - interval '7 days'),
    (v_podcast_id, 'الرضا مفتاح السعادة', 'مفهوم الرضا وممارسته.', v_audio, 1500, now() - interval '1 day');

  -- 2. Spiritual
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('أرض النور', 'حلقات تأملية حول المعاني الإيمانية وأثرها في بناء الشخصية.', 'الأستاذة نورا الخالد', 'كاتبة ومستشارة في التربية الإيمانية', v_spiritual, 'religious', 'https://picsum.photos/seed/podcast2/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'اليقين في وجه الشك', 'كيف نثبت وقت الابتلاءات.', v_audio, 1740, now() - interval '20 days'),
    (v_podcast_id, 'الشكر العملي', 'تجاوز اللسان إلى العمل.', v_audio, 1200, now() - interval '10 days'),
    (v_podcast_id, 'صفاء القلب', 'كيف نطهّر قلوبنا.', v_audio, 1380, now() - interval '2 days');

  -- 3. Science
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('عقول فضولية', 'نظرة مبسّطة على أحدث الاكتشافات العلمية وكيف تغيّر فهمنا للعالم.', 'د. ماجد العتيبي', 'أستاذ فيزياء وباحث في العلوم التطبيقية', v_science, 'scientific', 'https://picsum.photos/seed/podcast3/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الكون في كوب قهوة', 'تبسيط مفاهيم الكوزمولوجيا.', v_audio, 1860, now() - interval '15 days'),
    (v_podcast_id, 'الذكاء الاصطناعي: بين الخوف والأمل', 'نظرة متوازنة على مستقبل الـAI.', v_audio, 2100, now() - interval '8 days'),
    (v_podcast_id, 'لماذا ننام؟', 'علم النوم وفوائده.', v_audio, 1440, now() - interval '1 day');

  -- 4. Science
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('المختبر', 'تحليل علمي للأمور اليومية من التغذية إلى التكنولوجيا.', 'د. سارة المنصور', 'عالمة أحياء ومدرّبة في العلوم', v_science, 'scientific', 'https://picsum.photos/seed/podcast4/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الفيروسات: أصداء أم أعداء؟', 'فهم الفيروسات ببساطة.', v_audio, 1560, now() - interval '18 days'),
    (v_podcast_id, 'المناعة من الداخل', 'كيف يحمينا جهاز المناعة.', v_audio, 1620, now() - interval '9 days'),
    (v_podcast_id, 'الطاقة المتجددة', 'واقع وآفاق.', v_audio, 1740, now() - interval '3 days');

  -- 5. Culture
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('حبر وورق', 'حوارات حول الكتب والأدب العربي والعالمي وروّاد الكلمة.', 'الأستاذ يوسف الشهري', 'ناقد أدبي وصاحب مكتبة', v_culture, 'cultural', 'https://picsum.photos/seed/podcast5/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'مقامات الحريري', 'قراءة في أدب المقامة.', v_audio, 1380, now() - interval '12 days'),
    (v_podcast_id, 'أدب السجون', 'كيف يولد الأدب خلف القضبان.', v_audio, 1500, now() - interval '6 days'),
    (v_podcast_id, 'الترجمة كجسر ثقافي', 'دور المترجم في نقل المعرفة.', v_audio, 1260, now() - interval '2 days');

  -- 6. Culture
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('ذاكرة الأمكنة', 'رحلات في تاريخ المدن العربية وحكاياتها.', 'الأستاذة فاطمة الغامدي', 'كاتبة رحلات ومؤرخة', v_culture, 'cultural', 'https://picsum.photos/seed/podcast6/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'بغداد مدينة السلام', 'تاريخ عاصمة الخلافة.', v_audio, 1860, now() - interval '16 days'),
    (v_podcast_id, 'طرابلس البحر', 'مدينة بين الجبل والبحر.', v_audio, 1440, now() - interval '7 days'),
    (v_podcast_id, 'صنعاء العريقة', 'حكايات العمارة الطينية.', v_audio, 1320, now() - interval '1 day');

  -- 7. Health
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('جسد صحي', 'نصائح عملية في التغذية واللياقة لأسلوب حياة متوازن.', 'الكابتن خالد العنزي', 'مدرب شخصي معتمد ومستشار تغذية', v_health, 'motivational', 'https://picsum.photos/seed/podcast7/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, '10 عادات صباحية تغيّر يومك', 'روتين صباحي بسيط.', v_audio, 1080, now() - interval '13 days'),
    (v_podcast_id, 'البروتين: كم نحتاج فعلاً؟', 'توضيح حول احتياج البروتين.', v_audio, 1200, now() - interval '5 days'),
    (v_podcast_id, 'تمارين بدون معدات', 'رياضة في البيت.', v_audio, 960, now() - interval '1 day');

  -- 8. Health
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('النوم العميق', 'علم النوم وتحسين جودته لصحة أفضل.', 'د. ليلى القحطاني', 'طبيبة نوم متخصصة', v_health, 'scientific', 'https://picsum.photos/seed/podcast8/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'دورة النوم', 'فهم مراحل النوم.', v_audio, 1380, now() - interval '17 days'),
    (v_podcast_id, 'الهاتف وبرودة الغرفة', 'عوامل تؤثر على النوم.', v_audio, 1140, now() - interval '8 days'),
    (v_podcast_id, 'قيلولة مثالية', 'متى وكيف تنام قيلولة.', v_audio, 900, now() - interval '3 days');

  -- 9. Career
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مسار', 'إرشادات مهنية للمبتدئين والمحترفين في عالم العمل.', 'م. ريم الشمري', 'مدرّبة مهنية ومستشارة في تطوير المسار', v_career, 'professional', 'https://picsum.photos/seed/podcast9/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'كتابة سيرة ذاتية تُقابل', 'أسرار السيرة الذاتية الناجحة.', v_audio, 1200, now() - interval '15 days'),
    (v_podcast_id, 'مقابلة العمل: الأسئلة الصعبة', 'كيف تجيب بثقة.', v_audio, 1380, now() - interval '7 days'),
    (v_podcast_id, 'الانتقال الوظيفي', 'متى وكيف تغيّر مسارك.', v_audio, 1440, now() - interval '1 day');

  -- 10. Career
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('العمل عن بُعد', 'نصائح للإنتاجية والتركيز أثناء العمل من المنزل.', 'أ. طارق الدوسري', 'مدير منتجات وخبير عمل عن بُعد', v_career, 'professional', 'https://picsum.photos/seed/podcast10/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'إدارة الوقت في المنزل', 'تقنيات بومودورو وغيرها.', v_audio, 1140, now() - interval '19 days'),
    (v_podcast_id, 'الاجتماعات الفعّالة', 'كيف تجعل اجتماعاتك مفيدة.', v_audio, 1020, now() - interval '10 days'),
    (v_podcast_id, 'التواصل غير المتزامن', 'فن الكتابة في العمل عن بُعد.', v_audio, 1260, now() - interval '2 days');

  -- 11. Finance
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('ريال وعقلية', 'ثقافة مالية مبسّطة: من الادخار إلى الاستثمار.', 'أ. عادل المطيري', 'مستشار مالي ومدرّب في الثقافة المالية', v_finance, 'professional', 'https://picsum.photos/seed/podcast11/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'قاعدة 50/30/20', 'توزيع الراتب بذكاء.', v_audio, 960, now() - interval '11 days'),
    (v_podcast_id, 'الصندوق الاستثماري للمبتدئ', 'كيف تبدأ الاستثمار.', v_audio, 1320, now() - interval '4 days'),
    (v_podcast_id, 'الدين: تجنّبه وادخاره', 'إدارة الديون.', v_audio, 1080, now() - interval '1 day');

  -- 12. Finance
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('أسواق', 'تحليل مبسّط لأسواق المال والعقارات.', 'م. هند الزهراني', 'محللة مالية وكاتبة اقتصادية', v_finance, 'professional', 'https://picsum.photos/seed/podcast12/400/400', 'expert')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الأسهم: من أين أبدأ؟', 'مقدمة لسوق الأسهم.', v_audio, 1500, now() - interval '16 days'),
    (v_podcast_id, 'العقار: استثمار أم سكن؟', 'مقارنة بين الخيارين.', v_audio, 1380, now() - interval '9 days'),
    (v_podcast_id, 'التضخم وكيف نحمي أنفسنا', 'فهم التضخم وأثره.', v_audio, 1260, now() - interval '3 days');

  -- 13. Family
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('بيت سعيد', 'مهارات اتصال وحوار داخل الأسرة.', 'د. منيرة الحربي', 'مستشارة أسرية ومدرّبة في العلاقات', v_family, 'motivational', 'https://picsum.photos/seed/podcast13/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'لغة الحب بين الزوجين', 'مفهوم لغات الحب الخمس.', v_audio, 1320, now() - interval '14 days'),
    (v_podcast_id, 'تربية الأطفال على المسؤولية', 'خطوات عملية للآباء.', v_audio, 1200, now() - interval '6 days'),
    (v_podcast_id, 'الخلاف الزوجي: كيف نديره؟', 'أدوات إدارة الخلاف.', v_audio, 1380, now() - interval '1 day');

  -- 14. Family
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('حبال', 'علاقات صحية وحدود واضحة في الصداقة والأسرة.', 'أ. سلمان الراشد', 'مدرّب في الذكاء العاطفي والعلاقات', v_family, 'motivational', 'https://picsum.photos/seed/podcast14/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الصداقة بعد الثلاثين', 'كيف نبني صداقات ناضجة.', v_audio, 1140, now() - interval '18 days'),
    (v_podcast_id, 'قول لا بثقة', 'فن وضع الحدود.', v_audio, 960, now() - interval '10 days'),
    (v_podcast_id, 'المسامحة الحقيقية', 'كيف نتجاوز الجراح.', v_audio, 1260, now() - interval '2 days');

  -- 15. Mental
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('هدوء', 'ممارسات للتأمل والوعي الذهني وتقليل التوتر.', 'د. أمل الغامدي', 'معالجة نفسية متخصصة في العلاج المعرفي', v_mental, 'motivational', 'https://picsum.photos/seed/podcast15/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'تنفّس 4-7-8', 'تقنية تنفس لتهدئة القلق.', v_audio, 720, now() - interval '12 days'),
    (v_podcast_id, 'التفكير الزائد', 'كيف نوقف التفكير الدائري.', v_audio, 1080, now() - interval '5 days'),
    (v_podcast_id, 'اليقظة الذهنية في العمل', 'تطبيقات عملية.', v_audio, 900, now() - interval '1 day');

  -- 16. Mental
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('من الداخل', 'فهم المشاعر والصدمات ورحلة التعافي النفسي.', 'د. فهد السبيعي', 'طبيب نفسي وكاتب في الصحة النفسية', v_mental, 'scientific', 'https://picsum.photos/seed/podcast16/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الصدمة ليست حكماً', 'فهم الصدمة النفسية.', v_audio, 1620, now() - interval '20 days'),
    (v_podcast_id, 'الاكتئاب: faces متعددة', 'أنماط الاكتئاب.', v_audio, 1500, now() - interval '11 days'),
    (v_podcast_id, 'العلاج المعرفي السلوكي', 'كيف يعالج القلق.', v_audio, 1380, now() - interval '4 days');

  -- 17. Leadership
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('قائد الرتلة', 'فن القيادة من التراث العربي إلى النظريات الحديثة.', 'د. بدر العتيبي', 'مدرّب قيادة ومستشار إداري', v_leadership, 'professional', 'https://picsum.photos/seed/podcast17/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'القيادة بالقدوة', 'أثر القدوة في القيادة.', v_audio, 1380, now() - interval '15 days'),
    (v_podcast_id, 'اتخاذ القرار تحت الضغط', 'مهارات القرار.', v_audio, 1200, now() - interval '8 days'),
    (v_podcast_id, 'تفويض السلطة', 'كيف تثق بفريقك.', v_audio, 1140, now() - interval '1 day');

  -- 18. Leadership
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('القيادة الرحيبة', 'قيادة مبنية على التعاطف والوعي لا السلطة.', 'أ. لمى الحارثي', 'مدرّبة في القيادة الواعية', v_leadership, 'motivational', 'https://picsum.photos/seed/podcast18/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الاستماع كأداة قيادية', 'فن الاستماع الفعّال.', v_audio, 1020, now() - interval '13 days'),
    (v_podcast_id, 'القائد الضعيف أمام فريقه', 'شجاعة الضعف في القيادة.', v_audio, 1140, now() - interval '6 days'),
    (v_podcast_id, 'بناء الثقة', 'كيف نكسب ثقة فريقنا.', v_audio, 1260, now() - interval '2 days');

  -- 19. Technology
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('عُقال تك', 'تبسيط التقنية من البرمجة إلى الأمن السيبراني.', 'م. وليد القحطاني', 'مهندس برمجيات وصانع محتوى تقني', v_tech, 'scientific', 'https://picsum.photos/seed/podcast19/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'ما هو البرمجة فعلاً؟', 'مقدمة مبسّطة للبرمجة.', v_audio, 1200, now() - interval '14 days'),
    (v_podcast_id, 'الأمان الرقمي للجميع', 'نصائح حماية حساباتك.', v_audio, 1080, now() - interval '7 days'),
    (v_podcast_id, 'السحابة: أين تخزن بياناتك؟', 'فهم الحوسبة السحابية.', v_audio, 1320, now() - interval '1 day');

  -- 20. Technology
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('مستقبل التقنية', 'استكشاف التقنيات الناشئة وتأثيرها على حياتنا.', 'م. نورة السعد', 'محللة تقنية وكاتبة في الابتكار', v_tech, 'scientific', 'https://picsum.photos/seed/podcast20/400/400', 'intermediate')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الواقع الافتراضي بعد عشر سنوات', 'آفاق الـVR.', v_audio, 1380, now() - interval '17 days'),
    (v_podcast_id, 'بلوكشين: أبعد من العملات', 'تطبيقات البلوكشين.', v_audio, 1500, now() - interval '9 days'),
    (v_podcast_id, 'الحوسبة الكمومية', 'مقدمة للكمبيوتر الكمومي.', v_audio, 1620, now() - interval '3 days');

  -- 21. Motivational (cross-category)
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('اصنع عادتك', 'خطة عملية لبناء عادات إيجابية والتخلص من العادات السلبية.', 'أ. تركي الدوسري', 'مدرّب معتمد في العادات والتغيير السلوكي', v_mental, 'motivational', 'https://picsum.photos/seed/podcast21/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'العادات الذرية', 'كيف تبني عادات صغيرة بأثر كبير.', v_audio, 1200, now() - interval '12 days'),
    (v_podcast_id, '21 يوماً: حقيقة أم خرافة؟', 'كم يستغرق بناء عادة.', v_audio, 960, now() - interval '5 days'),
    (v_podcast_id, 'هوية العادة', 'من أنت لا ما تفعل.', v_audio, 1080, now() - interval '1 day');

  -- 22. Motivational (cross-category)
  INSERT INTO podcasts (title, description, host_name, host_bio, category_id, type, cover_url, audience_level)
  VALUES ('بداية جديدة', 'تحفيز وإلهام لمن يريد إعادة اختراع نفسه في أي مرحلة.', 'أ. أسماء الزهراني', 'متحدثة تحفيزية ومدرّبة في تطوير الذات', v_career, 'motivational', 'https://picsum.photos/seed/podcast22/400/400', 'beginner')
  RETURNING id INTO v_podcast_id;
  INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at) VALUES
    (v_podcast_id, 'الخوف من البداية', 'كيف تتجاوز حاجز الخوف.', v_audio, 1020, now() - interval '16 days'),
    (v_podcast_id, 'الفشل: أول درجة في النجاح', 'إعادة تأطير الفشل.', v_audio, 1140, now() - interval '8 days'),
    (v_podcast_id, 'إعادة اختراع نفسك بعد الأربعين', 'لا يوجد سن متأخر.', v_audio, 1260, now() - interval '2 days');

END $$;
