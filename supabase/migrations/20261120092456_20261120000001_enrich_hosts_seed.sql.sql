/*
# Enrich seeded hosts with professional profile data

1. Changes
- Updates every host created from the podcast seed data with:
  - Readable URL slugs (replacing host-1, host-2, ...)
  - Honorific titles (دكتور, شيخ, أستاذ, مهندس, مدرب, كابتن)
  - Specialty, country, and social links
  - Realistic follower counts and verified badges

2. Notes
- Matched by Arabic name (stable across rebuilds of the base seed).
- Idempotent: plain UPDATE statements, safe to re-run.
- Each host keeps the podcast(s) migrated from the original seed (1 podcast each,
  satisfying the 1-4 podcasts per host requirement).
*/

UPDATE hosts SET slug = 'abdullah-alharthy', title_ar = 'شيخ', specialty_ar = 'التزكية الروحية والعلوم الشرعية', bio_ar = 'الشيخ عبدالله الحارثي داعية وكاتب متخصص في التزكية الروحية، يقدّم برنامجاً أسبوعياً يستلهم الحكمة من الموروث الديني ويطبّقها على قضايا الحياة المعاصرة. له عدة كتب في الرقائق والمناسك.', country = 'السعودية', is_verified = true, followers_count = 48200, social_links = '{"youtube":"https://youtube.com/@abdullah-alharthy","twitter":"https://twitter.com/abdullah_alharthy","instagram":"https://instagram.com/abdullah.alharthy","website":"https://alharthy.example.com"}'::jsonb WHERE name_ar = 'الشيخ عبدالله الحارثي';

UPDATE hosts SET slug = 'noura-alkhalid', title_ar = 'أستاذة', specialty_ar = 'التربية الإيمانية', bio_ar = 'الأستاذة نورا الخالد كاتبة ومستشارة في التربية الإيمانية، تعمل مع الأسر والمدارس على بناء جيل متوازن إيمانياً وعلمياً. تقدّم حلقات تأملية شهرية حول المعاني الإيمانية.', country = 'الكويت', is_verified = true, followers_count = 35700, social_links = '{"twitter":"https://twitter.com/noura_khalid","instagram":"https://instagram.com/noura.alkhalid","website":"https://noura.example.com"}'::jsonb WHERE name_ar = 'الأستاذة نورا الخالد';

UPDATE hosts SET slug = 'majed-alotaibi', title_ar = 'دكتور', specialty_ar = 'الفيزياء والفلك', bio_ar = 'د. ماجد العتيبي أستاذ فيزياء وباحث في العلوم التطبيقية، حاصل على جائزة التميز العلمي. يبسّط أحدث الاكتشافات العلمية في بودكاست عقول فضولية ويقدّمها بلغة ممتعة للجميع.', country = 'السعودية', is_verified = true, followers_count = 62400, social_links = '{"youtube":"https://youtube.com/@majed-science","twitter":"https://twitter.com/majed_otibi","website":"https://majed.example.com"}'::jsonb WHERE name_ar = 'د. ماجد العتيبي';

UPDATE hosts SET slug = 'sara-almansour', title_ar = 'دكتور', specialty_ar = 'علم الأحياء', bio_ar = 'د. سارة المنصور عالمة أحياء ومدرّبة في العلوم، شغوفة بنقل الثقافة العلمية إلى المجتمع العربي عبر تحليل الأشياء اليومية من التغذية إلى التكنولوجيا بعين علمية.', country = 'مصر', is_verified = true, followers_count = 41800, social_links = '{"instagram":"https://instagram.com/sara.biology","twitter":"https://twitter.com/sara_mansour","website":"https://sara.example.com"}'::jsonb WHERE name_ar = 'د. سارة المنصور';

UPDATE hosts SET slug = 'yousef-alshehri', title_ar = 'أستاذ', specialty_ar = 'النقد الأدبي', bio_ar = 'الأستاذ يوسف الشهري ناقد أدبي وصاحب مكتبة متخصصة في الكتب العربية، يحاور الكتّاب والشعراء ويقرأ في الروايات والمعارك الفكرية عبر حبر وورق.', country = 'السعودية', is_verified = false, followers_count = 18300, social_links = '{"twitter":"https://twitter.com/yousef_books","instagram":"https://instagram.com/yousef.aladab"}'::jsonb WHERE name_ar = 'الأستاذ يوسف الشهري';

UPDATE hosts SET slug = 'fatima-alghamdi', title_ar = 'أستاذة', specialty_ar = 'التاريخ ووثائقات الرحلات', bio_ar = 'الأستاذة فاطمة الغامدي كاتبة رحلات ومؤرخة توثّق حكايات المدن العربية وعمارتها وذاكرتها الشعبية في رحلات مُستمعة عبر بودكاست ذاكرة الأمكنة.', country = 'اليمن', is_verified = true, followers_count = 27900, social_links = '{"instagram":"https://instagram.com/fatima.travels","twitter":"https://twitter.com/fatima_ghamdi","website":"https://fatima.example.com"}'::jsonb WHERE name_ar = 'الأستاذة فاطمة الغامدي';

