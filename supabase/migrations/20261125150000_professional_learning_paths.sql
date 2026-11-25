-- Professional learning paths linked to real platform content
-- Idempotent: upserts by fixed path IDs and replaces their steps.
-- Run in Supabase SQL Editor after previous migrations.

BEGIN;

-- Ensure RLS/policies exist for anon/authenticated read if missing (safe if already present)
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_steps ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_paths' AND policyname='select_learning_paths'
  ) THEN
    CREATE POLICY select_learning_paths ON learning_paths FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='learning_path_steps' AND policyname='select_path_steps'
  ) THEN
    CREATE POLICY select_path_steps ON learning_path_steps FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Helper: pick category id by Arabic name
-- 1) Career growth
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'مسار النمو المهني وبناء العادات',
  'رحلة عملية تساعدك تبني عادات مهنية ثابتة، وتحوّل الاستماع إلى تطبيق واضح خلال أسبوعك.',
  (SELECT id FROM categories WHERE name_ar = 'المسيرة المهنية' ORDER BY created_at LIMIT 1),
  4, 'beginner', '🚀'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000001'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000101'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,1,'استمع: عادة صغيرة تصنع فرقًا','ابدأ بحلقة قصيرة من بودكاست د. خالد المنيف، واختر عادة واحدة قابلة للتنفيذ فورًا.','podcast','a1f1e879-b9a0-464b-9611-5f535c10b3ee'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000102'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,2,'طبّق: عادة 10 دقائق','التزم بعادة واحدة لمدة 10 دقائق يوميًا لمدة 3 أيام. سجّل الوقت والنتيجة.','mission',NULL,NULL,'اختر عادة مرتبطة بهدف مهني واضح، وليس مجرد انشغال.',30),
