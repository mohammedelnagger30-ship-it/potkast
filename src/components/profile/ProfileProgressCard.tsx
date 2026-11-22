import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Headphones, TrendingUp } from 'lucide-react';
import { Card, CardHeader, ProgressBar } from '@/components/ui';
import { useProgress } from '@/context/ProgressContext';
import { formatDuration } from '@/types/podcast';

export function ProfileProgressCard({ limitHosts = 5 }: { limitHosts?: number }) {
  const { progress } = useProgress();

  return (
    <Card className="mb-6">
      <CardHeader
        title="تقدّمك في الاستماع"
        subtitle="صورة سريعة لكل اللي سمعتَه حتى الآن"
        action={
          <Link to="/progress" className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">
            التفاصيل
            <ArrowLeft size={14} />
          </Link>
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <Headphones size={22} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">المستوى الكلي</p>
            <p className="text-lg font-extrabold text-primary-600 dark:text-primary-400">{progress.percent}%</p>
          </div>
          <ProgressBar value={progress.percent} size="md" variant="success" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400 mb-4">
        <p>
          <span className="block font-extrabold text-neutral-800 dark:text-white">{progress.completedEpisodes}</span>
          حلقة مكتملة
        </p>
        <p>
          <span className="block font-extrabold text-neutral-800 dark:text-white">{progress.startedEpisodes}</span>
          حلقة بدأتها
        </p>
        <p>
          <span className="block font-extrabold text-neutral-800 dark:text-white">{formatDuration(progress.listenedSeconds)}</span>
          زمن استماع
        </p>
      </div>

      {progress.perHost.length > 0 && (
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 space-y-2.5">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400">تقدّمك لكل مقدم</p>
          {progress.perHost.slice(0, limitHosts).map((host) => (
            <div key={host.hostId}>
              <div className="flex items-center justify-between gap-2 mb-1">
                {host.slug ? (
                  <Link
                    to={`/hosts/${host.slug}`}
                    className="text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-primary-600 truncate"
                  >
                    {host.name}
                  </Link>
                ) : (
                  <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{host.name}</span>
                )}
                <span className="text-[10px] text-neutral-500 flex-shrink-0">
                  {host.completedEpisodes}/{host.totalEpisodes || host.startedEpisodes} — {host.percent}%
                </span>
              </div>
              <ProgressBar value={host.percent} size="sm" variant="success" />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <Link
          to="/progress"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-all"
        >
          <TrendingUp size={15} />
          تقرير التقدّم
        </Link>
        <Link
          to="/downloads"
          className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-all"
        >
          <Download size={15} />
          التنزيلات
        </Link>
      </div>
    </Card>
  );
}
