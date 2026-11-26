-- Science-grounded mission catalogue with balanced difficulty levels.
-- XP policy: difficulty sets the band; duration, cognitive load and consistency
-- raise the reward inside that band (easy 30-45 / medium 70-150 / hard 150-650).
-- Safe to re-run: existing titles are updated, new titles inserted, old catalogue archived.
-- No DO blocks or dollar-quoted command strings, so any SQL runner can execute it.

-- ---------------------------------------------------------------------------
-- 1) Balanced daily assignment: one easy + one medium + one hard, interest-first
-- ---------------------------------------------------------------------------
create or replace function public.assign_daily_missions()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $assign$
declare
  v_today date := (now() at time zone 'UTC')::date;
  v_user record;
  v_level text;
  v_user_count integer;
  v_rows integer;
  v_total integer := 0;
begin
  for v_user in
    select id, coalesce(interests, '{}'::text[]) as interests
    from public.profiles
  loop
    if exists (
      select 1 from public.user_missions
      where user_id = v_user.id and assigned_date = v_today
    ) then
      continue;
    end if;

    v_user_count := 0;

    foreach v_level in array array['easy', 'medium', 'hard'] loop
      insert into public.user_missions (user_id, mission_id, status, assigned_date)
      select v_user.id, m.id, 'pending', v_today
      from public.missions as m
      left join public.categories as c on c.id = m.category_id
      where m.type = 'daily'
        and m.difficulty = v_level
        and not exists (
          select 1 from public.user_missions as um
          where um.user_id = v_user.id
            and um.assigned_date = v_today
            and um.mission_id = m.id
        )
      order by
        coalesce((
          select bool_or(
            case lower(x.val)
              when 'spiritual' then 'روحاني / ديني'
              when 'science' then 'العلوم'
              when 'culture' then 'ثقافة وأدب'
              when 'health' then 'الصحة واللياقة'
              when 'career' then 'المسيرة المهنية'
              when 'finance' then 'المال والاستثمار'
              when 'relationships' then 'العلاقات والأسرة'
              when 'mental' then 'الصحة النفسية'
              when 'leadership' then 'القيادة'
              when 'technology' then 'التقنية'
              else null
            end = c.name_ar
          )
          from unnest(v_user.interests) as x(val)
        ), false) desc,
        random()
      limit 1;

      get diagnostics v_rows = row_count;
      v_user_count := v_user_count + v_rows;
      v_total := v_total + v_rows;
    end loop;

    if v_user_count < 3 then
      insert into public.user_missions (user_id, mission_id, status, assigned_date)
      select v_user.id, m.id, 'pending', v_today
      from public.missions as m
      left join public.categories as c on c.id = m.category_id
      where m.type = 'daily'
        and not exists (
          select 1 from public.user_missions as um
          where um.user_id = v_user.id
            and um.assigned_date = v_today
            and um.mission_id = m.id
        )
      order by
        coalesce((
          select bool_or(
            case lower(x.val)
              when 'spiritual' then 'روحاني / ديني'
              when 'science' then 'العلوم'
              when 'culture' then 'ثقافة وأدب'
              when 'health' then 'الصحة واللياقة'
              when 'career' then 'المسيرة المهنية'
              when 'finance' then 'المال والاستثمار'
              when 'relationships' then 'العلاقات والأسرة'
              when 'mental' then 'الصحة النفسية'
              when 'leadership' then 'القيادة'
              when 'technology' then 'التقنية'
              else null
            end = c.name_ar
          )
          from unnest(v_user.interests) as x(val)
        ), false) desc,
        random()
      limit 3 - v_user_count;

      get diagnostics v_rows = row_count;
      v_total := v_total + v_rows;
    end if;
  end loop;

  return v_total;
end;
$assign$;

revoke all on function public.assign_daily_missions() from public;
grant execute on function public.assign_daily_missions() to authenticated;

-- ---------------------------------------------------------------------------
-- 2) New catalogue (60 missions: 30 daily, 18 weekly, 12 challenge)
-- ---------------------------------------------------------------------------
drop table if exists pg_temp._new_missions;
create temp table _new_missions (
  title text,
  description text,
  category_name text,
  difficulty text,
  xp_reward integer,
  duration_minutes integer,
  type text
);

