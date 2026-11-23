import { CheckCircle2, Download, Loader2, RotateCcw } from 'lucide-react';
import { useDownload } from '@/context/DownloadContext';
import type { Episode, Podcast } from '@/types/podcast';

type PodcastRef = Podcast | { id: string; title: string } | null;

const RING_LENGTH = 2 * Math.PI * 9;

function ProgressRing({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <span className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width="22" height="22" viewBox="0 0 24 24" className="-rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5"
          className="text-neutral-200 dark:text-neutral-700" stroke="currentColor" />
        <circle cx="12" cy="12" r="9" fill="none" strokeWidth="2.5" strokeLinecap="round"
          className="text-primary-600 dark:text-primary-400" stroke="currentColor"
          strokeDasharray={`${(pct / 100) * RING_LENGTH} ${RING_LENGTH}`} />
      </svg>
      <span className="absolute text-[8px] font-extrabold text-primary-700 dark:text-primary-300">
        {pct}
      </span>
    </span>
  );
}

export function DownloadButton({
  episode,
  podcast,
  compact = false,
}: {
  episode: Episode;
  podcast?: PodcastRef;
  compact?: boolean;
}) {
  const { downloads, downloadEpisode, cancel, retry, isDownloaded } = useDownload();
  const record = downloads.find((r) => r.id === episode.id);
  const done = isDownloaded(episode.id) || record?.status === 'done';
  const busy = record?.status === 'downloading' || record?.status === 'queued';
  const broken = record?.status === 'error' || record?.status === 'canceled';
  const opaque = record?.storage === 'cache';

  if (done) {
    return (
      <span
        title="محفوظة على الجهاز — متاحة للاستماع بدون إنترنت"
        className={`inline-flex items-center justify-center gap-1 flex-shrink-0 text-success-600 dark:text-success-400 ${
          compact ? 'p-1.5' : 'px-2 py-1.5 text-xs font-bold'
        }`}
      >
        <CheckCircle2 size={compact ? 18 : 16} />
        {!compact && 'محفوظة'}
      </span>
    );
  }

  const base = `inline-flex items-center justify-center gap-1 flex-shrink-0 rounded-lg transition-colors ${
    compact ? 'p-1.5' : 'px-2.5 py-1.5 text-xs font-bold'
  }`;

  if (busy) {
    const progress = record?.progress || 0;
    const pct = Math.round(progress * 100);
    return (
      <button
        onClick={() => cancel(episode.id)}
        title={opaque ? 'إلغاء التنزيل — جارٍ الحفظ' : `إلغاء التنزيل — ${pct}%`}
        aria-label={`إلغاء التنزيل — ${pct}%`}
        className={`${base} text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`}
      >
        {compact ? (
          <ProgressRing value={progress} />
        ) : (
          <>
            <Loader2 size={16} className="animate-spin" />
            {opaque ? 'جارٍ التنزيل' : `${pct}%`}
          </>
        )}
      </button>
    );
  }

  if (broken) {
    return (
      <button
        onClick={() => retry(episode.id)}
        title="إعادة محاولة التنزيل"
        className={`${base} text-warning-600 dark:text-warning-400 hover:bg-warning-50 dark:hover:bg-warning-900/20`}
      >
        <RotateCcw size={compact ? 18 : 16} />
        {!compact && 'إعادة'}
      </button>
    );
  }

  return (
    <button
      onClick={() => downloadEpisode(episode, podcast)}
      title="تنزيل الحلقة للاستماع بدون إنترنت"
      className={`${base} text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30`}
    >
      <Download size={compact ? 18 : 16} />
      {!compact && 'تنزيل'}
    </button>
  );
}

export function DownloadPodcastButton({
  podcastId,
  count,
}: {
  podcastId: string;
  count: number;
}) {
  const { downloadPodcast, busyPodcasts, downloads } = useDownload();
  const busy = busyPodcasts.includes(podcastId);
  const queued = downloads.filter((r) => r.podcastId === podcastId && r.status !== 'done').length;
  const doneCount = downloads.filter((r) => r.podcastId === podcastId && r.status === 'done').length;
  const remaining = Math.max(0, count - doneCount);

  return (
    <button
      onClick={() => void downloadPodcast(podcastId)}
      disabled={busy || remaining === 0}
      title="تنزيل كل حلقات السلسلة للاستماع بدون إنترنت"
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-success-600 text-white hover:bg-success-700 disabled:opacity-60 transition-all active:scale-95"
    >
      {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
      {busy
        ? 'جارٍ تجهيز السلسلة…'
        : remaining === 0
          ? 'السلسلة محمّلة بالكامل'
          : queued > 0
            ? `متابعة التنزيل (${remaining})`
            : `تنزيل السلسلة (${count} حلقة)`}
    </button>
  );
}
