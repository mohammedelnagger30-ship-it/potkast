import { ExternalLink, History, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/layout';
import { UpdateCard } from '@/components/updates/UpdateCard';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { useUpdate } from '@/context/UpdateContext';
import { compareVersions, formatReleaseDate, formatReleaseNotes } from '@/lib/appUpdate';

export default function UpdatesPage() {
  const { recent, latest, currentVersion, checking, checkForUpdates } = useUpdate();

  return (
    <Layout title="التحديثات">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <RefreshCw size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white">تحديثات التطبيق</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            تابع أحدث النسخ، ونزّل التحديث وثبّته من جوه التطبيق
          </p>
        </div>
      </div>

      <UpdateCard />

      <Card className="mb-6">
        <CardHeader title="سجل الإصدارات" subtitle="آخر النسخ المنشورة" />
        {recent.length > 0 ? (
          <div className="space-y-2">
            {recent.map((release) => {
              const notes = formatReleaseNotes(release.notes);
              const isLatest = latest?.version === release.version;
              const isNew = compareVersions(release.version, currentVersion) > 0;
              return (
                <a
                  key={release.tag}
                  href={release.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={isNew ? 'warning' : 'neutral'} size="sm">v{release.version}</Badge>
                      {isLatest && <Badge variant="success" size="sm">الأحدث</Badge>}
                    </div>
                    <span className="text-[11px] text-neutral-400">{formatReleaseDate(release.publishedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-neutral-800 dark:text-neutral-200">{release.name}</p>
                  {notes[0] && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{notes[0]}</p>
                  )}
                  <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 dark:text-primary-400">
                    التفاصيل <ExternalLink size={12} />
                  </span>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <History size={28} className="mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">لسه مفيش إصدارات متاحة</p>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => void checkForUpdates(true)} disabled={checking}>
              {checking ? 'جاري الفحص...' : 'تحقق من التحديثات'}
            </Button>
          </div>
        )}
      </Card>
    </Layout>
  );
}
