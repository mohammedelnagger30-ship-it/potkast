import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, Button, ProgressBar } from '@/components/ui';
import { RadarChart as RechartsRadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { CircleDot, Plus, TrendingUp, Mic, Target, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { lifeWheelAreas, type LifeWheelAssessment } from '@/types/features';

export default function LifeWheelPage() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<LifeWheelAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>(
    Object.fromEntries(lifeWheelAreas.map((a) => [a.key, 5]))
  );
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<{ type: string; title: string; link: string }[]>([]);

  const loadAssessments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('life_wheel_assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    const sorted = (data as LifeWheelAssessment[]) || [];
    setAssessments(sorted);
    if (sorted.length > 0) {
      generateRecommendations(sorted[0]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const generateRecommendations = async (assessment: LifeWheelAssessment) => {
    const sorted = lifeWheelAreas
      .map((a) => ({ ...a, score: (assessment as any)[a.key] as number }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    const recs: { type: string; title: string; link: string }[] = [];
    for (const area of sorted) {
      const catName = interestToCatName(area.interestKey);
      if (!catName) continue;
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('name_ar', catName)
        .maybeSingle();
      if (!cat) continue;

      const { data: podcasts } = await supabase
        .from('podcasts')
        .select('id, title')
        .eq('category_id', cat.id)
        .limit(1);
      if (podcasts && podcasts.length > 0) {
        recs.push({ type: 'podcast', title: podcasts[0].title, link: `/podcasts/${podcasts[0].id}` });
      }

      const { data: missions } = await supabase
        .from('missions')
        .select('id, title')
        .eq('category_id', cat.id)
        .limit(1);
      if (missions && missions.length > 0) {
        recs.push({ type: 'mission', title: missions[0].title, link: `/missions` });
      }
    }
    setRecommendations(recs);
  };

  const saveAssessment = async () => {
    if (!user) return;
    setSaving(true);
    const { data } = await supabase
      .from('life_wheel_assessments')
      .insert({
        user_id: user.id,
        ...ratings,
        notes: notes.trim(),
      })
      .select('*')
      .maybeSingle();
    if (data) {
      setAssessments([data as LifeWheelAssessment, ...assessments]);
      generateRecommendations(data as LifeWheelAssessment);
    }
    setShowForm(false);
    setNotes('');
    setRatings(Object.fromEntries(lifeWheelAreas.map((a) => [a.key, 5])));
    setSaving(false);
  };

  const latest = assessments[0];
  const radarData = latest
    ? lifeWheelAreas.map((a) => ({
        area: a.label.length > 8 ? a.label.substring(0, 7) + '…' : a.label,
        value: (latest as any)[a.key] as number * 10,
      }))
    : [];

  const avgScore = latest
    ? Math.round(lifeWheelAreas.reduce((sum, a) => sum + ((latest as any)[a.key] as number), 0) / lifeWheelAreas.length * 10)
    : 0;

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
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-accent-500 to-accent-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <CircleDot size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">تقييم عجلة الحياة</h2>
              <p className="text-accent-100 text-sm mt-0.5">
                قيّم 8 مجالات حياتك من 1 إلى 10 واكتشف نقاط قوتك وضعفك
              </p>
            </div>
          </div>
        </Card>
      </div>

      {latest && !showForm && (
        <>
          <Card className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <CardHeader title="آخر تقييم" subtitle={`متوسط التوازن: ${avgScore}%`} />
              <Button size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => setShowForm(true)}>
                تقييم جديد
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={320}>
              <RechartsRadarChart data={radarData} outerRadius="70%">
                <PolarGrid stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" />
                <PolarAngleAxis
                  dataKey="area"
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  className="text-neutral-600 dark:text-neutral-400"
                />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'currentColor' }} className="text-neutral-400" tickCount={5} />
                <Radar name="التقييم" dataKey="value" stroke="#0F766E" fill="#0F766E" fillOpacity={0.3} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '13px', color: '#fff' }}
                  labelStyle={{ color: '#94A3B8' }}
                  formatter={(v) => [`${Math.round((v as number) / 10)}/10`, 'التقييم']}
                />
              </RechartsRadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="توصيات لنقاط الضعف" subtitle="محتوى مقترح لتقوية أضعف مجالاتك" />
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <Link key={i} to={rec.link}>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        rec.type === 'podcast' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600' : 'bg-accent-100 dark:bg-accent-900/30 text-accent-600'
                      }`}>
                        {rec.type === 'podcast' ? <Mic size={16} /> : <Target size={16} />}
                      </div>
                      <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300 flex-1">{rec.title}</span>
                      <ArrowLeft size={16} className="text-neutral-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* History */}
          {assessments.length > 1 && (
            <Card className="mb-6">
              <CardHeader title="سجل التقييمات" subtitle={`${assessments.length} تقييمات سابقة`} />
              <div className="space-y-3">
                {assessments.slice(1, 5).map((a) => {
                  const score = Math.round(lifeWheelAreas.reduce((sum, area) => sum + ((a as any)[area.key] as number), 0) / lifeWheelAreas.length * 10);
                  return (
                    <div key={a.id} className="flex items-center gap-3">
                      <span className="text-xs text-neutral-400 w-24">
                        {new Date(a.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </span>
                      <ProgressBar value={score} size="sm" variant={score > 70 ? 'success' : score > 40 ? 'accent' : 'warning'} />
                      <span className="text-xs font-bold text-neutral-600 dark:text-neutral-400 w-10 text-left">{score}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}

      {showForm && (
        <Card className="mb-6">
          <CardHeader title="تقييم جديد" subtitle="قيّم كل مجال من 1 إلى 10" />
          <div className="space-y-4">
            {lifeWheelAreas.map((area) => (
              <div key={area.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{area.label}</span>
                  <span className="text-sm font-bold text-primary-600 dark:text-primary-400">{ratings[area.key]}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={ratings[area.key]}
                  onChange={(e) => setRatings({ ...ratings, [area.key]: parseInt(e.target.value, 10) })}
                  className="w-full accent-primary-600"
                />
              </div>
            ))}
            <div>
              <label className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 block">
                ملاحظات (اختياري)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="أي ملاحظات حول تقييمك..."
                className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveAssessment}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-all disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التقييم'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold text-sm"
              >
                إلغاء
              </button>
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
    </Layout>
  );
}

function interestToCatName(key: string): string | null {
  const map: Record<string, string> = {
    spiritual: 'روحاني / ديني',
    science: 'العلوم',
    culture: 'ثقافة وأدب',
    health: 'الصحة واللياقة',
    career: 'المسيرة المهنية',
    finance: 'المال والاستثمار',
    relationships: 'العلاقات والأسرة',
    mental: 'الصحة النفسية',
    leadership: 'القيادة',
    technology: 'التقنية',
  };
  return map[key] || null;
}
