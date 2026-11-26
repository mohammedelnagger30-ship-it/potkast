import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Clock, Download, HardDrive,
  Headphones, Info, Loader2, Play, RotateCcw, Search, Trash2, TriangleAlert, WifiOff,
} from 'lucide-react';
import { matchesAnyArabicSearch } from '@/lib/arabicSearch';
import { Layout } from '@/components/layout';
import { Card, ProgressBar } from '@/components/ui';
import { useDownload } from '@/context/DownloadContext';
import { useProgress } from '@/context/ProgressContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { formatBytes, saveDownloadedFile, downloadLocationLabel } from '@/lib/downloads';
import { formatDuration } from '@/types/podcast';
import type { DownloadRecord } from '@/lib/downloads';
import type { Podcast } from '@/types/podcast';

type Tab = 'saved' | 'active' | 'issues';

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

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-5">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
        {icon}
      </div>
      <p className="font-bold text-neutral-700 dark:text-neutral-300">{title}</p>
      <p className="text-sm text-neutral-500 mt-1 max-w-md leading-relaxed">{text}</p>
      {action}
    </div>
  );
}

export default function DownloadsPage() {
  const {
    active, finished, problems, storage, loading, cancel, retry, remove, clearFinished, localUrl,
  } = useDownload();
  const { progress, refresh } = useProgress();
  const { playEpisode } = useAudioPlayer();

  const [tab, setTab] = useState<Tab>('saved');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const savedBytes = finished.reduce((sum, row) => sum + (row.size || 0), 0);
  const storagePct = storage.quota > 0 ? Math.min(100, (storage.usage / storage.quota) * 100) : 0;

  const groups = useMemo(() => {
    const rows = finished
      .filter((row) => !query.trim() || matchesAnyArabicSearch(query, row.episodeTitle, row.podcastTitle))
      .sort((a, b) => b.createdAt - a.createdAt);

    const map = new Map<string, DownloadRecord[]>();
    for (const row of rows) {
      const key = row.podcastId || row.podcastTitle || 'other';
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    }

    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        title: items[0].podcastTitle || 'بودكاستات أخرى',
        items,
        size: items.reduce((sum, row) => sum + (row.size || 0), 0),
        newest: items[0].createdAt,
      }))
      .sort((a, b) => b.newest - a.newest);
  }, [finished, query]);

  const play = (record: DownloadRecord) => {
    playEpisode(
      recordToEpisode(record, localUrl),
      record.podcastId
        ? ({ id: record.podcastId, title: record.podcastTitle } as Podcast)
        : undefined
    );
  };

  const tabs: Array<{ id: Tab; label: string; count: number; icon: typeof Download }> = [
    { id: 'saved', label: 'محفوظة بدون نت', count: finished.length, icon: Headphones },
    { id: 'active', label: 'جارٍ التنزيل', count: active.length, icon: Loader2 },
    { id: 'issues', label: 'تحتاج إعادة', count: problems.length, icon: TriangleAlert },
  ];

  return (
    <Layout title="المحفوظات وتقدّم الاستماع">
      {/* Quick, clear overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <Headphones size={18} className="text-primary-600 mb-2" />
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {finished.length.toLocaleString('ar-EG')}
          </p>
          <p className="text-[11px] text-neutral-500">حلقة جاهزة بدون نت</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <Loader2 size={18} className="text-accent-500 mb-2" />
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">
            {active.length.toLocaleString('ar-EG')}
          </p>
          <p className="text-[11px] text-neutral-500">جارٍ تنزيلها الآن</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <HardDrive size={18} className="text-success-600 mb-2" />
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{formatBytes(savedBytes)}</p>
          <p className="text-[11px] text-neutral-500">حجم الملفات المحفوظة</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4">
          <CheckCircle2 size={18} className="text-violet-500 mb-2" />
          <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{progress.percent}%</p>
          <p className="text-[11px] text-neutral-500">تقدّم الاستماع الكلي</p>
        </div>
      </div>

      {saveNotice && (
        <div className="mb-4 rounded-2xl border border-primary-200 dark:border-primary-900/40 bg-primary-50 dark:bg-primary-900/10 p-3 text-sm text-primary-800 dark:text-primary-200 flex items-start gap-2">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}
      <Card>
        <div className="flex gap-1 p-1 mb-5 rounded-xl bg-neutral-100 dark:bg-neutral-800">
          {tabs.map(({ id, label, count, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                tab === id
                  ? 'bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <Icon size={14} className={id === 'active' && count > 0 ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{id === 'saved' ? 'محفوظة' : id === 'active' ? 'جارية' : 'إعادة'}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          ))}
        </div>

        {loading && tab === 'saved' && finished.length === 0 && (
          <div className="flex justify-center py-10">
            <Loader2 size={26} className="animate-spin text-primary-600" />
          </div>
        )}

        {/* SAVED */}
        {tab === 'saved' && (
          <>
            {finished.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث في المحفوظات أو اسم البودكاست"
                    className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-sm text-neutral-800 dark:text-neutral-100 outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  onClick={() => void clearFinished()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-error-600 bg-error-50 dark:bg-error-900/10 hover:bg-error-100 dark:hover:bg-error-900/20 flex-shrink-0"
                >
                  مسح المحفوظات
                </button>
              </div>
            )}

            {groups.length === 0 ? (
              <EmptyState
                icon={<WifiOff size={28} />}
                title={finished.length === 0 ? 'لسه مفيش حلقات محفوظة' : 'مفيش نتائج للبحث'}
                text={
                  finished.length === 0
                    ? 'نزّل أي حلقة أو سلسلة كاملة من صفحة البودكاست أو صفحة المقدم، وهتلاقيها هنا مرتّبة وجاهزة للسمع من غير نت.'
                    : 'جرّب كلمة تانية، أو امسح خانة البحث.'
                }
                action={
                  finished.length === 0 ? (
                    <Link
                      to="/podcasts"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      تصفّح البودكاستات <ArrowRight size={14} />
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const open = !collapsed[group.key];
                  return (
                    <div key={group.key} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                      <div className="flex items-center gap-2 p-3 sm:p-4">
                        <button
                          onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: open }))}
                          className="flex items-center gap-3 min-w-0 flex-1 text-right"
                        >
                          <span className="w-11 h-11 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center flex-shrink-0">
                            <Headphones size={20} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-extrabold text-neutral-900 dark:text-neutral-100 truncate">
                              {group.title}
                            </span>
                            <span className="block text-xs text-neutral-500 mt-0.5">
                              {group.items.length} حلقات • {formatBytes(group.size)} • جاهزة بدون إنترنت
                            </span>
                          </span>
                          {open ? <ChevronUp size={17} className="text-neutral-400" /> : <ChevronDown size={17} className="text-neutral-400" />}
                        </button>
                        <button
                          onClick={() => void Promise.all(group.items.map((row) => remove(row.id)))}
                          title="حذف كل حلقات هذا البودكاست من الجهاز"
                          className="p-2 rounded-lg text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex-shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {open && (
                        <div className="border-t border-neutral-100 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800">
                          {group.items.map((row) => (
                            <div key={row.id} className="flex items-center gap-3 px-3 sm:px-4 py-3">
                              <button
                                onClick={() => play(row)}
                                className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center flex-shrink-0 hover:bg-primary-700 transition-colors"
                                title="تشغيل من الملف المحمّل"
                              >
                                <Play size={15} fill="currentColor" />
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{row.episodeTitle}</p>
                                <p className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <CheckCircle2 size={11} className="text-success-500" />
                                  محفوظة على جهازك
                                  {row.durationSeconds > 0 && <>• {formatDuration(row.durationSeconds)}</>}
                                  {row.size > 0 && <>• {formatBytes(row.size)}</>}
                                  <>• {row.storage === 'native' ? 'ملف على الجهاز' : 'داخل التطبيق (بدون إنترنت)'}</>
                                </p>
                                <p className="text-[10px] text-neutral-400 mt-0.5 truncate" title={downloadLocationLabel(row)}>
                                  مكان الحفظ: {downloadLocationLabel(row)}
                                </p>
                              </div>
                              {row.storage !== 'native' && (
                                <button
                                  onClick={async () => {
                                    const res = await saveDownloadedFile(row);
                                    if (res === 'saved') {
                                      setSaveNotice('تم بدء حفظ الملف. على الكمبيوتر عادة تجده في مجلد التنزيلات الافتراضي للمتصفح؛ ويمكنك معرفة/تغيير مكان الحفظ من إعدادات التنزيلات في المتصفح.');
                                      window.setTimeout(() => setSaveNotice(null), 7000);
                                    }
                                  }}
                                  title="حفظ الملف على الكمبيوتر/الجهاز"
                                  className="p-2 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 flex-shrink-0"
                                >
                                  <Download size={16} />
                                </button>
                              )}
                              <button
                                onClick={() => void remove(row.id)}
                                title="حذف هذا التنزيل"
                                className="p-2 rounded-lg text-neutral-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex-shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ACTIVE */}
        {tab === 'active' && (
          active.length === 0 ? (
            <EmptyState
              icon={<Download size={28} />}
              title="مفيش تنزيلات شغالة دلوقتي"
              text="لما تنزّل حلقة أو سلسلة كاملة، هتشوف نسبة الإنجاز والتقدم هنا وفي صفحة المقدم."
            />
          ) : (
            <div className="space-y-3">
              {active.map((row) => {
                const pct = Math.round(row.progress * 100);
                return (
                  <div key={row.id} className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60">
                    <div className="flex items-center gap-3 mb-2.5">
                      <Loader2 size={17} className="animate-spin text-primary-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{row.episodeTitle}</p>
                        <p className="text-xs text-neutral-500 truncate">{row.podcastTitle}</p>
                      </div>
                      <span className="text-sm font-extrabold text-primary-600 flex-shrink-0">
                        {row.status === 'queued' ? 'في الانتظار' : `${pct}%`}
                      </span>
                      <button
                        onClick={() => cancel(row.id)}
                        title="إلغاء التنزيل"
                        className="p-2 rounded-lg text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <ProgressBar value={pct} size="sm" />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500 mt-1.5">
                      <span>{row.status === 'queued' ? 'في انتظار بدء التنزيل' : `تم تنزيل ${row.size > 0 ? formatBytes(row.size) : '...'}`}</span>
                      <span>{row.storage === 'native' ? 'سيُحفظ كملف على الجهاز' : 'سيُحفظ داخل التطبيق للتشغيل بدون إنترنت'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ISSUES */}
        {tab === 'issues' && (
          problems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} />}
              title="كل حاجة تمام"
              text="مفيش تنزيلات فشلت. لو حصل أي خطأ، هتلاقي الحلقة هنا عشان تعيد المحاولة."
            />
          ) : (
            <div className="space-y-2">
              {problems.map((row) => (
                <div key={row.id} className="flex items-center gap-3 p-3 rounded-xl bg-warning-50 dark:bg-warning-900/10">
                  <TriangleAlert size={17} className="text-warning-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{row.episodeTitle}</p>
                    <p className="text-xs text-warning-700 dark:text-warning-400 truncate">{row.error || 'تم إلغاء التنزيل'}</p>
                  </div>
                  <button onClick={() => retry(row.id)} title="إعادة المحاولة" className="p-2 text-primary-600 flex-shrink-0">
                    <RotateCcw size={17} />
                  </button>
                  <button onClick={() => void remove(row.id)} title="حذف" className="p-2 text-error-600 flex-shrink-0">
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <HardDrive size={18} className="text-primary-600 flex-shrink-0" />
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              مساحة التخزين على الجهاز
            </p>
            {storage.quota > 0 && (
              <p className="text-xs text-neutral-500 mr-auto">من {formatBytes(storage.quota)}</p>
            )}
          </div>
          <ProgressBar value={storagePct} size="sm" variant="accent" />
          <p className="text-xs text-neutral-500 mt-2">
            {formatBytes(storage.usage)} مستخدمة. الملفات بتتخزن على جهازك فقط، ومش بتترفع لأي سيرفر.
          </p>
          <div className="mt-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3 text-[11px] text-neutral-600 dark:text-neutral-400 space-y-1">
            <p><span className="font-bold text-neutral-700 dark:text-neutral-300">مكان الحفظ:</span> على الموبايل/التطبيق يتم الحفظ داخل مساحة التطبيق أو ملف الجهاز حسب المنصة.</p>
            <p><span className="font-bold text-neutral-700 dark:text-neutral-300">على الكمبيوتر (المتصفح):</span> التحميل المباشر للملف يتم عبر المتصفح في مجلد التنزيلات الافتراضي، ويمكنك معرفة/تغيير المكان من إعدادات التنزيلات في المتصفح.</p>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-extrabold text-sm text-neutral-900 dark:text-neutral-100">تقدّمك الكلي</h3>
              <p className="text-xs text-neutral-500 mt-0.5">من كل المحتوى المتاح</p>
            </div>
            <button
              onClick={() => void refresh()}
              className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex-shrink-0"
            >
              تحديث
            </button>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <p className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">{progress.percent}%</p>
            <div className="flex-1"><ProgressBar value={progress.percent} size="md" /></div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
              <p className="font-extrabold text-neutral-900 dark:text-white">{progress.completedEpisodes.toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-neutral-500">مكتملة</p>
            </div>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
              <p className="font-extrabold text-neutral-900 dark:text-white">{progress.startedEpisodes.toLocaleString('ar-EG')}</p>
              <p className="text-[10px] text-neutral-500">بدأتها</p>
            </div>
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-800/60 py-2">
              <p className="font-extrabold text-neutral-900 dark:text-white">{formatDuration(progress.listenedSeconds)}</p>
              <p className="text-[10px] text-neutral-500">زمن استماع</p>
            </div>
          </div>
          {progress.perHost.length > 0 && (
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              {progress.perHost.slice(0, 5).map((host) => (
                <div key={host.hostId}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    {host.slug ? (
                      <Link
                        to={`/hosts/${host.slug}`}
                        className="text-xs font-bold text-neutral-700 dark:text-neutral-300 hover:text-primary-600 truncate flex items-center gap-1"
                      >
                        {host.name} <ArrowRight size={11} />
                      </Link>
                    ) : (
                      <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate">{host.name}</span>
                    )}
                    <span className="text-[10px] text-neutral-500 flex-shrink-0">{host.percent}%</span>
                  </div>
                  <ProgressBar value={host.percent} size="sm" variant="success" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {(active.length > 0 || finished.length > 0) && (
        <p className="text-center text-xs text-neutral-400 mt-5 flex items-center justify-center gap-1">
          <Download size={13} /> كل التنزيلات محفوظة على جهازك وتشتغل حتى من غير إنترنت.
          <Clock size={13} className="mr-2" />
        </p>
      )}
    </Layout>
  );
}
