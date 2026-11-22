import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Route } from 'lucide-react';
import { Badge, Card, CardHeader, ProgressBar } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { pathDifficultyLabels } from '@/types/features';

interface PathSummary {
  id: string;
  title: string;
  cover_emoji: string;
  duration_weeks: number;
  difficulty: string;
  total: number;
  completed: number;
  enrolled: boolean;
}

export function UserPathsCard({ limit = 3 }: { limit?: number }) {
  const { user } = useAuth();
  const [paths, setPaths] = useState<PathSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [pathRows, stepRows, enrollRows, doneRows] = await Promise.all([
        supabase.from('learning_paths').select('id,title,cover_emoji,duration_weeks,difficulty').order('created_at'),
        supabase.from('learning_path_steps').select('id,path_id'),
        supabase.from('user_path_enrollments').select('path_id').eq('user_id', user.id),
        supabase.from('user_path_step_progress').select('step_id').eq('user_id', user.id),
      ]);

      const enrolledIds = new Set((enrollRows.data || []).map((r: any) => r.path_id));
      const doneIds = new Set((doneRows.data || []).map((r: any) => r.step_id));
      const stepsByPath = new Map<string, string[]>();
      for (const step of (stepRows.data || []) as any[]) {
        const list = stepsByPath.get(step.path_id) || [];
        list.push(step.id);
        stepsByPath.set(step.path_id, list);
      }

      const result: PathSummary[] = ((pathRows.data || []) as any[]).map((p) => {
        const stepIds = stepsByPath.get(p.id) || [];
        return {
          id: p.id,
          title: p.title,
          cover_emoji: p.cover_emoji || '🧭',
          duration_weeks: p.duration_weeks || 0,
          difficulty: p.difficulty || 'beginner',
          total: stepIds.length,
          completed: stepIds.filter((id) => doneIds.has(id)).length,
          enrolled: enrolledIds.has(p.id),
        };
      });

      result.sort((a, b) => Number(b.enrolled) - Number(a.enrolled) || b.completed - a.completed);
      setPaths(result);
    } catch {
      setPaths([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="mb-6">
      <CardHeader
        title="مسارات التعلّم"
        subtitle="رحلات منظّمة تجمع البودكاست والمهام والتأملات"
        action={
          <Link to="/learning-paths" className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">
            كل المسارات
            <ArrowLeft size={14} />
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-8 h-8 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      ) : paths.length === 0 ? (
        <div className="text-center py-6">
          <Route size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">لسه مفيش مسارات متاحة دلوقتي</p>
        </div>
      ) : (
        <div className="space-y-3">
          {paths.slice(0, limit).map((path) => {
            const percent = path.total > 0 ? Math.round((path.completed / path.total) * 100) : 0;
            return (
              <div
                key={path.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60"
              >
                <span className="text-2xl flex-shrink-0">{path.cover_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 truncate">{path.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <Badge variant="neutral" size="sm">{path.duration_weeks} أسابيع</Badge>
                    <Badge variant="primary" size="sm">{pathDifficultyLabels[path.difficulty] || path.difficulty}</Badge>
                    {path.enrolled && <Badge variant="success" size="sm">{path.completed}/{path.total}</Badge>}
                  </div>
                  {path.enrolled && (
                    <ProgressBar value={percent} size="sm" variant="accent" className="mt-2" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