UPDATE hosts SET slug = 'khalid-alenezi', title_ar = 'كابتن', specialty_ar = 'التدريب الرياضي والتغذية', bio_ar = 'الكابتن خالد العنزي مدرب شخصي معتمد ومستشار تغذية، يساعد المستمعين على بناء أسلوب حياة متوازن من خلال عادات عملية في التغذية واللياقة.', country = 'الكويت', is_verified = true, followers_count = 54300, social_links = '{"youtube":"https://youtube.com/@khalid-fit","instagram":"https://instagram.com/khalid.fitness","twitter":"https://twitter.com/khalid_enezi"}'::jsonb WHERE name_ar = 'الكابتن خالد العنزي';

UPDATE hosts SET slug = 'layla-alqahtani', title_ar = 'دكتور', specialty_ar = 'طب النوم', bio_ar = 'د. ليلى القحطاني طبيبة نوم متخصصة، تشرح علم النوم وتحسين جودته بأدلة علمية، وتستقبل أسئلة المستمعين حول الأرق واضطرابات النوم.', country = 'الإمارات', is_verified = true, followers_count = 33600, social_links = '{"twitter":"https://twitter.com/layla_sleep","instagram":"https://instagram.com/dr.layla","website":"https://layla.example.com"}'::jsonb WHERE name_ar = 'د. ليلى القحطاني';

UPDATE hosts SET slug = 'reem-alshammari', title_ar = 'مهندس', specialty_ar = 'تطوير المسار المهني', bio_ar = 'م. ريم الشمري مدرّبة مهنية ومستشارة في تطوير المسار، ساعدت آلاف الخريجين على دخول سوق العمل عبر إرشادات عملية في السيرة الذاتية والمقابلات.', country = 'السعودية', is_verified = true, followers_count = 29700, social_links = '{"linkedin":"https://linkedin.com/in/reem-shammari","twitter":"https://twitter.com/reem_career","website":"https://reem.example.com"}'::jsonb WHERE name_ar = 'م. ريم الشمري';

UPDATE hosts SET slug = 'tariq-aldossary', title_ar = 'أستاذ', specialty_ar = 'إدارة المنتجات والعمل عن بُعد', bio_ar = 'أ. طارق الدوسري مدير منتجات وخبير عمل عن بُعد، يشارك خبرته في الإنتاجية والتركيز وإدارة الفرق الموزعة عبر قارات مختلفة.', country = 'البحرين', is_verified = false, followers_count = 21400, social_links = '{"twitter":"https://twitter.com/tariq_remote","linkedin":"https://linkedin.com/in/tariq-dossary"}'::jsonb WHERE name_ar = 'أ. طارق الدوسري';

UPDATE hosts SET slug = 'adel-almutairi', title_ar = 'أستاذ', specialty_ar = 'الثقافة المالية', bio_ar = 'أ. عادل المطيري مستشار مالي ومدرّب في الثقافة المالية، يبسّط الادخار والاستثمار وإدارة الديون بلغة واقعية يناسبها كل مستمع.', country = 'السعودية', is_verified = true, followers_count = 47100, social_links = '{"youtube":"https://youtube.com/@adel-money","twitter":"https://twitter.com/adel_finance","website":"https://adel.example.com"}'::jsonb WHERE name_ar = 'أ. عادل المطيري';

UPDATE hosts SET slug = 'hind-alzahrani', title_ar = 'مهندس', specialty_ar = 'التحليل المالي والاقتصاد', bio_ar = 'م. هند الزهراني محللة مالية وكاتبة اقتصادية، تحلل أسواق المال والعقارات وترصد مؤشرات الاقتصاد الكلي بأرقام واضحة.', country = 'السعودية', is_verified = true, followers_count = 38900, social_links = '{"twitter":"https://twitter.com/hind_markets","linkedin":"https://linkedin.com/in/hind-zahrani"}'::jsonb WHERE name_ar = 'م. هند الزهراني';

UPDATE hosts SET slug = 'munira-alharbi', title_ar = 'دكتور', specialty_ar = 'الاستشارات الأسرية', bio_ar = 'د. منيرة الحربي مستشارة أسرية ومدرّبة في العلاقات، تعمل مع الأزواج والآباء على مهارات الاتصال والحوار داخل الأسرة.', country = 'الأردن', is_verified = true, followers_count = 31200, social_links = '{"instagram":"https://instagram.com/munira.family","twitter":"https://twitter.com/munira_harbi","website":"https://munira.example.com"}'::jsonb WHERE name_ar = 'د. منيرة الحربي';

UPDATE hosts SET slug = 'salman-alrashid', title_ar = 'أستاذ', specialty_ar = 'الذكاء العاطفي والعلاقات', bio_ar = 'أ. سلمان الراشد مدرّب في الذكاء العاطفي والعلاقات، يساعد المستمعين على بناء صداقات ناضجة وحدود واضحة في العلاقات.', country = 'قطر', is_verified = false, followers_count = 16800, social_links = '{"instagram":"https://instagram.com/salman.eq","twitter":"https://twitter.com/salman_rashid"}'::jsonb WHERE name_ar = 'أ. سلمان الراشد';

