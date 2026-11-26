import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Award,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Download,
  Mic,
  Minus,
  Plus,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, Button, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { lifeWheelAreas, type LifeWheelAssessment } from '@/types/features';

type Recommendation = {
  type: 'podcast' | 'mission';
  title: string;
  link: string;
  area: string;
  tip: string;
};

const areaEmoji: Record<string, string> = {
  spiritual: '🕌',
  health: '💪',
  career: '💼',
  finance: '💰',
  relationships: '🤝',
  mental: '🧠',
  growth: '📚',
  fun: '🎈',
};

const areaTips: Record<string, string> = {
  spiritual: 'خصّص وقتاً قصيراً ثابتاً كل يوم لقراءة أو تأمل.',
  health: 'ابدأ بخطوة صغيرة قابلة للتكرار: مشي ١٠ دقائق بعد وجبة.',
  career: 'حدّد مهارة واحدة تريد تطويرها هذا الأسبوع وتعلّمها.',
  finance: 'اكتب مصروفاتك ليومين فقط، ثم اختر بنداً واحداً لتقليصه.',
  relationships: 'أرسل رسالة شكر لشخص لا تتواصل معه كثيراً.',
  mental: 'جرّب تمرين تنفّس دقيقتين قبل النوم.',
  growth: 'اقرأ عشر صفحات أو استمع حلقة قصيرة في موضوع جديد.',
  fun: 'خصّص وقتاً بلا شاشة لشيء تحبه فعلاً.',
};

function scoreOf(assessment: LifeWheelAssessment, key: string): number {
  return Number((assessment as unknown as Record<string, number | null>)[key] || 0);
}

function assessmentAverage(assessment: LifeWheelAssessment): number {
  const total = lifeWheelAreas.reduce((sum, area) => sum + scoreOf(assessment, area.key), 0);
  return Math.round((total / lifeWheelAreas.length) * 10);
}

