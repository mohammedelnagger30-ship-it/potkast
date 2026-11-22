import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, Clock, Download, HardDrive, Loader2, Play,
  RotateCcw, Trash2, TriangleAlert, WifiOff,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, ProgressBar } from '@/components/ui';
import { useDownload } from '@/context/DownloadContext';
import { useProgress } from '@/context/ProgressContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { formatBytes } from '@/lib/downloads';
import { formatDuration } from '@/types/podcast';
import type { DownloadRecord } from '@/lib/downloads';
import type { Podcast } from '@/types/podcast';

function recordToEpisode(record: DownloadRecord, localUrl: (id: string) => string) {
  return {
    id: record.episodeId,
    podcast_id: record.podcastId,
    title: record.episodeTitle,
    description: '',
    audio_url: localUrl(record.episodeId) || record.audioUrl,
    duration_seconds: record.durationSeconds,
    plays_count: 0,
    published_at: '',
  };
}

export default function DownloadsPage() {
  const {
    downloads, active, finished, problems, storage, loading, cancel, retry, remove, clearFinished, localUrl,
  } = useDownload();
  const { progress, refresh } = useProgress();
  const { playEpisode } = useAudioPlayer();

  const storagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  const play = (record: DownloadRecord) => {
    playEpisode(
      recordToEpisode(record, localUrl),
      record.podcastId
        ? ({ id: record.podcastId, title: record.podcastTitle } as Podcast)
        : undefined
    );
  };

  return (
    <Layout title="التنزيلات والتقدّم">
      {/* Overall progress */}
      <Card className="mb-6">
        <CardHeader title="تقدّمك الكلي" />
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="sm:w-40 flex-shrink-0 text-center">
            <p className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">{progress.percent}%</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">من كل المحتوى المتاح</p>
          </div>
          <div className="flex-1 space-y-3">
            <ProgressBar value={progress.percent} size="lg" showLabel={false} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
                <p className="font-extrabold text-neutral-900 dark:text-white">{progress.completedEpisodes.toLocaleString('ar-EG')}</p>
                <p className="text-[10px] text-neutral-500">حلقة مكتملة</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
                <p className="font-extrabold text-neutral-900 dark:text-white">{progress.startedEpisodes.toLocaleString('ar-EG')}</p>
                <p className="text-[10px] text-neutral-500">حلقة بدأتها</p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
                <p className="font-extrabold text-neutral-900 dark:text-white">{formatDuration(progress.listenedSeconds)}</p>
                <p className="text-[10px] text-neutral-500">زمن استماع</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              تقدّم الاستماع داخل الحلقات التي بدأتها: {progress.listenPercent}%
            </p>
            <button
              onClick={() => void refresh()}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
            >
              تحديث التقدّم
            </button>
          </div>
        </div>

        {progress.perHost.length > 0 && (
          <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <h3 className="font-extrabold text-sm text-neutral-800 dark:text-neutral-200 mb-3">تقدّمك لكل مقدم</h3>
            <div className="space-y-3">
              {progress.perHost.map((host) => (
                <div key={host.hostId}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {host.slug ? (
                      <Link
                        to={`/hosts/${host.slug}`}
                        className="text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:text-primary-600 truncate flex items-center gap-1"
                      >
                        {host.name} <ArrowRight size={12} />
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate">{host.name}</span>
                    )}
                    <span className="text-xs text-neutral-500 flex-shrink-0">
                      {host.completedEpisodes} / {host.totalEpisodes || host.startedEpisodes} حلقة — {host.percent}%
                    </span>
                  </div>
                  <ProgressBar value={host.percent} size="sm" variant="success" />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Storage */}
      <Card className="mb-6">
        <CardHeader title="مساحة التخزين على الجهاز" />
        <div className="flex items-center gap-3 mb-2">
          <HardDrive size={18} className="text-primary-600 flex-shrink-0" />
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            {formatBytes(storage.usage)} مستخدم
          </p>
          {storage.quota > 0 && (
            <p className="text-xs text-neutral-500 mr-auto">من {formatBytes(storage.quota)} متاحة</p>
          )}
        </div>
        <ProgressBar value={storagePct} size="sm" variant="accent" />
        <p className="text-xs text-neutral-500 mt-2">
          الملفات بتتخزن على جهازك فقط، ومش بتترفع لأي سيرفر.
        </p>
      </Card>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={28} className="animate-spin text-primary-600" />
        </div>
      )}

      {/* Active downloads */}
      {active.length > 0 && (
        <Card className="mb-6">
          <CardHeader title={`جارٍ التنزيل (${active.length})`} />
          <div className="space-y-3">
            {active.map((r) => (
              <div key={r.id} className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 size={16} className="animate-spin text-primary-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{r.episodeTitle}</p>
                    <p className="text-xs text-neutral-500 truncate">{r.podcastTitle}</p>
                  </div>
                  <span className="text-xs font-bold text-primary-600 flex-shrink-0">
                    {r.status === 'queued'
                      ? 'في الانتظار'
                      : r.storage === 'cache'
                        ? 'جارٍ الحفظ…'
                        : `${Math.round(r.progress * 100)}%`}
                  </span>
                  <button
                    onClick={() => cancel(r.id)}
                    title="إلغاء"
                    className="text-error-600 hover:text-error-700 flex-shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <ProgressBar value={r.progress * 100} size="sm" />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Failed / canceled */}
      {problems.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="تنزيلات تحتاج إعادة المحاولة" />
          <div className="space-y-2">
            {problems.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-warning-50 dark:bg-warning-900/10">
                <TriangleAlert size={16} className="text-warning-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{r.episodeTitle}</p>
                  <p className="text-xs text-warning-700 dark:text-warning-400 truncate">{r.error || 'تم إلغاء التنزيل'}</p>
                </div>
                <button onClick={() => retry(r.id)} title="إعادة المحاولة" className="text-primary-600 flex-shrink-0">
                  <RotateCcw size={17} />
                </button>
                <button onClick={() => void remove(r.id)} title="حذف" className="text-error-600 flex-shrink-0">
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Finished */}
      <Card>
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <CardHeader title={`محفوظة للاستماع بدون إنترنت (${finished.length})`} />
          {finished.length > 0 && (
            <button
              onClick={() => void clearFinished()}
              className="text-xs font-bold text-error-600 hover:underline flex-shrink-0"
            >
              مسح الكل
            </button>
          )}
        </div>
        {finished.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
              <WifiOff size={28} />
            </div>
            <p className="font-bold text-neutral-700 dark:text-neutral-300">لسه مفيش تنزيلات</p>
            <p className="text-sm text-neutral-500 mt-1 max-w-sm">
              نزّل أي حلقة أو سلسلة كاملة من صفحة البودكاست أو صفحة المقدم، وهتلاقيها هنا جاهزة للسمع من غير نت.
            </p>
          </div>
        ) : (
          <div className="space-y-2 px-5 pb-5">
            {finished.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60">
                <button
                  onClick={() => play(r)}
                  className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center flex-shrink-0 hover:bg-primary-600 hover:text-white transition-all"
                  title="تشغيل من الملف المحمّل"
                >
                  <Play size={17} fill="currentColor" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{r.episodeTitle}</p>
                  <p className="text-xs text-neutral-500 truncate flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-success-500" />
                    {r.podcastTitle}
                    {r.durationSeconds > 0 && <>• {formatDuration(r.durationSeconds)}</>}
                    {r.size > 0 && <>• {formatBytes(r.size)}</>}
                  </p>
                </div>
                <button onClick={() => void remove(r.id)} title="حذف التنزيل" className="text-error-600 flex-shrink-0">
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {(active.length > 0 || finished.length > 0) && (
        <p className="text-center text-xs text-neutral-400 mt-4 flex items-center justify-center gap-1">
          <Download size={13} /> كل التنزيلات محفوظة على جهازك وتشتغل حتى من غير إنترنت.
          <Clock size={13} className="mr-2" />
        </p>
      )}
    </Layout>
  );
}