UPDATE hosts SET slug = 'amal-alghamdi', title_ar = 'دكتور', specialty_ar = 'العلاج النفسي المعرفي', bio_ar = 'د. أمل الغامدي معالجة نفسية متخصصة في العلاج المعرفي، تقدّم ممارسات للتأمل والوعي الذهني وتقليل التوتر بأساليب مثبتة علمياً.', country = 'السعودية', is_verified = true, followers_count = 44500, social_links = '{"instagram":"https://instagram.com/amal.mind","twitter":"https://twitter.com/amal_ghamdi","website":"https://amal.example.com"}'::jsonb WHERE name_ar = 'د. أمل الغامدي';

UPDATE hosts SET slug = 'fahad-alsubaie', title_ar = 'دكتور', specialty_ar = 'الطب النفسي', bio_ar = 'د. فهد السبيعي طبيب نفسي وكاتب في الصحة النفسية، يشرح المشاعر المعقدة والصدمات ورحلة التعافي بلغة إنسانية قريبة.', country = 'السعودية', is_verified = true, followers_count = 52100, social_links = '{"twitter":"https://twitter.com/fahad_psy","youtube":"https://youtube.com/@fahad-psy","website":"https://fahad.example.com"}'::jsonb WHERE name_ar = 'د. فهد السبيعي';

UPDATE hosts SET slug = 'badr-alotaibi', title_ar = 'دكتور', specialty_ar = 'القيادة والإدارة', bio_ar = 'د. بدر العتيبي مدرّب قيادة ومستشار إداري، يجمع بين التراث العربي والنظريات الحديثة في تدريب القادة والمديرين.', country = 'السعودية', is_verified = true, followers_count = 36800, social_links = '{"linkedin":"https://linkedin.com/in/badr-otaibi","twitter":"https://twitter.com/badr_leadership"}'::jsonb WHERE name_ar = 'د. بدر العتيبي';

UPDATE hosts SET slug = 'lama-alharthy', title_ar = 'أستاذة', specialty_ar = 'القيادة الواعية', bio_ar = 'أ. لمى الحارثي مدرّبة في القيادة الواعية، تؤمن أن القيادة الحقيقية مبنية على التعاطف والوعي لا السلطة، وتدرب النساء والشباب على ذلك.', country = 'عمان', is_verified = false, followers_count = 19200, social_links = '{"instagram":"https://instagram.com/lama.leads","twitter":"https://twitter.com/lama_harthy"}'::jsonb WHERE name_ar = 'أ. لمى الحارثي';

UPDATE hosts SET slug = 'walid-alqahtani', title_ar = 'مهندس', specialty_ar = 'هندسة البرمجيات', bio_ar = 'م. وليد القحطاني مهندس برمجيات وصانع محتوى تقني، يبسّط البرمجة والأمن السيبراني والحوسبة السحابية للمستمع العربي.', country = 'السعودية', is_verified = true, followers_count = 41700, social_links = '{"youtube":"https://youtube.com/@walid-tech","twitter":"https://twitter.com/walid_dev","github":"https://github.com/walid"}'::jsonb WHERE name_ar = 'م. وليد القحطاني';

UPDATE hosts SET slug = 'noura-alsaad', title_ar = 'مهندس', specialty_ar = 'التحليل التقني والابتكار', bio_ar = 'م. نورة السعد محللة تقنية وكاتبة في الابتكار، تستكشف التقنيات الناشئة من الواقع الافتراضي إلى الحوسبة الكمومية وتأثيرها على حياتنا.', country = 'الإمارات', is_verified = true, followers_count = 25500, social_links = '{"twitter":"https://twitter.com/noura_tech","linkedin":"https://linkedin.com/in/noura-saad"}'::jsonb WHERE name_ar = 'م. نورة السعد';

UPDATE hosts SET slug = 'turki-aldossary', title_ar = 'مدرب', specialty_ar = 'العادات والتغيير السلوكي', bio_ar = 'أ. تركي الدوسري مدرّب معتمد في العادات والتغيير السلوكي، يحوّل كتب التنمية الذاتية إلى خطط عملية قابلة للتنفيذ من اليوم الأول.', country = 'الكويت', is_verified = true, followers_count = 39400, social_links = '{"instagram":"https://instagram.com/turki.habits","twitter":"https://twitter.com/turki_habits","website":"https://turki.example.com"}'::jsonb WHERE name_ar = 'أ. تركي الدوسري';

UPDATE hosts SET slug = 'asmaa-alzahrani', title_ar = 'أستاذة', specialty_ar = 'التحفيز وتطوير الذات', bio_ar = 'أ. أسماء الزهراني متحدثة تحفيزية ومدرّبة في تطوير الذات، تلهم من يريد إعادة اختراع نفسه في أي مرحلة من العمر.', country = 'المغرب', is_verified = false, followers_count = 22600, social_links = '{"instagram":"https://instagram.com/asmaa.speaks","twitter":"https://twitter.com/asmaa_zahrani"}'::jsonb WHERE name_ar = 'أ. أسماء الزهراني';
