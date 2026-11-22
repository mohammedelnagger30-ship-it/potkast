import {
  CheckCircle2, Download, ExternalLink, RefreshCw, Smartphone, Sparkles,
} from 'lucide-react';
import { Badge, Button, Card, CardHeader, ProgressBar } from '@/components/ui';
import { useUpdate } from '@/context/UpdateContext';
import { isNativeUpdateSupported } from '@/lib/apkUpdate';
import { formatBytes, formatReleaseDate, formatReleaseNotes } from '@/lib/appUpdate';

export function UpdateCard() {
  const {
    currentVersion, latest, available, checking, lastCheckedAt, error,
    download, checkForUpdates, dismissUpdate, startDownload, installUpdate,
    cancelDownload,
  } = useUpdate();

  const busy = download.status === 'starting'
    || download.status === 'downloading'
    || download.status === 'installing';
  const notes = latest ? formatReleaseNotes(latest.notes) : [];
  // The updates surfaces always show what is actually available, even if the
  // user chose "later" on the one-time prompt or in the header badge.
  const showUpdate = available && latest;

  return (
    <Card className="mb-6">
      <CardHeader
        title="تحديثات التطبيق"
        subtitle={`النسخة المثبّتة ${currentVersion}${
          lastCheckedAt ? ` · آخر فحص ${formatReleaseDate(new Date(lastCheckedAt).toISOString())}` : ''
        }`}
        action={(
          <Badge variant={showUpdate ? 'warning' : 'success'} size="sm">
            {showUpdate ? 'تحديث متاح' : 'محدّث'}
          </Badge>
        )}
      />

      {showUpdate && latest ? (
        <div className="rounded-2xl border border-warning-200 dark:border-warning-900/50 bg-warning-50/60 dark:bg-warning-900/10 p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 text-warning-600 flex items-center justify-center flex-shrink-0">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-extrabold text-neutral-900 dark:text-white">{latest.name}</p>
                <Badge variant="warning" size="sm">v{latest.version}</Badge>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {formatReleaseDate(latest.publishedAt)}
                {latest.apkSize ? ` · ${formatBytes(latest.apkSize)}` : ''}
              </p>
            </div>
          </div>

          {notes.length > 0 && (
            <div className="mt-3 pr-[52px]">
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-300 mb-1">جديد في النسخة:</p>
              <div className="space-y-1">
                {notes.map((line, index) => (
                  <p key={`${index}-${line}`} className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 pr-[52px] flex items-center gap-2 flex-wrap">
            {download.status === 'ready' ? (
              <>
                <Button size="sm" onClick={() => void installUpdate()} leftIcon={<Smartphone size={15} />}>
                  {isNativeUpdateSupported() ? 'تثبيت التحديث' : 'تنزيل ملف التحديث'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void cancelDownload()}>إلغاء</Button>
              </>
            ) : busy ? (
              <>
                <div className="flex-1 min-w-[180px]">
                  <ProgressBar
                    value={download.progress}
                    size="sm"
                    variant={download.status === 'installing' ? 'success' : 'primary'}
                    showLabel
                  />
                </div>
                <Button size="sm" variant="ghost" onClick={() => void cancelDownload()}>إيقاف</Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => void startDownload()} leftIcon={<Download size={15} />}>
                  تنزيل التحديث
                </Button>
                <Button size="sm" variant="ghost" onClick={dismissUpdate}>تذكّرني لاحقاً</Button>
              </>
            )}
          </div>

          {download.error && (
            <p className="mt-3 pr-[52px] text-xs font-semibold text-error-600 dark:text-error-400">{download.error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-success-50/70 dark:bg-success-900/10 border border-success-200/60 dark:border-success-900/40 p-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 text-success-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">أنت على أحدث نسخة</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {latest ? `النسخة المتاحة ${latest.version}` : 'لسه مفيش بيانات عن أحدث نسخة'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="mb-3 text-xs font-semibold text-error-600 dark:text-error-400">{error}</p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => void checkForUpdates(true)}
          disabled={checking}
          leftIcon={<RefreshCw size={15} className={checking ? 'animate-spin' : ''} />}
        >
          {checking ? 'جاري الفحص...' : 'تحقق من التحديثات'}
        </Button>
        {latest && (
          <a
            href={latest.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            صفحة الإصدار <ExternalLink size={14} />
          </a>
        )}
      </div>
    </Card>
  );
}
