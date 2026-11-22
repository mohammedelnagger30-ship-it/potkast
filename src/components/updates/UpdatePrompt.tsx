import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Sparkles, X } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { useUpdate } from '@/context/UpdateContext';
import { formatBytes, formatReleaseDate, formatReleaseNotes } from '@/lib/appUpdate';

export function UpdatePrompt() {
  const { latest, available, dismissed, download, dismissUpdate, startDownload } = useUpdate();
  const [closedVersion, setClosedVersion] = useState<string | null>(null);

  const close = () => {
    setClosedVersion(latest?.version || null);
    dismissUpdate();
  };

  if (!available || !latest || dismissed || closedVersion === latest.version) return null;
  if (download.status !== 'idle') return null;

  const notes = formatReleaseNotes(latest.notes).slice(0, 5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in"
      onClick={close}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl p-6 animate-scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <h3 className="mt-4 text-lg font-extrabold text-neutral-900 dark:text-white">
          نسخة جديدة من Sada
        </h3>
        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          <Badge variant="primary" size="sm">v{latest.version}</Badge>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {formatReleaseDate(latest.publishedAt)}
            {latest.apkSize ? ` · ${formatBytes(latest.apkSize)}` : ''}
          </span>
        </div>

        {notes.length > 0 && (
          <div className="mt-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 p-3 space-y-1">
            {notes.map((line, index) => (
              <p key={`${index}-${line}`} className="text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">
                {line}
              </p>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 flex-wrap">
          <Button size="sm" onClick={() => void startDownload()} leftIcon={<Download size={15} />}>
            تنزيل التحديث الآن
          </Button>
          <Link
            to="/updates"
            onClick={close}
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline px-2"
          >
            التفاصيل
          </Link>
          <button
            type="button"
            onClick={dismissUpdate}
            className="mr-auto text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            لاحقاً
          </button>
        </div>
      </div>
    </div>
  );
}
