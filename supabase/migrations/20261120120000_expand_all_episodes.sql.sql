/*
# Complete the episode library for every podcast

- Tops every podcast up to 10 episodes (never duplicates existing ones).
- Episode titles/themes are chosen from category-specific sets.
- Idempotent: only fills the gap between the current count and 10.
*/

DO $$
DECLARE
  v_audio text := 'https://www.buzzsprout.com/2196707/episodes/20137689-84.mp3';
  v_pod RECORD;
  v_count int;
  v_k int;
  v_cat_name text;
  v_theme text;
BEGIN
  FOR v_pod IN SELECT id, title, category_id FROM podcasts LOOP
    SELECT count(*) INTO v_count FROM episodes WHERE podcast_id = v_pod.id;
    CONTINUE WHEN v_count >= 10;

    SELECT name_ar INTO v_cat_name FROM categories WHERE id = v_pod.category_id;

    FOR v_k IN v_count + 1 .. 10 LOOP
      v_theme := CASE v_cat_name
        WHEN 'روحاني / ديني' THEN (ARRAY['معنى الإخلاص','الصبر الجميل','أدب الدعاء','قوة النية','الغفران','السيرة والقدوة','القرآن في حياتنا','التزكية','الرحمة','الخشوع'])[((v_k - 1) % 10) + 1]
        WHEN 'العلوم' THEN (ARRAY['أصل الحكاية','تجربة علمية','اكتشاف مدهش','وراء الكواليس','كيف يعمل؟','سؤال صعب','الخطأ الذي علّمنا','مستقبل البحث','مختبر صغير','خلاصة الحلقة'])[((v_k - 1) % 10) + 1]
        WHEN 'ثقافة وأدب' THEN (ARRAY['قراءة في نص','حوار مع كاتب','الذاكرة والهوية','حكاية مدينة','اللغة الجميلة','الرواية','السينما والأدب','النقد','التراث','رسالة للقارئ'])[((v_k - 1) % 10) + 1]
        WHEN 'الصحة واللياقة' THEN (ARRAY['خطوة اليوم','قواعد بسيطة','الجسد يتكلم','عادات صحية','الراحة جزء من العلاج','التغذية','الحركة','النوم','الميزان','استمرار'])[((v_k - 1) % 10) + 1]
        WHEN 'المسيرة المهنية' THEN (ARRAY['بداية الطريق','مهارة الأسبوع','مقابلة ناجحة','خطأ مهني','مدير ورائد','العمل الجماعي','التواصل','التطوير','قرار صعب','رسالة للشباب'])[((v_k - 1) % 10) + 1]
        WHEN 'المال والاستثمار' THEN (ARRAY['مفهوم مالي','الادخار أولاً','قرار استثماري','السيولة','المخاطرة','السوق','الأرقام','القيمة','خطة مالية','درس من السوق'])[((v_k - 1) % 10) + 1]
        WHEN 'العلاقات والأسرة' THEN (ARRAY['الإنصات','حدود صحية','حوار هادئ','الاحترام','الاختلاف','الأسرة','الصداقة','الثقة','الاعتذار','مساحة للحب'])[((v_k - 1) % 10) + 1]
        WHEN 'الصحة النفسية' THEN (ARRAY['الهدوء','القلق','الضغط','التقبل','الراحة','التركيز','المشاعر','الحدود','التعافي','خطوة صغيرة'])[((v_k - 1) % 10) + 1]
        WHEN 'القيادة' THEN (ARRAY['القرار','المسؤولية','الفرقة','الرؤية','القدوة','التفويض','الاستماع','الصبر','التغيير','الإرث'])[((v_k - 1) % 10) + 1]
        WHEN 'التقنية' THEN (ARRAY['أداة جديدة','تطور سريع','الذكاء الاصطناعي','البيانات','الأمان','المستقبل','تجربة مستخدم','السرعة','الابتكار','خلاصة تقنية'])[((v_k - 1) % 10) + 1]
        ELSE (ARRAY['البداية','العمق','السؤال','التجربة','الدرس','الضيف','الرؤية','التطبيق','المستقبل','الخلاصة'])[((v_k - 1) % 10) + 1]
      END;

      INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count)
      VALUES (
        v_pod.id,
        v_pod.title || ' — ' || v_theme || ' (' || v_k || ')',
        'الحلقة رقم ' || v_k || ' من «' || v_pod.title || '»: ' || v_theme || '. حديث قصير وعملي يكمل سلسلة الحلقات.',
        v_audio,
        1320 + (v_k % 7) * 90,
        now() - (v_k * 4 || ' days')::interval,
        3800 + v_k * 920
      );
    END LOOP;
  END LOOP;
END $$;