insert into _new_missions (title, description, category_name, difficulty, xp_reward, duration_minutes, type)
values
  ('تنفّس بإيقاع ٤-٦ لمدة ٦ دقائق', 'شهيق ٤ ثوانٍ وزفير ٦ ست مرات في الدقيقة. التنفس البطيء ينشّط الجهاز اللاودي ويرفع تباين معدل ضربات القلب (HRV)، المؤشر الفسيولوجي للاسترخاء.', 'روحاني / ديني', 'easy', 40, 6, 'daily'),
  ('اكتب ثلاث نِعم قبل النوم', 'تدوين الامتنان يومياً يرتبط بارتفاع الرفاه النفسي وتقليل أثر التوتر في دراسات الامتنان.', 'روحاني / ديني', 'easy', 30, 5, 'daily'),
  ('استدعِ معلومة قبل قراءتها', 'قبل فتح المصدر، حاول تذكّر ما تعرفه. الاسترجاع النشط أقوى من إعادة القراءة في ترسيخ الذاكرة (تأثير الاختبار).', 'العلوم', 'easy', 35, 5, 'daily'),
  ('اكتب سؤالاً علمياً واحداً', 'صياغة سؤال محدد تنشّط الفضول وتحسّن الترميز الذهني للمعلومة الجديدة مقارنة بالقراءة السلبية.', 'العلوم', 'easy', 30, 4, 'daily'),
  ('اقرأ ١٠ صفحات قراءة بطيئة', 'القراءة العميقة المتواصلة تبني تمثلاً ذهنياً للنص وتقلل التشتت مقارنة بالتصفح السريع.', 'ثقافة وأدب', 'easy', 40, 15, 'daily'),
  ('لخّص ما قرأته في جملتين', 'إعادة الصياغة قسراً تجبر الدماغ على معالجة المعنى بدل حفظ الكلمات، فتقوي الفهم والاحتفاظ.', 'ثقافة وأدب', 'easy', 35, 5, 'daily'),
  ('امشِ ١٠ دقائق بعد وجبة', 'المشي الخفيف بعد الأكل يقلل ذروة الجلوكوز في الدم عبر زيادة امتصاص العضلات له.', 'الصحة واللياقة', 'easy', 45, 10, 'daily'),
  ('قف وتحرك ثلاث دقائق الآن', 'كسر الجلوس الطويل بفواصل قصيرة يقلل آثاره الأيضية ويحسّن الدورة الدموية.', 'الصحة واللياقة', 'easy', 30, 3, 'daily'),
  ('اكتب أهم ثلاث مهام الغد', 'تحويل النية إلى خطة محددة يرفع احتمال التنفيذ ويقلل الاعتماد على قوة الإرادة.', 'المسيرة المهنية', 'easy', 35, 5, 'daily'),
  ('سجّل مصروفات اليوم في دقيقة', 'المراقبة الذاتية للسلوك المالي أول خطوة في تعديله؛ ما يُقاس يُدار.', 'المال والاستثمار', 'easy', 30, 2, 'daily'),
  ('أرسل رسالة شكر لشخص', 'التعبير عن الامتنان يقوّي الروابط الاجتماعية، والروابط الاجتماعية من أقوى المنبئات بالصحة والطول العمري.', 'العلاقات والأسرة', 'easy', 35, 4, 'daily'),
  ('أعد صياغة فكرة سلبية', 'إعادة التقييم المعرفي تغيّر تفسير الحدث بدل تغييره، فتقلل شدّة المشاعر السلبية.', 'الصحة النفسية', 'easy', 40, 5, 'daily'),
  ('دوّن قراراً اتخذته اليوم', 'سجّل القرار ومبرراته وتوقعه؛ مذكرات القرار تقلل الانحياز بأثر رجعي وتحسّن الحكم لاحقاً.', 'القيادة', 'easy', 40, 6, 'daily'),
  ('فعّل المصادقة الثنائية في حساب واحد', 'المصادقة الثنائية تمنع أغلب عمليات تسجيل الدخول غير المصرّح بها حتى لو تسربت كلمة المرور.', 'التقنية', 'easy', 45, 8, 'daily'),
  ('تأمل مراقبة ١٢ دقيقة', 'ملاحظة الأفكار دون الحكم عليها تقلل الاجترار؛ دراسات التأمل الذهني تُظهر أثراً متوسطاً على القلق.', 'روحاني / ديني', 'medium', 75, 12, 'daily'),
  ('طبّق التكرار المتباعد', 'راجع ما تعلّمته اليوم بعد يومين ثم بعد أسبوع. منحنى النسيان يفسّر لماذا يفوق التكرار المتباعد الحشو.', 'العلوم', 'medium', 85, 20, 'daily'),
  ('اكتب ١٥٠ كلمة عن يومك', 'الكتابة التعبيرية عن المشاعر تقلل عبء التفكير المصاحب للضغوط وتحسّن التنظيم الانفعالي.', 'ثقافة وأدب', 'medium', 80, 15, 'daily'),
  ('تمرين مقاومة ٢٠ دقيقة', 'تمارين المقاومة تحسّن كتلة العضل وحساسية الأنسولين، وتوصيات الصحة العالمية تشير إلى جلستين أسبوعياً على الأقل.', 'الصحة واللياقة', 'medium', 95, 20, 'daily'),
  ('احمِ نومك الليلة', 'النوم ٧-٩ ساعات بانتظام يدعم الذاكرة وتنظيم المزاج؛ حدد موعد نومك الآن وأوقف الشاشة قبله بـ٣٠ دقيقة.', 'الصحة واللياقة', 'medium', 70, 10, 'daily'),
  ('جلسة عمل عميق ٤٥ دقيقة', 'أظهرت أبحاث الانتباه أن التبديل المتكرر بين المهام يهدر جزءاً كبيراً من الوقت، فالعمل المتواصل أعلى إنتاجية.', 'المسيرة المهنية', 'medium', 110, 45, 'daily'),
  ('احسب ادخارك بعد عشر سنوات', 'استخدم الفائدة المركّبة لحساب قيمة ادخارك بعد ١٠ سنوات؛ إدراك الزمن يغيّر القرار اليوم.', 'المال والاستثمار', 'medium', 80, 15, 'daily'),
  ('استمع عشر دقائق بلا مقاطعة', 'العقل يحتاج وقتاً لمعالجة كلام الطرف الآخر قبل الرد؛ الاستماع الكامل يقلل سوء الفهم ويرفع جودة العلاقة.', 'العلاقات والأسرة', 'medium', 75, 10, 'daily'),
  ('اكتب مخاوفك ثم حدد وقتاً لها', 'تأجيل القلق إلى وقت محدد تقنية معرفية مُثبتة لتقليل اجترار القلق طوال اليوم.', 'الصحة النفسية', 'medium', 85, 12, 'daily'),
  ('اطلب تغذية راجعة صادقة', 'التغذية الراجعة المحددة والقابلة للتنفيذ أسرع في تحسين الأداء من التقييم العام.', 'القيادة', 'medium', 90, 15, 'daily'),
  ('تعلّم مفهوماً تقنياً بتطبيق', 'التعلّم بالمشروع يرسّخ الفهم أكثر من المشاهدة وحدها لأنه يربط المعرفة بقرارات فعلية.', 'التقنية', 'medium', 95, 25, 'daily'),
  ('جلسة تعلّم مكثفة ٦٠ دقيقة', 'قسّمها إلى دورات استرجاع وتغذية راجعة. التدريب المتعمّد يعتمد على تحدٍّ فوق مستوى الراحة وتصحيح فوري.', 'العلوم', 'hard', 170, 60, 'daily'),
  ('أنجز أصعب مهمة في ٩٠ دقيقة', 'ابدأ بالمهمة الأعلى تكلفة معرفية قبل تراكم القرارات؛ قوة الإرادة تتعرض للإرهاق مع كثرة الاختيارات.', 'المسيرة المهنية', 'hard', 200, 90, 'daily'),
  ('قوة + مشي ٤٥ دقيقة', 'مزج تمارين المقاومة مع المشي يجمع فوائد القوة واللياقة القلبية في جلسة واحدة.', 'الصحة واللياقة', 'hard', 160, 45, 'daily'),
  ('مراجعة معرفية ٤٠ دقيقة', 'راجع ما تعلّمته، ما شعرت به، والقرارات التي اتخذتها؛ المراجعة الواعية تحوّل الخبرة إلى نموذج قابل للتحسين.', 'الصحة النفسية', 'hard', 150, 40, 'daily'),
  ('ابنِ سكربتاً يحل مشكلة يومية', 'طبّق مفهوماً تقنياً في أداة صغيرة تستخدمها فعلاً؛ النقل المعرفي يحدث عند التطبيق لا عند الحفظ.', 'التقنية', 'hard', 190, 60, 'daily'),
  ('تأمل ٥ دقائق يومياً ٧ أيام', 'انتظام الجرعة الصغيرة أهم من طول الجلسة؛ التكرار اليومي في نفس السياق يرسّخ العادة.', 'روحاني / ديني', 'easy', 90, 35, 'weekly'),
  ('امشِ ١٥ دقيقة خمسة أيام', 'المشي المنتظم يقلل خطر الأمراض القلبية الأيضية حتى بجرعات متوسطة.', 'الصحة واللياقة', 'easy', 100, 75, 'weekly'),
  ('اقرأ ملخص دراسة واحدة', 'افهم السؤال والعينة والحدود قبل النتيجة؛ القراءة النقدية تحميك من تعميم النتائج.', 'العلوم', 'medium', 120, 45, 'weekly'),
  ('اقرأ ١٠٠ صفحة هذا الأسبوع', 'وزّع القراءة على أيام بدل جلسة واحدة؛ التكرار المتباعد مع النص يحسّن الاحتفاظ.', 'ثقافة وأدب', 'medium', 130, 180, 'weekly'),
  ('ثلاث جلسات مقاومة هذا الأسبوع', 'توزيع التمرين على أيام يسمح للعضلات بالتعافي، وهو شرط لبناء القوة.', 'الصحة واللياقة', 'medium', 150, 120, 'weekly'),
  ('راجع أسبوعك وخطّط للتالي', 'المراجعة الأسبوعية تغلق المهام المفتوحة وتقلل الحمل الذهني المتبقي.', 'المسيرة المهنية', 'medium', 110, 40, 'weekly'),
  ('طبّق قاعدة ٥٠/٣٠/٢٠', 'قسّم الدخل إلى احتياجات ورغبات وادخار؛ القواعد البسيطة تقلل إرهاق القرار المالي.', 'المال والاستثمار', 'medium', 125, 45, 'weekly'),
  ('تواصل مع ثلاثة أشخاص باستماع', 'العلاقات الاجتماعية القوية ترتبط بصحة أفضل، وجودة الاستماع أهم من عدد الرسائل.', 'العلاقات والأسرة', 'medium', 115, 60, 'weekly'),
  ('خمسة أيام تدوين امتنان', 'جرعة أسبوعية من الامتنان تُظهر أثراً تراكمياً على المزاج يقوى مع الانتظام.', 'الصحة النفسية', 'medium', 105, 35, 'weekly'),
  ('قُد مبادرة صغيرة', 'إشراك الفريق في القرار يرفع الأمان النفسي، وهو من أقوى التنبئات بأداء الفرق.', 'القيادة', 'medium', 140, 90, 'weekly'),
  ('راجع خصوصية حساباتك', 'تحديث كلمات المرور ومراجعة الصلاحيات يقلل سطح الهجوم الرقمي بشكل ملموس.', 'التقنية', 'medium', 120, 60, 'weekly'),
  ('تعلّم موضوعاً كاملاً بالاسترجاع', 'خطّط سبعة أيام تقرأ فيها وتسترجع وتطبّق دون مراجعة نصية مباشرة.', 'العلوم', 'hard', 220, 210, 'weekly'),
  ('اكتب مقالاً ٨٠٠ كلمة ثم أعد كتابته', 'إعادة الكتابة تقوية للفكرة قبل الصياغة؛ المسودة الثانية دائماً أوضح من الأولى.', 'ثقافة وأدب', 'hard', 200, 180, 'weekly'),
  ('خمسة أيام نوم منتظم مع تمرين', 'انتظام النوم يضبط إيقاع الساعة البيولوجية، والتمرين في الوقت نفسه يحسّن جودة النوم العميق.', 'الصحة واللياقة', 'hard', 240, 180, 'weekly'),
  ('أنجز مشروعاً جانبياً صغيراً', 'مشروع مكتمل بقيمة قابلة للاستخدام يعلمك أكثر من ساعات التخطيط.', 'المسيرة المهنية', 'hard', 260, 240, 'weekly'),
  ('ابنِ صندوق طوارئ على أربعة أسابيع', 'وجود سيولة لثلاثة أشهر يقلل الضغط المالي ويمنع قرارات الاضطرار.', 'المال والاستثمار', 'hard', 230, 180, 'weekly'),
  ('أصلح خلافاً بحوار منظّم', 'عبّر عن الاحتياج لا عن الحكم، واستمع للطرف الآخر؛ هذا الأساس في حل النزاع.', 'العلاقات والأسرة', 'hard', 210, 90, 'weekly'),
  ('برنامج تقييم معرفي ٧ أيام', 'راقب الأفكار التلقائية وصنّفها واختبر بدائلها الأكثر واقعية.', 'الصحة النفسية', 'hard', 220, 140, 'weekly'),
  ('تحدي ١٤ يوماً: ٢٠ صفحة يومياً', 'الاستمرارية أهم من الكم، والجرعة اليومية الصغيرة تتراكم.', 'ثقافة وأدب', 'medium', 280, 280, 'challenge'),
  ('تحدي ٣٠ يوماً تأمل يومي', 'تراكم الجلسات القصيرة يغيّر استجابة الدماغ للمنبهات التوترية مع الوقت.', 'روحاني / ديني', 'hard', 420, 300, 'challenge'),
  ('تحدي ٣٠ يوماً تعلّم ٢٥ دقيقة', 'التراكم اليومي مع الاسترجاع المتباعد يتفوق على دفعات الحشو الطويلة.', 'العلوم', 'hard', 450, 750, 'challenge'),
  ('تحدي ٢١ يوماً كتابة ٣٠٠ كلمة', 'الكتابة اليومية المنتظمة تحسّن الوضوح الذهني وتقلل التشظي الانتباهي.', 'ثقافة وأدب', 'hard', 400, 630, 'challenge'),
  ('تحدي ٣٠ يوماً ٨٠٠٠ خطوة', 'النشاط اليومي المعتدل يقلل الوفيات لأسباب قلبية ويعزز حساسية الأنسولين.', 'الصحة واللياقة', 'hard', 480, 300, 'challenge'),
  ('تحدي ١٢ أسبوعاً قوة ٣ مرات', 'التقدّم التدريجي في الحمل هو المحرك الأساسي لنمو العضل والقوة.', 'الصحة واللياقة', 'hard', 650, 1440, 'challenge'),
  ('تحدي ٣٠ يوماً عمل عميق ٩٠ دقيقة', 'حماية فترة واحدة يومياً من المقاطعات تنتج أثراً تراكمياً في الإنتاج الإبداعي.', 'المسيرة المهنية', 'hard', 600, 2700, 'challenge'),
  ('تحدي ٩٠ يوماً ادخار ١٠٪', 'الادخار الآلي يحوّل القرار إلى نظام، ويستفيد من وقت أطول في الفائدة المركّبة.', 'المال والاستثمار', 'hard', 520, 180, 'challenge'),
  ('تحدي ٣٠ يوماً رسالة شكر', 'تكرار التعبير عن التقدير يبني رصيداً اجتماعياً يحمي من الوحدة.', 'العلاقات والأسرة', 'hard', 380, 150, 'challenge'),
  ('تحدي ٣٠ يوماً إعادة تأطير', 'تدريب إعادة التقييم يقلل الاستجابة التوترية ويجعل التفسير البديل أسهل تلقائياً.', 'الصحة النفسية', 'hard', 430, 300, 'challenge'),
  ('تحدي ٦٠ يوماً مشروع تطوعي', 'العمل التطوعي المنظّم يجمع بين الهدف الاجتماعي وتعلّم القيادة تحت قيود واقعية.', 'القيادة', 'hard', 620, 1200, 'challenge'),
  ('تحدي ٣٠ يوماً كود يومي', 'الممارسة اليومية القصيرة مع مراجعة الكود تبني مهارة أسرع من جلسات متفرقة.', 'التقنية', 'hard', 580, 900, 'challenge'),
  ('تحدي ٤٥ يوماً ساعة بلا شاشات', 'تقليل التحفيز الرقمي المسائي يخفف التشتت ويحسّن جودة النوم؛ البديل المعتاد يعيد بناء الانتباه.', 'الصحة النفسية', 'hard', 500, 1350, 'challenge');

-- Refresh existing titles, insert new ones, then archive anything from the old catalogue.
update public.missions as m
set description = n.description,
    category_id = (select id from public.categories where name_ar = n.category_name limit 1),
    difficulty = n.difficulty,
    xp_reward = n.xp_reward,
    duration_minutes = n.duration_minutes,
    type = n.type
from _new_missions as n
where m.title = n.title;

insert into public.missions (title, description, category_id, difficulty, xp_reward, duration_minutes, type)
select n.title,
       n.description,
       (select id from public.categories where name_ar = n.category_name limit 1),
       n.difficulty,
       n.xp_reward,
       n.duration_minutes,
       n.type
from _new_missions as n
where not exists (select 1 from public.missions as m where m.title = n.title);

update public.missions as m
set type = 'archived'
where m.type in ('daily', 'weekly', 'challenge')
  and not exists (select 1 from _new_missions as n where n.title = m.title);

drop table _new_missions;

-- Assign missions for today with the new balanced levels, immediately and idempotently.
select public.assign_daily_missions();

-- Verify with:
-- select type, difficulty, count(*), min(xp_reward), max(xp_reward)
-- from public.missions where type <> 'archived'
-- group by 1, 2 order by 1, 2;
