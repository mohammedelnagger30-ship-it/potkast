import { useEffect, useMemo, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, Badge, ProgressBar, Button } from '@/components/ui';
import {
  Route, CheckCircle2, Circle, Play, ArrowLeft, Mic, Target, Lightbulb,
  PenLine, Lock, BookOpen, Clock, Sparkles, Filter, AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { pathDifficultyLabels, type LearningPath, type LearningPathStep, type UserPathEnrollment } from '@/types/features';

type StepType = 'podcast' | 'mission' | 'tip' | 'reflection';

const stepTypeIcon: Record<string, typeof Mic> = {
  podcast: Mic,
  mission: Target,
  tip: Lightbulb,
  reflection: PenLine,
};

const stepTypeLabel: Record<string, string> = {
  podcast: 'استمع',
  mission: 'طبّق',
  tip: 'نصيحة',
  reflection: 'تأمل',
};

const difficultyStyles: Record<string, string> = {
  beginner: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  advanced: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

interface LinkedEpisode {
  id: string;
  title: string;
  podcast_id: string;
  podcast?: { id: string; title: string; cover_url?: string; host_name?: string } | null;
}

interface PathWithProgress {
  path: LearningPath;
  steps: LearningPathStep[];
  enrolled: boolean;
  completedStepIds: Set<string>;
  enrollment: UserPathEnrollment | null;
  categoryName?: string;
}

function getErrorMessage(err: unknown) {
  if (!err) return 'حدث خطأ غير متوقع';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err) {
    const msg = (err as any).message;
    if (typeof msg === 'string') return msg;
  }
  return 'تعذر تحميل مسارات التعلّم';
}

export default function LearningPathsPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<PathWithProgress[]>([]);
  const [episodesById, setEpisodesById] = useState<Record<string, LinkedEpisode>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [actionPathId, setActionPathId] = useState<string | null>(null);

  const loadPaths = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [pathsRes, stepsRes, enrollRes, progressRes, catsRes] = await Promise.all([
        supabase.from('learning_paths').select('*').order('created_at', { ascending: true }),
        supabase.from('learning_path_steps').select('*').order('step_order', { ascending: true }),
        supabase.from('user_path_enrollments').select('*').eq('user_id', user.id),
        supabase.from('user_path_step_progress').select('step_id').eq('user_id', user.id),
        supabase.from('categories').select('id,name_ar'),
      ]);

      const firstError = pathsRes.error || stepsRes.error;
      if (firstError) throw firstError;
      // enroll/progress may fail due RLS edge cases; don't block page content
      const enrollments = enrollRes.error ? [] : (enrollRes.data || []);
      const stepProgress = progressRes.error ? [] : (progressRes.data || []);

      const allPaths = (pathsRes.data || []) as LearningPath[];
      const allSteps = (stepsRes.data || []) as LearningPathStep[];
      const categories = (catsRes.data || []) as Array<{ id: string; name_ar: string }>;
      const catMap = new Map(categories.map((c) => [c.id, c.name_ar]));

      const episodeIds = Array.from(new Set(allSteps.map((s) => s.linked_episode_id).filter(Boolean))) as string[];
      let episodeMap: Record<string, LinkedEpisode> = {};
      if (episodeIds.length > 0) {
        const { data: episodes } = await supabase
          .from('episodes')
          .select('id,title,podcast_id,podcast:podcasts(id,title,cover_url,host_name)')
          .in('id', episodeIds);
        for (const ep of (episodes || []) as any[]) {
          episodeMap[ep.id] = {
            id: ep.id,
            title: ep.title,
            podcast_id: ep.podcast_id,
            podcast: Array.isArray(ep.podcast) ? ep.podcast[0] : ep.podcast,
          };
        }
      }
      setEpisodesById(episodeMap);

      const completedSet = new Set((stepProgress as any[]).map((sp) => sp.step_id));
      const enrollMap = new Map((enrollments as any[]).map((e) => [e.path_id, e]));

      const result: PathWithProgress[] = allPaths.map((p) => ({
        path: p,
        steps: allSteps.filter((s) => s.path_id === p.id),
        enrolled: enrollMap.has(p.id),
        completedStepIds: completedSet,
        enrollment: (enrollMap.get(p.id) as UserPathEnrollment) || null,
        categoryName: p.category_id ? catMap.get(p.category_id) : undefined,
      }));

      setPaths(result);
    } catch (err) {
      console.error('Failed to load learning paths', err);
      setLoadError(getErrorMessage(err));
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void loadPaths(); }, [loadPaths]);

  const enroll = async (pathId: string) => {
    if (!user) return;
    setActionPathId(pathId);
    try {
      const { error } = await supabase.from('user_path_enrollments').insert({ user_id: user.id, path_id: pathId });
      if (error) throw error;
      await loadPaths();
      setExpandedPath(pathId);
    } catch (err) {
      console.error(err);
    } finally {
      setActionPathId(null);
    }
  };

  const toggleStepComplete = async (stepId: string, isComplete: boolean) => {
    if (!user) return;
    try {
      if (isComplete) {
        await supabase.from('user_path_step_progress').delete().eq('user_id', user.id).eq('step_id', stepId);
      } else {
        const { error } = await supabase.from('user_path_step_progress').insert({ user_id: user.id, step_id: stepId });
        if (error) throw error;
        const { data: step } = await supabase.from('learning_path_steps').select('xp_reward').eq('id', stepId).maybeSingle();
        if (step && step.xp_reward > 0) {
          const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).maybeSingle();
          if (profile) await supabase.from('profiles').update({ xp: (profile.xp || 0) + step.xp_reward }).eq('id', user.id);
        }
      }
      await loadPaths();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPaths = useMemo(() => {
    if (difficultyFilter === 'all') return paths;
    return paths.filter((p) => p.path.difficulty === difficultyFilter);
  }, [paths, difficultyFilter]);

  const stats = useMemo(() => {
    const enrolled = paths.filter((p) => p.enrolled);
    const totalSteps = enrolled.reduce((acc, p) => acc + p.steps.length, 0);
    const completedSteps = enrolled.reduce((acc, p) => acc + p.steps.filter((s) => p.completedStepIds.has(s.id)).length, 0);
    return {
      enrolled: enrolled.length,
      completed: enrolled.filter((p) => p.steps.length > 0 && p.steps.every((s) => p.completedStepIds.has(s.id))).length,
      progress: totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0,
    };
  }, [paths]);

  return (
    <Layout title="مسارات التعلّم">
      <div className="space-y-6">
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary-700 via-primary-600 to-teal-600 text-white">
          <div className="relative p-1 sm:p-2">
            <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-10 -right-10 h-36 w-36 rounded-full bg-accent-400/20 blur-2xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <Route size={28} />
                </div>
                <div>
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/95">
                    <Sparkles size={14} />
                    مرتبطة بمحتوى المنصة
                  </div>
                  <h2 className="text-2xl font-extrabold sm:text-3xl">مسارات تعلّم</h2>
                  <p className="mt-2 max-w-2xl text-sm text-primary-50/95 sm:text-base">
                    رحلات واضحة تجمع بين الاستماع، التطبيق، والتأمل — وكل خطوة بودكاست مرتبطة بحلقة حقيقية داخل سدى.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 md:w-[360px]">
                <StatBox label="مساراتي" value={stats.enrolled} />
                <StatBox label="مكتملة" value={stats.completed} />
                <StatBox label="التقدم" value={`${stats.progress}%`} />
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Filter size={16} />
            <span>فلترة حسب المستوى</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['all', 'الكل'],
              ['beginner', 'مبتدئ'],
              ['intermediate', 'متوسط'],
              ['advanced', 'متقدم'],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setDifficultyFilter(value)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  difficultyFilter === value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          </div>
        ) : loadError ? (
          <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10">
            <div className="flex items-start gap-3 text-amber-800 dark:text-amber-200">
              <AlertCircle className="mt-0.5 shrink-0" size={20} />
              <div>
                <p className="font-bold">تعذر تحميل مسارات التعلّم</p>
                <p className="mt-1 text-sm opacity-90">{loadError}</p>
                <p className="mt-2 text-xs opacity-80">إذا كانت الرسالة تتعلق بالصلاحيات، شغّل migration المسارات في Supabase SQL Editor.</p>
              </div>
            </div>
          </Card>
        ) : filteredPaths.length === 0 ? (
          <Card>
            <div className="py-12 text-center text-neutral-500 dark:text-neutral-400">
              <BookOpen className="mx-auto mb-3 opacity-50" size={36} />
              لا توجد مسارات مطابقة للفلتر الحالي.
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPaths.map(({ path, steps, enrolled, completedStepIds, categoryName }) => {
              const completedCount = steps.filter((s) => completedStepIds.has(s.id)).length;
              const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
              const isExpanded = expandedPath === path.id;
              const totalXp = steps.reduce((acc, s) => acc + (s.xp_reward || 0), 0);

              return (
                <Card key={path.id} className="overflow-hidden">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 ring-1 ring-primary-100 dark:from-primary-900/30 dark:to-primary-900/10 dark:text-primary-300 dark:ring-primary-900/40">
                        <span className="text-3xl leading-none" aria-hidden="true">{path.cover_emoji || '🧭'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white">{path.title}</h3>
                          {categoryName && <Badge variant="neutral" size="sm">{categoryName}</Badge>}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{path.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${difficultyStyles[path.difficulty] || difficultyStyles.beginner}`}>
                            {pathDifficultyLabels[path.difficulty] || path.difficulty}
                          </span>
                          <Badge variant="neutral" size="sm"><span className="inline-flex items-center gap-1"><Clock size={12} />{path.duration_weeks} أسابيع</span></Badge>
                          <Badge variant="accent" size="sm">{steps.length} خطوات</Badge>
                          <Badge variant="primary" size="sm">{totalXp} XP</Badge>
                          {enrolled && <Badge variant="success" size="sm">{completedCount}/{steps.length} مكتمل</Badge>}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2 lg:flex-col lg:items-stretch">
                      {!enrolled ? (
                        <Button size="sm" onClick={() => enroll(path.id)} leftIcon={<Play size={14} />} disabled={actionPathId === path.id}>
                          {actionPathId === path.id ? 'جاري التسجيل...' : 'ابدأ المسار'}
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setExpandedPath(isExpanded ? null : path.id)}>
                          {isExpanded ? 'إخفاء الخطوات' : 'عرض الخطوات'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {enrolled && (
                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                        <span>التقدم في المسار</span>
                        <span className="font-bold text-primary-600 dark:text-primary-400">{Math.round(progressPct)}%</span>
                      </div>
                      <ProgressBar value={progressPct} size="sm" variant="accent" />
                    </div>
                  )}

                  {isExpanded && enrolled && (
                    <div className="mt-5 space-y-3 border-t border-neutral-100 pt-5 dark:border-neutral-800">
                      {steps.map((step, idx) => {
                        const type = step.step_type as StepType;
                        const Icon = stepTypeIcon[type] || Target;
                        const isComplete = completedStepIds.has(step.id);
                        const prevStep = steps[idx - 1];
                        const prevComplete = !prevStep || completedStepIds.has(prevStep.id);
                        const locked = !prevComplete && !isComplete;
                        const linked = step.linked_episode_id ? episodesById[step.linked_episode_id] : undefined;
                        const podcast = linked?.podcast;

                        return (
                          <div
                            key={step.id}
                            className={`flex gap-3 rounded-2xl border p-4 transition ${
                              isComplete
                                ? 'border-success-200 bg-success-50/70 dark:border-success-900/40 dark:bg-success-900/10'
                                : locked
                                ? 'border-neutral-200 bg-neutral-50/70 opacity-70 dark:border-neutral-800 dark:bg-neutral-800/30'
                                : 'border-primary-100 bg-white dark:border-primary-900/30 dark:bg-neutral-900/30'
                            }`}
                          >
                            <button
                              onClick={() => !locked && toggleStepComplete(step.id, isComplete)}
                              disabled={locked}
                              className="mt-0.5 shrink-0 rounded-full"
                              aria-label={isComplete ? 'إلغاء الإكمال' : 'تحديد كمكتمل'}
                            >
                              {isComplete ? <CheckCircle2 size={24} className="text-success-600" /> : locked ? <Lock size={22} className="text-neutral-400" /> : <Circle size={24} className="text-neutral-300 dark:text-neutral-600" />}
                            </button>

                            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isComplete ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'}`}>
                              <Icon size={18} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-neutral-400">الخطوة {step.step_order}</span>
                                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">{stepTypeLabel[type]}</span>
                                {step.xp_reward > 0 && <span className="text-xs font-bold text-accent-600">+{step.xp_reward} XP</span>}
                              </div>
                              <p className={`mt-1 font-bold ${isComplete ? 'text-neutral-500 line-through' : 'text-neutral-900 dark:text-white'}`}>{step.title}</p>
                              {step.description && <p className="mt-1 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{step.description}</p>}
                              {step.tip_text && (
                                <div className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                  <span className="font-bold">نصيحة: </span>{step.tip_text}
                                </div>
                              )}

                              {type === 'podcast' && linked && (
                                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800/60 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">محتوى مرتبط من المنصة</p>
                                    <p className="truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">{podcast?.title || 'بودكاست'}</p>
                                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{linked.title}{podcast?.host_name ? ` • ${podcast.host_name}` : ''}</p>
                                  </div>
                                  <Link
                                    to={`/podcasts/${linked.podcast_id}`}
                                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-xs font-bold text-white hover:bg-primary-700"
                                  >
                                    افتح البودكاست
                                    <ArrowLeft size={14} />
                                  </Link>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-3 py-3 text-center ring-1 ring-white/15 backdrop-blur-sm">
      <div className="text-lg font-extrabold sm:text-xl">{value}</div>
      <div className="mt-0.5 text-[11px] font-semibold text-primary-50/90 sm:text-xs">{label}</div>
    </div>
  );
}