function scoreLabel(score: number): string {
  if (score >= 8) return 'ممتاز';
  if (score >= 6) return 'جيد';
  if (score >= 4) return 'متوسط';
  return 'يحتاج عمل';
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function interestToCatName(key: string): string | null {
  const map: Record<string, string> = {
    spiritual: 'روحاني / ديني',
    health: 'الصحة واللياقة',
    career: 'المسيرة المهنية',
    finance: 'المال والاستثمار',
    relationships: 'العلاقات والأسرة',
    mental: 'الصحة النفسية',
    leadership: 'القيادة',
    culture: 'ثقافة وأدب',
  };
  return map[key] || null;
}

export default function LifeWheelPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<LifeWheelAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>(
    () => Object.fromEntries(lifeWheelAreas.map((area) => [area.key, 5])),
  );
  const [notes, setNotes] = useState('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadAssessments = useCallback(async () => {
    if (!user) {
      setAssessments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: loadError } = await supabase
      .from('life_wheel_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (loadError) setError('تعذّر تحميل تقييماتك. حاول التحديث.');
    const sorted = ((data as LifeWheelAssessment[]) || []).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setAssessments(sorted);
    if (sorted.length > 0) await generateRecommendations(sorted[0]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const generateRecommendations = async (assessment: LifeWheelAssessment) => {
    const weakest = lifeWheelAreas
      .map((area) => ({ ...area, score: scoreOf(assessment, area.key) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const names = Array.from(
      new Set(weakest.map((area) => interestToCatName(area.interestKey)).filter((name): name is string => Boolean(name))),
    );
    if (!names.length) {
      setRecommendations([]);
      return;
    }

    const { data: categories } = await supabase.from('categories').select('id,name_ar').in('name_ar', names);
    // Some catalogues contain duplicate category names with different IDs.
    // Keep every matching ID so recommendations don't disappear because the
    // content happens to use the other copy.
    const idsByName = new Map<string, string[]>();
    (categories || []).forEach((category) => {
      const name = category.name_ar as string;
      const list = idsByName.get(name) || [];
      if (!list.includes(category.id as string)) list.push(category.id as string);
      idsByName.set(name, list);
    });
    const categoryIds = Array.from(new Set(Array.from(idsByName.values()).flat()));
    if (!categoryIds.length) {
      setRecommendations([]);
      return;
    }

    const [podcastResult, missionResult] = await Promise.all([
      supabase.from('podcasts').select('id,title,category_id').in('category_id', categoryIds).limit(100),
      supabase.from('missions').select('id,title,category_id').in('category_id', categoryIds).limit(100),
    ]);

    const recs: Recommendation[] = [];
    weakest.forEach((area) => {
      const idsForArea = idsByName.get(interestToCatName(area.interestKey) || '') || [];
      if (!idsForArea.length) return;
      const podcast = (podcastResult.data || []).find((item) => idsForArea.includes(item.category_id as string));
      const mission = (missionResult.data || []).find((item) => idsForArea.includes(item.category_id as string));
      const tip = areaTips[area.key] || 'اختر خطوة صغيرة وابدأ بها اليوم.';
      if (podcast) {
        recs.push({
          type: 'podcast',
          title: podcast.title as string,
          link: `/podcasts/${podcast.id}`,
          area: area.label,
          tip,
        });
      }
      if (mission) {
        recs.push({
          type: 'mission',
          title: mission.title as string,
          link: '/missions',
          area: area.label,
          tip,
        });
      }
    });
    setRecommendations(recs);
  };

  const saveAssessment = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    const { data, error: saveError } = await supabase
      .from('life_wheel_assessments')
      .insert({
        user_id: user.id,
        ...ratings,
        notes: notes.trim(),
      })
      .select('*')
      .maybeSingle();
    if (saveError || !data) {
      setError('تعذّر حفظ التقييم. حاول مرة أخرى.');
      setSaving(false);
      return;
    }
    const saved = data as LifeWheelAssessment;
    setAssessments((current) => [saved, ...current]);
    await generateRecommendations(saved);
    setShowForm(false);
    setNotes('');
    setRatings(Object.fromEntries(lifeWheelAreas.map((area) => [area.key, 5])));
    setSaving(false);
    setToast('تم حفظ تقييمك بنجاح');
  };

  const deleteAssessment = async (id: string) => {
    setSaving(true);
    setError(null);
    const { error: deleteError } = await supabase
      .from('life_wheel_assessments')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id || '');
    if (deleteError) {
      setError('تعذّر حذف التقييم. حاول مرة أخرى.');
      setSaving(false);
      return;
    }
    const remaining = assessments.filter((item) => item.id !== id);
    setAssessments(remaining);
    setConfirmDeleteId(null);
    if (remaining[0]) await generateRecommendations(remaining[0]);
    else setRecommendations([]);
    setSaving(false);
    setToast('تم حذف التقييم');
  };

  const exportReport = () => {
    if (!latest) return;
    const lines = [
      '# تقرير عجلة الحياة — سدى',
      '',
      `التاريخ: ${shortDate(latest.created_at)}`,
      `متوسط التوازن: ${assessmentAverage(latest)}%`,
      '',
      ...lifeWheelAreas.map((area) => `- ${area.label}: ${scoreOf(latest, area.key)}/10`),
      '',
      ...(latest.notes ? [`## ملاحظات`, '', latest.notes] : []),
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'عجلة-الحياة-سدى.md';
    anchor.click();
    URL.revokeObjectURL(url);
    setToast('تم تصدير التقرير');
  };

  const latest = assessments[0];
  const previous = assessments[1];

  const overview = useMemo(() => {
    if (!latest) return null;
    const scores = lifeWheelAreas.map((area) => ({ ...area, score: scoreOf(latest, area.key) }));
    const strongest = [...scores].sort((a, b) => b.score - a.score)[0];
    const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
    const average = assessmentAverage(latest);
    const previousAverage = previous ? assessmentAverage(previous) : null;
    return {
      average,
      delta: previousAverage === null ? null : average - previousAverage,
      strongest,
      weakest,
      balance: Math.max(...scores.map((item) => item.score)) - Math.min(...scores.map((item) => item.score)),
    };
  }, [latest, previous]);

  const radarData = latest
    ? lifeWheelAreas.map((area) => ({
        area: area.label.length > 8 ? `${area.label.substring(0, 7)}…` : area.label,
        value: scoreOf(latest, area.key) * 10,
      }))
    : [];

  const trendData = [...assessments]
    .reverse()
    .map((assessment) => ({ date: shortDate(assessment.created_at), average: assessmentAverage(assessment) }));

  const formAverage = Math.round(
    (lifeWheelAreas.reduce((sum, area) => sum + (ratings[area.key] || 0), 0) / lifeWheelAreas.length) * 10,
  );

  if (loading) {
    return (
      <Layout title="عجلة الحياة">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="عجلة الحياة">
      <div className="space-y-6">
        <Card className="bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <CircleDot size={28} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">تقييم عجلة الحياة</h2>
                <p className="text-accent-100 text-sm mt-0.5">
                  قيّم ٨ مجالات حياتك من ١ إلى ١٠ واكتشف نقاط قوتك وضعفك
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {latest && (
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={<Download size={15} />}
                  onClick={exportReport}
                  className="border-0 bg-white/20 text-white hover:bg-white/30 dark:bg-white/20 dark:text-white dark:hover:bg-white/30"
                >
                  تصدير التقرير
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<Plus size={15} />}
                onClick={() => setShowForm(true)}
                className="border-0 bg-white text-accent-700 hover:bg-white/90 dark:bg-white dark:text-accent-800 dark:hover:bg-white/90"
              >
                تقييم جديد
              </Button>
            </div>
          </div>
        </Card>

        {toast && (
          <div className="flex items-center gap-2 rounded-xl bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 px-4 py-3 text-sm font-semibold text-primary-800 dark:text-primary-200">
            <CheckCircle2 size={18} />
            {toast}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-error-500/10 border border-error-500/30 px-4 py-3 text-sm font-semibold text-error-600 dark:text-error-400">
            {error}
          </div>
        )}

        {!showForm && latest && overview && (
          <>
            <Card>
              <CardHeader
                title="ملخص التوازن"
                subtitle={`آخر تقييم: ${shortDate(latest.created_at)}`}
                action={
                  overview.delta === null ? (
                    <Badge variant="neutral" size="sm">أول تقييم</Badge>
                  ) : (
                    <Badge
                      variant={overview.delta > 0 ? 'success' : overview.delta < 0 ? 'warning' : 'neutral'}
                      size="sm"
                    >
                      {overview.delta > 0 ? `+${overview.delta}` : overview.delta}
                      عن السابق
                    </Badge>
                  )
                }
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'متوسط التوازن', value: `${overview.average}%`, icon: TrendingUp },
                  {
                    label: 'أقوى مجال',
                    value: `${areaEmoji[overview.strongest.key] || '⭐'} ${overview.strongest.label}`,
                    icon: Award,
                  },
                  {
                    label: 'أضعف مجال',
                    value: `${areaEmoji[overview.weakest.key] || '🎯'} ${overview.weakest.label}`,
                    icon: Target,
                  },
                  { label: 'فجوة التوازن', value: `${overview.balance} درجات`, icon: CircleDot },
                ].map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 p-3"
                  >
                    <div className="flex items-center gap-2 text-neutral-400 mb-1.5">
                      <Icon size={15} />
                      <span className="text-[11px] font-semibold">{label}</span>
                    </div>
                    <p className="text-sm font-extrabold text-neutral-900 dark:text-white break-words">{value}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="خريطة المجالات الثمانية" subtitle="كل ضلع يمثل مجالاً من مجالات حياتك" />
              <ResponsiveContainer width="100%" height={320}>
                <RechartsRadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
                  <PolarAngleAxis
                    dataKey="area"
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-neutral-600 dark:text-neutral-400"
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: 'currentColor' }}
                    className="text-neutral-400"
                    tickCount={5}
                  />
                  <Radar name="التقييم" dataKey="value" stroke="#0F766E" fill="#0F766E" fillOpacity={0.3} strokeWidth={2} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '13px', color: '#fff' }}
                    labelStyle={{ color: '#94A3B8' }}
                    formatter={(value) => [`${Math.round(Number(value) / 10)}/10`, 'التقييم']}
                  />
                </RechartsRadarChart>
              </ResponsiveContainer>
              <div className="grid gap-2 sm:grid-cols-2 mt-4">
                {lifeWheelAreas.map((area) => {
                  const score = scoreOf(latest, area.key);
                  const percent = score * 10;
                  return (
                    <div key={area.key} className="flex items-center gap-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 p-3">
                      <span className="text-xl w-7 text-center">{areaEmoji[area.key] || '•'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-neutral-700 dark:text-neutral-200 truncate">{area.label}</span>
                          <span className="text-[11px] font-semibold text-neutral-400">{score}/10</span>
                        </div>
                        <ProgressBar
                          value={percent}
                          size="sm"
                          variant={score >= 8 ? 'success' : score >= 5 ? 'accent' : 'warning'}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader title="نقاط القوة" subtitle="ابني عليها واستمر" />
                <div className="space-y-2">
                  {[...lifeWheelAreas]
                    .map((area) => ({ ...area, score: scoreOf(latest, area.key) }))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 3)
                    .map((area) => (
                      <div key={area.key} className="flex items-center gap-3 rounded-xl bg-success-500/10 px-3 py-2.5">
                        <span className="text-xl">{areaEmoji[area.key] || '⭐'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">{area.label}</p>
                          <p className="text-[11px] text-neutral-500">{scoreLabel(area.score)}</p>
                        </div>
                        <Badge variant="success" size="sm">{area.score}/10</Badge>
                      </div>
                    ))}
                </div>
              </Card>
              <Card>
                <CardHeader title="ما يحتاج تطويراً" subtitle="ابدأ بمجال واحد هذا الأسبوع" />
                <div className="space-y-2">
                  {[...lifeWheelAreas]
                    .map((area) => ({ ...area, score: scoreOf(latest, area.key) }))
                    .sort((a, b) => a.score - b.score)
                    .slice(0, 3)
                    .map((area) => (
                      <div key={area.key} className="flex items-center gap-3 rounded-xl bg-warning-500/10 px-3 py-2.5">
                        <span className="text-xl">{areaEmoji[area.key] || '🎯'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">{area.label}</p>
                          <p className="text-[11px] text-neutral-500">{areaTips[area.key] || 'خطوة صغيرة كل يوم.'}</p>
                        </div>
                        <Badge variant="warning" size="sm">{area.score}/10</Badge>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            {assessments.length > 1 && (
              <Card>
                <CardHeader title="تطور التوازن" subtitle={`${assessments.length} تقييمات مسجّلة`} />
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsLineChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-neutral-200 dark:text-neutral-800" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-neutral-400" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-neutral-400" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '13px', color: '#fff' }}
                      formatter={(value) => [`${value}%`, 'متوسط التوازن']}
                    />
                    <Line type="monotone" dataKey="average" stroke="#0F766E" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {recommendations.length > 0 && (
              <Card>
                <CardHeader title="توصيات عملية" subtitle="محتوى حقيقي من سدى يساعد أضعف مجالاتك" />
                <div className="space-y-2">
                  {recommendations.map((rec, index) => (
                    <Link key={`${rec.link}-${index}`} to={rec.link}>
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            rec.type === 'podcast'
                              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                              : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600'
                          }`}
                        >
                          {rec.type === 'podcast' ? <Mic size={16} /> : <Target size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">{rec.area}</p>
                          <p className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 truncate">{rec.title}</p>
                          <p className="text-[11px] text-neutral-400 truncate">{rec.tip}</p>
                        </div>
                        <ArrowLeft size={16} className="text-neutral-400 flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {latest && (
              <Card>
                <CardHeader title="سجل التقييمات" subtitle="كل تقييم جديد يضيف نقطة للرسم البياني" />
                <div className="space-y-3">
                  {assessments.slice(0, 6).map((assessment, index) => {
                    const score = assessmentAverage(assessment);
                    const older = assessments[index + 1];
                    const delta = older ? score - assessmentAverage(older) : null;
                    return (
                      <div key={assessment.id} className="flex items-center gap-3">
                        <span className="text-xs text-neutral-400 w-24 flex items-center gap-1">
                          <CalendarDays size={12} />
                          {shortDate(assessment.created_at)}
                        </span>
                        <ProgressBar
                          value={score}
                          size="sm"
                          variant={score >= 70 ? 'success' : score >= 40 ? 'accent' : 'warning'}
                        />
                        <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 w-9 text-left">{score}%</span>
                        <span className="text-[11px] font-semibold text-neutral-400 w-12 flex items-center gap-0.5">
                          {delta === null ? (
                            <Minus size={12} />
                          ) : delta > 0 ? (
                            <><ArrowUpRight size={13} className="text-success-500" />{delta}</>
                          ) : delta < 0 ? (
                            <><ArrowDownRight size={13} className="text-warning-500" />{Math.abs(delta)}</>
                          ) : (
                            <Minus size={12} />
                          )}
                        </span>
                        {confirmDeleteId === assessment.id ? (
                          <span className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => deleteAssessment(assessment.id)}
                              disabled={saving}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-error-500/10 text-error-600 dark:text-error-400"
                            >
                              تأكيد
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[11px] font-bold px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                            >
                              إلغاء
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(assessment.id)}
                            aria-label="حذف التقييم"
                            className="text-neutral-400 hover:text-error-500 flex-shrink-0"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {latest.notes && (
              <Card>
                <CardHeader title="ملاحظاتك" subtitle="كتبتها مع آخر تقييم" />
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap break-words">
                  {latest.notes}
                </p>
              </Card>
            )}
          </>
        )}

        {showForm && (
          <Card>
            <CardHeader
              title="تقييم جديد"
              subtitle="حرّك المؤشر لكل مجال من ١ إلى ١٠ — المتوسط يتحدث مباشرة"
              action={
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} aria-label="إغلاق النموذج">
                  <Plus size={18} className="rotate-45" />
                </Button>
              }
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-primary-50 dark:bg-primary-900/20 px-4 py-3">
                <span className="text-sm font-semibold text-primary-800 dark:text-primary-200">متوسط التوازن الحالي</span>
                <span className="text-xl font-extrabold text-primary-700 dark:text-primary-300">{formAverage}%</span>
              </div>
              {lifeWheelAreas.map((area) => (
                <div key={area.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      <span className="ml-2">{areaEmoji[area.key] || '•'}</span>
                      {area.label}
                    </span>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{ratings[area.key]}/10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={ratings[area.key]}
                    onChange={(event) => setRatings((current) => ({ ...current, [area.key]: parseInt(event.target.value, 10) }))}
                    className="w-full accent-primary-600"
                    aria-label={`تقييم ${area.label}`}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="wheel-notes" className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                  ملاحظات
                </label>
                <textarea
                  id="wheel-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="ما الذي تشعر أنك تريد تغييره هذا الأسبوع؟"
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={saveAssessment} disabled={saving} leftIcon={<CheckCircle2 size={16} />}>
                  {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
                </Button>
                <Button variant="secondary" onClick={() => setShowForm(false)} disabled={saving}>
                  إلغاء
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRatings(Object.fromEntries(lifeWheelAreas.map((area) => [area.key, 5])));
                    setNotes('');
                  }}
                  leftIcon={<Sparkles size={15} />}
                >
                  إعادة الضبط
                </Button>
              </div>
            </div>
          </Card>
        )}

        {!latest && !showForm && (
          <Card>
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 mb-4">
                <CircleDot size={36} />
              </div>
              <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-300">ابدأ أول تقييم لك</h3>
              <p className="text-sm text-neutral-400 mt-1 mb-4 max-w-sm">
                قيّم مجالات حياتك الثمانية لتكتشف نقاط قوتك وما يحتاج تطويراً
              </p>
              <Button onClick={() => setShowForm(true)} leftIcon={<Plus size={16} />}>
                ابدأ التقييم
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
