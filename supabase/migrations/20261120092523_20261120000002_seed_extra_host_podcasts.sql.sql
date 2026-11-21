/*
# Add second podcasts for top hosts

1. Seed Data
- Adds one extra podcast (with 3 episodes each) for six of the most-followed hosts,
  so podcast counts per host vary between 1 and 2 (within the 1-4 target)
  and host profile pages show richer stats.
- Matched by host slug (stable), idempotent via title existence check.
*/

DO $$
DECLARE
  v_audio text := 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
  v_podcast_id uuid;
BEGIN
  -- d. ماجد العتيبي (science)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'همسة كونية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'همسة كونية', 'حوارات قصيرة عن عظمة الكون ودقة الكواكب، بأسلوب سردي مشوّق.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast23/400/400', 'expert', 18300, 4.7
    FROM hosts h WHERE h.slug = 'majed-alotaibi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'ثقب أسود قريب منك', 'ماذا يحدث لو اقترب ثقب أسود؟', v_audio, 1320, now() - interval '9 days', 6400),
      (v_podcast_id, 'أصوات الكواكب', 'كيف تُحوَّل بيانات الكواكب إلى صوت.', v_audio, 1140, now() - interval '4 days', 4100),
      (v_podcast_id, 'أقدم ضوء', 'رحلة صورة في تحوّل عبر ملايين السنين.', v_audio, 1260, now() - interval '1 day', 2900);
  END IF;

  -- الشيخ عبدالله الحارثي (religious)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'نفحات الإيمان') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'نفحات الإيمان', 'مقالات صوتية قصيرة في الرقائق والتنزّه قبل الصلوات.', h.id, h.category_id, 'religious', 'https://picsum.photos/seed/podcast24/400/400', 'beginner', 25400, 4.9
    FROM hosts h WHERE h.slug = 'abdullah-alharthy' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'قلب سالِم', 'كيف نصل إلى السلامة الداخلية.', v_audio, 840, now() - interval '8 days', 8800),
      (v_podcast_id, 'أوراد الصباح', 'على أثر النور المبكر.', v_audio, 780, now() - interval '3 days', 6200),
      (v_podcast_id, 'خشوع في الصلاة', 'كيف نحضر القلب.', v_audio, 900, now() - interval '1 day', 5100);
  END IF;

  -- الكابتن خالد العنزي (health)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'اللياقة اليومية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'اللياقة اليومية', 'جلسات إرشادية قصيرة للحركة اليومية وتمارين منزلية.', h.id, h.category_id, 'motivational', 'https://picsum.photos/seed/podcast25/400/400', 'beginner', 22100, 4.5
    FROM hosts h WHERE h.slug = 'khalid-alenezi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'إطالاوات الصباح', 'روتين إطالة خمس دقائق.', v_audio, 660, now() - interval '6 days', 7300),
      (v_podcast_id, 'المشي 8000 خطوة', 'لماذا المشي أذكى رياضة؟', v_audio, 1020, now() - interval '2 days', 5400),
      (v_podcast_id, 'الماء والحركة', 'قاعدة الجفاف الخفي.', v_audio, 720, now() - interval '1 day', 3900);
  END IF;

  -- د. فهد السبيعي (mental)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'بروح هادئة') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'بروح هادئة', 'حوارات طويلة مع ضيوف حول الصحة النفسية في العالم العربي.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast26/400/400', 'expert', 16700, 4.8
    FROM hosts h WHERE h.slug = 'fahad-alsubaie' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'القلق الاجتماعي', 'كيف نتعامل مع الخوف من الناس.', v_audio, 2400, now() - interval '11 days', 5200),
      (v_podcast_id, 'الوسواس القهري', 'فهم الأفكار القهرية.', v_audio, 2280, now() - interval '5 days', 4600),
      (v_podcast_id, 'الحرمان النفسي', 'ماذا نفعل بما لم يُشبع في الطفولة؟', v_audio, 2640, now() - interval '1 day', 3800);
  END IF;

  -- أ. عادل المطيري (finance)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'قرارات مالية') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'قرارات مالية', 'دراسات حالة لقرارات مالية حقيقية وما يمكن أن نتعلمه منها.', h.id, h.category_id, 'professional', 'https://picsum.photos/seed/podcast27/400/400', 'intermediate', 14300, 4.4
    FROM hosts h WHERE h.slug = 'adel-almutairi' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'شراء أول عقار', 'دراسة حالة: إيجار أم تمويل؟', v_audio, 1800, now() - interval '7 days', 4400),
      (v_podcast_id, 'مشروع جانبي', 'متى يتحول الهواية إلى دخل؟', v_audio, 1560, now() - interval '3 days', 3600),
      (v_podcast_id, 'صندوق الطوارئ', 'كم يجب أن يكفي؟', v_audio, 1320, now() - interval '1 day', 2800);
  END IF;

  -- م. وليد القحطاني (tech)
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE title = 'كود وقهوة') THEN
    INSERT INTO podcasts (title, description, host_id, category_id, type, cover_url, audience_level, plays_count, rating_avg)
    SELECT 'كود وقهوة', 'حوارات مع مبرمجين عن المسار التقني وأدوات المستقبل.', h.id, h.category_id, 'scientific', 'https://picsum.photos/seed/podcast28/400/400', 'intermediate', 12900, 4.6
    FROM hosts h WHERE h.slug = 'walid-alqahtani' RETURNING id INTO v_podcast_id;
    INSERT INTO episodes (podcast_id, title, description, audio_url, duration_seconds, published_at, plays_count) VALUES
      (v_podcast_id, 'أول وظيفة برمجية', 'كيف تقتنع شركة بفكرتك؟', v_audio, 1920, now() - interval '10 days', 3100),
      (v_podcast_id, 'مساعدات الذكاء الاصطناعي', 'هل تحل محل المبرمج؟', v_audio, 1740, now() - interval '4 days', 4200),
      (v_podcast_id, 'أدوات 2026', 'ما يستحق التعلم هذا العام.', v_audio, 1560, now() - interval '1 day', 2400);
  END IF;
END $$;