('b1000001-0000-4000-8000-000000000103'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,3,'استمع: اصنع عاداتك','حلقة عملية تساعدك تفهم كيف تتحول النية إلى سلوك متكرر.','podcast','a09c8a56-cf02-4492-a655-a55c08ef9ed8'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000104'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,4,'تأمل: ما الذي يعطّلك؟','اكتب العائق الأساسي الذي يمنعك من الاستمرار، ثم حلًا واحدًا بسيطًا له.','reflection',NULL,NULL,'الاستمرارية أهم من الكمال. إذا فاتك يوم، ارجع في اليوم التالي.',15),
('b1000001-0000-4000-8000-000000000105'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,5,'استمع: تجربة وخبرة مهنية','استمع لمحادثة ملهمة من ABtalks واستخرج درسًا واحدًا تطبقه في عملك.','podcast','206dac80-f8ed-4639-91b1-a6b7c149f41f'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000106'::uuid,'b1000001-0000-4000-8000-000000000001'::uuid,6,'نصيحة: راجع تقدمك أسبوعيًا','خصص 10 دقائق نهاية الأسبوع لمراجعة ما نجح وما يحتاج تعديلًا.','tip',NULL,NULL,'اكتب إنجازًا واحدًا وعائقًا واحدًا وخطوة واحدة للأسبوع القادم.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 2) Financial awareness
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000002'::uuid,
  'مسار الوعي المالي الذكي',
  'افهم المال واتخذ قرارات أفضل من خلال حلقات عملية وخطوات تطبيق قصيرة.',
  (SELECT id FROM categories WHERE name_ar = 'المال والاستثمار' ORDER BY created_at LIMIT 1),
  4, 'beginner', '📊'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000002'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000201'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,1,'استمع: نظرة عملية على المال','ابدأ بحلقة من ترانزيت لتكوين صورة عملية عن المال والحياة اليومية.','podcast','beb43afd-9246-423a-a45e-c9980192b567'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000202'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,2,'طبّق: تتبع مصروفاتك','سجّل مصروفاتك لمدة 3 أيام بدون حكم. الهدف هو الوعي قبل التغيير.','mission',NULL,NULL,'قسّم المصروفات إلى: ضروري، مهم، يمكن تأجيله.',30),
('b1000001-0000-4000-8000-000000000203'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,3,'استمع: قرار مالي أفضل','استمع لحلقة من فنجان واستخرج فكرة واحدة عن اتخاذ القرار.','podcast','b033bb94-26c4-4aa9-846b-b0f6443203ff'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000204'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,4,'نصيحة: افصل الرغبة عن الحاجة','قبل الشراء اسأل نفسك: هل أحتاجه الآن؟ هل له بديل؟ هل سأندم؟','tip',NULL,NULL,'انتظر 24 ساعة قبل أي شراء غير ضروري.',10),
('b1000001-0000-4000-8000-000000000205'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,5,'استمع: المال والأعمال','حلقة من Mix Business توسّع فهمك للمال والعمل.','podcast','0cae0ae6-d000-4d64-bd10-cef4a87b6dd1'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000206'::uuid,'b1000001-0000-4000-8000-000000000002'::uuid,6,'تأمل: قرار مالي هذا الأسبوع','ما قرار مالي صغير يمكنك اتخاذه هذا الأسبوع ليحسن وضعك؟','reflection',NULL,NULL,'التحسن المالي يبدأ بقرار صغير متكرر.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 3) Healthy balanced life
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000003'::uuid,
  'مسار الصحة والعافية المتوازنة',
  'خطوات واقعية لتحسين صحتك الجسدية ونمط حياتك مع محتوى مسموع قابل للتطبيق.',
  (SELECT id FROM categories WHERE name_ar = 'الصحة واللياقة' ORDER BY created_at LIMIT 1),
  3, 'beginner', '🌿'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000003'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000301'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,1,'استمع: ابدأ بعافية أفضل','حلقة من "عيشها صح" تضعك في مزاج صحي عملي.','podcast','7a23cc99-bb1b-4519-8625-721743e7bdba'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000302'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,2,'طبّق: حركة 15 دقيقة','امشِ أو تحرك لمدة 15 دقيقة اليوم. اجعلها سهلة بما يكفي لتتكرر.','mission',NULL,NULL,'اربط الحركة بموعد ثابت بعد صلاة أو قبل النوم.',25),
('b1000001-0000-4000-8000-000000000303'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,3,'استمع: طاقة وحركة','حلقة من بودكاست الجولة تمنحك دفعة نشاط.','podcast','7b499d61-470c-438d-9806-106bd74393ec'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000304'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,4,'نصيحة: النظام الصغير ينتصر','لا تبحث عن خطة مثالية؛ ابحث عن خطة تستطيع الالتزام بها.','tip',NULL,NULL,'الاستمرارية على القليل أفضل من الحماس الذي ينقطع.',10),
('b1000001-0000-4000-8000-000000000305'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,5,'استمع: الجانب النفسي للحركة','استمع لحلقة من أثير الكرة حول العامل النفسي وتأثيره على الأداء.','podcast','2268c81c-0152-442e-9fe1-af7abc821483'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000306'::uuid,'b1000001-0000-4000-8000-000000000003'::uuid,6,'تأمل: عادة صحية واحدة','ما العادة الصحية الأسهل التي يمكنك تثبيتها هذا الأسبوع؟','reflection',NULL,NULL,'اختر عادة واحدة فقط، وامنحها فرصة 7 أيام.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 4) Mental calm
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000004'::uuid,
  'مسار الطمأنينة والصحة النفسية',
  'مسار هادئ لفهم المشاعر، تخفيف الضغط، وبناء عادة مراجعة داخلية بسيطة.',
  (SELECT id FROM categories WHERE name_ar = 'الصحة النفسية' ORDER BY created_at LIMIT 1),
  4, 'beginner', '💙'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000004'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000401'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,1,'استمع: فهم المشاعر','ابدأ بحلقة من "نفسيتي" لفهم أثر المشاعر والتجارب على حياتك.','podcast','acd3c9b3-ad2f-470e-85c0-4038ff268a7f'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000402'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,2,'طبّق: 5 دقائق هدوء','خصص 5 دقائق بعيدًا عن الشاشة للتنفس الهادئ أو الجلوس دون تشتيت.','mission',NULL,NULL,'ضع المنبه على 5 دقائق فقط؛ البداية الصغيرة أسهل.',25),
('b1000001-0000-4000-8000-000000000403'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,3,'استمع: عندما يشتد القلق','حلقة تساعدك تميز الأفكار المقلقة وتتعامل معها بوعي.','podcast','6e9713f9-49b9-417d-8e2c-adab595423cc'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000404'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,4,'تأمل: سمِّ الشعور','اكتب الشعور الذي يزورك كثيرًا هذه الأيام، ومتى يظهر، وما الذي يخففه.','reflection',NULL,NULL,'تسمية الشعور بدقة خطوة أولى للسيطرة عليه.',15),
('b1000001-0000-4000-8000-000000000405'::uuid,'b1000001-0000-4000-8000-000000000004'::uuid,5,'نصيحة: الراحة جزء من الإنتاج','لا تؤجل الراحة حتى الإرهاق. ضع حدًا بسيطًا للتوقف اليومي.','tip',NULL,NULL,'راحة قصيرة يوميًا أفضل من انهيار طويل لاحقًا.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 5) Spiritual balance
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000005'::uuid,
  'مسار الروحانية والاتزان',
  'رحلة هادئة تجمع الاستماع والتطبيق والتأمل لبناء اتزان روحي يومي.',
  (SELECT id FROM categories WHERE name_ar = 'روحاني / ديني' ORDER BY created_at LIMIT 1),
  4, 'beginner', '🕌'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000005'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000501'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,1,'استمع: بداية هادئة','ابدأ بحلقة من السراج المنير في وقت هادئ بعيدًا عن المشتتات.','podcast','64d46333-17cb-490c-8462-310ea563c502'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000502'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,2,'طبّق: ورد يومي بسيط','حدد وردًا بسيطًا يمكنك الالتزام به لمدة 7 أيام.','mission',NULL,NULL,'اجعل الورد صغيرًا وثابتًا: دقائق معدودة تكفي.',25),
('b1000001-0000-4000-8000-000000000503'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,3,'استمع: استمرارية','حلقة أخرى تعزز الثبات والمعنى.','podcast','1babc486-23e6-45b9-8785-de89981f1c94'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000504'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,4,'تأمل: ما الذي يقربك؟','اكتب عادة روحية واحدة تشعر أنها تقربك وتريد تثبيتها.','reflection',NULL,NULL,'الثبات على القليل خير من الانقطاع بعد الكثير.',15),
('b1000001-0000-4000-8000-000000000505'::uuid,'b1000001-0000-4000-8000-000000000005'::uuid,5,'نصيحة: اجعلها بعد عادة ثابتة','اربط وردك بموعد ثابت مثل بعد صلاة أو قبل النوم.','tip',NULL,NULL,'الموعد الثابت يجعل الاستمرار أسهل.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 6) Culture and knowledge
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000006'::uuid,
  'مسار الثقافة والمعرفة اليومية',
  'وسّع أفقك بمعرفة وثقافة عربية متنوعة، مع خطوات استماع وتلخيص وتأمل.',
  (SELECT id FROM categories WHERE name_ar = 'ثقافة وأدب' ORDER BY created_at LIMIT 1),
  3, 'beginner', '📖'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000006'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000601'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,1,'استمع: فكرة من كتاب/معرفة','ابدأ بحلقة من ساندوتش ورقي واستخرج فكرة واحدة مفيدة.','podcast','8f25a400-acd9-48c8-8be1-562ca8bae138'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000602'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,2,'طبّق: لخص في 3 جمل','اكتب: الفكرة، لماذا تهمك، وكيف ستطبقها.','mission',NULL,NULL,'التلخيص القصير يحول الاستماع إلى معرفة.',25),
('b1000001-0000-4000-8000-000000000603'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,3,'استمع: حوار يوسع الأفق','استمع لحلقة من "استشارة مع سارة" ولاحظ طريقة طرح الأسئلة.','podcast','73a3fd1b-6af7-4584-baca-67de71a3c2d3'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000604'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,4,'استمع: اسأل بشكل أفضل','حلقة ثانية تمنحك زاوية مختلفة حول التفكير والحوار.','podcast','e6c68291-a456-48d8-8605-c45592124f07'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000605'::uuid,'b1000001-0000-4000-8000-000000000006'::uuid,5,'تأمل: فكرة غيّرت نظرتك','ما الفكرة التي سمعتها مؤخرًا وتستحق أن تطبقها؟','reflection',NULL,NULL,'المعرفة بلا تطبيق تبقى معلومة فقط.',15)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 7) Relationships & family
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000007'::uuid,
  'مسار العلاقات والتواصل الأسري',
  'حسّن جودة علاقاتك عبر الاستماع الواعي، التطبيق العملي، والتأمل في المواقف اليومية.',
  (SELECT id FROM categories WHERE name_ar = 'العلاقات والأسرة' ORDER BY created_at LIMIT 1),
  3, 'intermediate', '💬'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000007'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000701'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,1,'استمع: فهم منظور مختلف','استمع لحلقة من "بداية الحكاية" وافهم كيف تتشكل القصة خلف السلوك.','podcast','873bdb9e-bde7-4b83-bddf-612ed702389b'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000702'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,2,'طبّق: استماع بدون مقاطعة','في محادثة اليوم، استمع 3 دقائق كاملة قبل الرد.','mission',NULL,NULL,'هدفك أن تفهم، ليس أن تفوز بالنقاش.',30),
('b1000001-0000-4000-8000-000000000703'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,3,'استمع: قصة وتعلّم','حلقة أخرى تذكرك أن خلف كل موقف سياقًا إنسانيًا.','podcast','13ae9228-3d01-4a2f-af5d-77e87aeddc49'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000704'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,4,'تأمل: علاقة تريد تحسينها','ما علاقة واحدة تريد تحسينها هذا الأسبوع؟ وما أول خطوة صغيرة؟','reflection',NULL,NULL,'ابدأ بسؤال صادق بدل افتراض.',15),
('b1000001-0000-4000-8000-000000000705'::uuid,'b1000001-0000-4000-8000-000000000007'::uuid,5,'نصيحة: وضّح لا تفترض','الافتراضات تفسد العلاقات؛ الوضوح اللطيف يحميها.','tip',NULL,NULL,'استخدم عبارة: "أريد أفهم قصدك أكثر".',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

-- 8) Leadership & communication
INSERT INTO learning_paths (id, title, description, category_id, duration_weeks, difficulty, cover_emoji)
VALUES (
  'b1000001-0000-4000-8000-000000000008'::uuid,
  'مسار القيادة وفن التواصل',
  'طوّر حضورك القيادي وأسلوب تواصلك من خلال محتوى عربي وخطوات تطبيق عملية.',
  (SELECT id FROM categories WHERE name_ar = 'القيادة' ORDER BY created_at LIMIT 1),
  4, 'intermediate', '🎙️'
)
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title, description=EXCLUDED.description, category_id=EXCLUDED.category_id,
  duration_weeks=EXCLUDED.duration_weeks, difficulty=EXCLUDED.difficulty, cover_emoji=EXCLUDED.cover_emoji;
DELETE FROM learning_path_steps WHERE path_id = 'b1000001-0000-4000-8000-000000000008'::uuid;
INSERT INTO learning_path_steps (id, path_id, step_order, title, description, step_type, linked_episode_id, linked_mission_id, tip_text, xp_reward) VALUES
('b1000001-0000-4000-8000-000000000801'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,1,'استمع: تعلم من خبرة','استمع لحلقة من ABtalks ولاحظ كيف يُبنى الحوار العميق.','podcast','8d0a3149-f0ab-4478-b3c5-77eb40e20edc'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000802'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,2,'طبّق: سؤال أفضل','في اجتماع أو محادثة، اسأل سؤالًا مفتوحًا واحدًا بدل إعطاء رأي سريع.','mission',NULL,NULL,'الأسئلة الجيدة علامة قيادة، لا ضعف.',30),
('b1000001-0000-4000-8000-000000000803'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,3,'استمع: قرار وتأثير','حلقة من فنجان عن الجامعات والمستقبل تمنحك زاوية تفكير قيادية.','podcast','1c36be5c-8cef-4b05-a292-9edeb78bfc9a'::uuid,NULL,NULL,20),
('b1000001-0000-4000-8000-000000000804'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,4,'تأمل: أسلوب تأثيرك','كيف تؤثر عادة: بالأوامر، بالقدوة، أم بالأسئلة؟ وما الذي تريد تطويره؟','reflection',NULL,NULL,'القائد الجيد يوضح الهدف ويستمع قبل أن يقرر.',15),
('b1000001-0000-4000-8000-000000000805'::uuid,'b1000001-0000-4000-8000-000000000008'::uuid,5,'نصيحة: تواصل واضح','اجعل رسالتك قصيرة: السياق، المطلوب، والموعد.','tip',NULL,NULL,'الوضوح يوفر وقت الفريق ويقلل الاحتكاك.',10)
ON CONFLICT (id) DO UPDATE SET
  path_id=EXCLUDED.path_id, step_order=EXCLUDED.step_order, title=EXCLUDED.title, description=EXCLUDED.description,
  step_type=EXCLUDED.step_type, linked_episode_id=EXCLUDED.linked_episode_id, linked_mission_id=EXCLUDED.linked_mission_id,
  tip_text=EXCLUDED.tip_text, xp_reward=EXCLUDED.xp_reward;

COMMIT;
