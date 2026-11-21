import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, ProgressBar, Button } from '@/components/ui';
import { Route, CheckCircle2, Circle, Play, ArrowLeft, Mic, Target, Lightbulb, PenLine, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { pathDifficultyLabels, type LearningPath, type LearningPathStep, type UserPathEnrollment } from '@/types/features';

const stepTypeIcon: Record<string, typeof Mic> = {
  podcast: Mic,
  mission: Target,
  tip: Lightbulb,
  reflection: PenLine,
};

const stepTypeLabel: Record<string, string> = {
  podcast: 'بودكاست',
  mission: 'مهمة',
  tip: 'نصيحة',
  reflection: 'تأمل',
};

interface PathWithProgress {
  path: LearningPath;
  steps: LearningPathStep[];
  enrolled: boolean;
  completedStepIds: Set<string>;
  enrollment: UserPathEnrollment | null;
}

export default function LearningPathsPage() {
  const { user } = useAuth();
  const [paths, setPaths] = useState<PathWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPath, setExpandedPath] = useState<string | null>(null);

  const loadPaths = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: allPaths } = await supabase
      .from('learning_paths')
      .select('*')
      .order('created_at', { ascending: true });

    const { data: allSteps } = await supabase
      .from('learning_path_steps')
      .select('*')
      .order('step_order', { ascending: true });

    const { data: enrollments } = await supabase
      .from('user_path_enrollments')
      .select('*')
      .eq('user_id', user.id);

    const { data: stepProgress } = await supabase
      .from('user_path_step_progress')
      .select('step_id')
      .eq('user_id', user.id);

    const completedSet = new Set((stepProgress || []).map((sp: any) => sp.step_id));
    const enrollMap = new Map((enrollments || []).map((e: any) => [e.path_id, e]));

    const result: PathWithProgress[] = (allPaths || []).map((p: any) => ({
      path: p as LearningPath,
      steps: (allSteps || []).filter((s: any) => s.path_id === p.id) as LearningPathStep[],
      enrolled: enrollMap.has(p.id),
      completedStepIds: completedSet,
      enrollment: enrollMap.get(p.id) || null,
    }));

    setPaths(result);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadPaths();
  }, [loadPaths]);

  const enroll = async (pathId: string) => {
    if (!user) return;
    await supabase.from('user_path_enrollments').insert({
      user_id: user.id,
      path_id: pathId,
    });
    loadPaths();
  };

  const toggleStepComplete = async (stepId: string, pathId: string, isComplete: boolean) => {
    if (!user) return;
    if (isComplete) {
      await supabase.from('user_path_step_progress').delete().eq('user_id', user.id).eq('step_id', stepId);
    } else {
      await supabase.from('user_path_step_progress').insert({
        user_id: user.id,
        step_id: stepId,
      });

      const { data: step } = await supabase
        .from('learning_path_steps')
        .select('xp_reward')
        .eq('id', stepId)
        .maybeSingle();
      if (step && step.xp_reward > 0) {
        const { data: profile } = await supabase.from('profiles').select('xp').eq('id', user.id).maybeSingle();
        if (profile) {
          await supabase.from('profiles').update({ xp: profile.xp + step.xp_reward }).eq('id', user.id);
        }
      }
    }
    loadPaths();
  };

  if (loading) {
    return (
      <Layout title="مسارات التعلّم">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="مسارات التعلّم">
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Route size={28} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">مسارات التعلّم</h2>
              <p className="text-primary-100 text-sm mt-0.5">
                رحلات منظّفة متعددة الأسابيع تجمع البودكاست والمهام والنصائح
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        {paths.map(({ path, steps, enrolled, completedStepIds }) => {
          const completedCount = steps.filter((s) => completedStepIds.has(s.id)).length;
          const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
          const isExpanded = expandedPath === path.id;

          return (
            <Card key={path.id} className="animate-fade-in-up">
              <div className="flex items-start gap-4">
                <div className="text-4xl flex-shrink-0">{path.cover_emoji}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-neutral-900 dark:text-white text-lg">{path.title}</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{path.description}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="neutral" size="sm">{path.duration_weeks} أسابيع</Badge>
                    <Badge variant="primary" size="sm">{pathDifficultyLabels[path.difficulty]}</Badge>
                    <Badge variant="accent" size="sm">{steps.length} خطوات</Badge>
                    {enrolled && (
                      <Badge variant="success" size="sm">{completedCount}/{steps.length} مكتمل</Badge>
                    )}
                  </div>
                </div>
              </div>

              {enrolled && (
                <div className="mt-4">
                  <ProgressBar value={progressPct} size="sm" variant="accent" />
                </div>
              )}

              <div className="mt-4 flex gap-2">
                {!enrolled ? (
                  <Button size="sm" onClick={() => enroll(path.id)} leftIcon={<Play size={14} />}>
                    التسجيل في المسار
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setExpandedPath(isExpanded ? null : path.id)}
                  >
                    {isExpanded ? 'إخفاء الخطوات' : 'عرض الخطوات'}
                  </Button>
                )}
              </div>

              {isExpanded && enrolled && (
                <div className="mt-4 space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
                  {steps.map((step) => {
                    const Icon = stepTypeIcon[step.step_type] || Target;
                    const isComplete = completedStepIds.has(step.id);
                    const prevStep = steps.find((s) => s.step_order === step.step_order - 1);
                    const prevComplete = !prevStep || completedStepIds.has(prevStep.id);
                    const locked = !prevComplete && !isComplete;

                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isComplete
                            ? 'bg-success-50 dark:bg-success-900/20'
                            : locked
                            ? 'bg-neutral-50 dark:bg-neutral-800/30 opacity-60'
                            : 'bg-primary-50 dark:bg-primary-900/20'
                        }`}
                      >
                        <button
                          onClick={() => !locked && toggleStepComplete(step.id, path.id, isComplete)}
                          disabled={locked}
                          className="flex-shrink-0"
                        >
                          {isComplete ? (
                            <CheckCircle2 size={22} className="text-success-600" />
                          ) : locked ? (
                            <Lock size={20} className="text-neutral-400" />
                          ) : (
                            <Circle size={22} className="text-neutral-300 dark:text-neutral-600" />
                          )}
                        </button>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isComplete ? 'bg-success-100 dark:bg-success-900/30 text-success-600' : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${isComplete ? 'text-neutral-500 line-through' : 'text-neutral-800 dark:text-neutral-200'}`}>
                            {step.title}
                          </p>
                          {step.description && (
                            <p className="text-xs text-neutral-400 mt-0.5">{step.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-400">{stepTypeLabel[step.step_type]}</span>
                            {step.xp_reward > 0 && (
                              <span className="text-xs text-accent-600 font-semibold">+{step.xp_reward} نقطة</span>
                            )}
                          </div>
                        </div>
                        {step.linked_episode_id && (
                          <Link to={`/podcasts`} className="text-primary-600 hover:text-primary-700">
                            <ArrowLeft size={16} />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
