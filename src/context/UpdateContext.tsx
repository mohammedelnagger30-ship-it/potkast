import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuth } from './AuthContext';
import { ApkUpdate, isNativeUpdateSupported, type ApkProgress } from '@/lib/apkUpdate';
import {
  BUNDLED_VERSION, UPDATE_CHECK_INTERVAL_MS, compareVersions,
  fetchLatestRelease, fetchRecentReleases, getCurrentVersion, isNewer,
  readDismissedVersion, readNotifiedVersion, readUpdateCache,
  writeDismissedVersion, writeNotifiedVersion, writeUpdateCache,
  type AppRelease,
} from '@/lib/appUpdate';
import { createNotification, showLocalNotification } from '@/lib/notifications';

type DownloadStatus = 'idle' | 'starting' | 'downloading' | 'ready' | 'installing' | 'error';

interface DownloadState {
  status: DownloadStatus;
  progress: number;
  bytes: number;
  total: number;
  error: string | null;
  downloadId: number | null;
  webUrl: string | null;
}

interface UpdateContextValue {
  currentVersion: string;
  latest: AppRelease | null;
  recent: AppRelease[];
  available: boolean;
  checking: boolean;
  lastCheckedAt: number | null;
  error: string | null;
  dismissed: boolean;
  download: DownloadState;
  checkForUpdates: (force?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  startDownload: () => Promise<void>;
  installUpdate: () => Promise<void>;
  cancelDownload: () => Promise<void>;
}

const emptyDownload: DownloadState = {
  status: 'idle',
  progress: 0,
  bytes: 0,
  total: 0,
  error: null,
  downloadId: null,
  webUrl: null,
};

const UpdateContext = createContext<UpdateContextValue | undefined>(undefined);

const initialCache = readUpdateCache();

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userIdRef = useRef<string | null>(user?.id || null);
  const currentVersionRef = useRef(BUNDLED_VERSION);
  const checkingRef = useRef(false);
  const pollRef = useRef<number | null>(null);

  const [currentVersion, setCurrentVersion] = useState(BUNDLED_VERSION);
  const [latest, setLatest] = useState<AppRelease | null>(initialCache?.latest || null);
  const [recent, setRecent] = useState<AppRelease[]>(initialCache?.recent || []);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(initialCache?.checkedAt || null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(() => readDismissedVersion());
  const [download, setDownload] = useState<DownloadState>(emptyDownload);

  useEffect(() => { userIdRef.current = user?.id || null; }, [user]);

  useEffect(() => {
    let cancelled = false;
    void getCurrentVersion().then((version) => {
      if (cancelled) return;
      currentVersionRef.current = version;
      setCurrentVersion(version);
    });
    return () => { cancelled = true; };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const checkForUpdates = useCallback(async (force = false) => {
    if (checkingRef.current) return;
    if (!force && lastCheckedAt && Date.now() - lastCheckedAt < UPDATE_CHECK_INTERVAL_MS) return;

    checkingRef.current = true;
    setChecking(true);
    setError(null);
    try {
      const [release, history] = await Promise.all([
        fetchLatestRelease(),
        fetchRecentReleases().catch(() => []),
      ]);
      setLatest(release);
      setRecent(history.length ? history : [release]);
      const checkedAt = Date.now();
      setLastCheckedAt(checkedAt);
      writeUpdateCache({ latest: release, recent: history.length ? history : [release], checkedAt });

      if (isNewer(release.version, currentVersionRef.current) && release.apkUrl) {
        if (readNotifiedVersion() !== release.version) {
          writeNotifiedVersion(release.version);
          showLocalNotification(
            'نسخة جديدة من Sada',
            `توفرت النسخة ${release.version} — افتح التطبيق عشان تعمل تحديث.`,
          );
          const userId = userIdRef.current;
          if (userId) {
            void createNotification(
              userId,
              'app_update',
              'نسخة جديدة من Sada',
              `توفرت النسخة ${release.version}. اضغط هنا عشان تنزّل التحديث.`,
              '/updates',
            ).catch(() => {});
          }
        }
      }
    } catch {
      setError('تعذّر الوصول لخادم التحديثات. هاتحاول تاني بعدين.');
    } finally {
      checkingRef.current = false;
      setChecking(false);
    }
  }, [lastCheckedAt]);

  useEffect(() => {
    // GitHub is not on the critical path of opening the app. Wait for real idle
    // time so the release check cannot steal bandwidth from the first screen.
    let cancelled = false;
    const run = () => { if (!cancelled) void checkForUpdates(false); };
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (typeof win.requestIdleCallback === 'function') {
      const idleId = win.requestIdleCallback(run, { timeout: 6000 });
      return () => {
        cancelled = true;
        win.cancelIdleCallback?.(idleId);
      };
    }

    const timer = window.setTimeout(run, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [checkForUpdates]);

  useEffect(() => {
    const timer = window.setInterval(() => { void checkForUpdates(false); }, UPDATE_CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void checkForUpdates(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkForUpdates]);

  const pollProgress = useCallback(async (downloadId: number) => {
    try {
      const progress: ApkProgress = await ApkUpdate.getProgress({ downloadId });
      const total = progress.total || 0;
      const bytes = progress.bytes || 0;
      if (progress.status === 'FAILED') {
        stopPolling();
        setDownload((prev) => ({
          ...prev,
          status: 'error',
          error: 'التنزيل فشل. تأكد من الاتصال بالإنترنت وجرب تاني.',
        }));
        return;
      }
      if (progress.status === 'SUCCESSFUL') {
        stopPolling();
        setDownload((prev) => ({
          ...prev,
          status: 'ready',
          progress: 100,
          bytes: total || bytes,
          total: total || bytes,
          error: null,
        }));
        return;
      }
      if (progress.status === 'MISSING') {
        stopPolling();
        setDownload((prev) => ({ ...prev, status: 'error', error: 'ملف التحديث مش متاح دلوقتي.' }));
        return;
      }
      setDownload((prev) => ({
        ...prev,
        status: 'downloading',
        bytes,
        total,
        progress: total > 0 ? Math.min(100, Math.round((bytes / total) * 100)) : prev.progress,
        error: null,
      }));
    } catch {
      // A transient bridge failure should not kill the download; keep polling.
    }
  }, [stopPolling]);

  useEffect(() => {
    if (!isNativeUpdateSupported()) return;
    let handle: PluginListenerHandle | undefined;
    void ApkUpdate.addListener('downloadComplete', ({ downloadId }) => {
      stopPolling();
      setDownload((prev) => (
        prev.downloadId === downloadId
          ? { ...prev, status: 'ready', progress: 100, error: null }
          : prev
      ));
    }).then((listener) => { handle = listener; }).catch(() => {});
    return () => { void handle?.remove(); };
  }, [stopPolling]);

  const startDownload = useCallback(async () => {
    if (!latest?.apkUrl) {
      setDownload({ ...emptyDownload, status: 'error', error: 'ما لقيناش ملف تحديث في الإصدار ده.' });
      return;
    }
    setDownload({
      ...emptyDownload,
      status: 'starting',
      total: latest.apkSize || 0,
    });

    try {
      if (isNativeUpdateSupported()) {
        const { downloadId } = await ApkUpdate.startDownload({
          url: latest.apkUrl,
          fileName: latest.apkName || 'sada-update.apk',
        });
        setDownload((prev) => ({ ...prev, status: 'downloading', downloadId }));
        stopPolling();
        void pollProgress(downloadId);
        pollRef.current = window.setInterval(() => { void pollProgress(downloadId); }, 800);
        return;
      }

      // Browser / PWA fallback. GitHub release downloads do not send CORS
      // headers, so a fetch() stream cannot read them. A normal link click is
      // not subject to CORS and lets the browser save the APK instead.
      const link = document.createElement('a');
      link.href = latest.apkUrl;
      link.download = latest.apkName || 'sada-update.apk';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setDownload((prev) => ({
        ...prev,
        status: 'ready',
        progress: 100,
        bytes: latest.apkSize || 0,
        total: latest.apkSize || 0,
        webUrl: latest.apkUrl,
      }));
    } catch {
      setDownload((prev) => ({
        ...prev,
        status: 'error',
        error: 'ما قدرناش نحمّل التحديث. جرب تاني بعدين.',
      }));
    }
  }, [latest, pollProgress, stopPolling]);

  const installUpdate = useCallback(async () => {
    if (download.status !== 'ready') return;
    try {
      if (isNativeUpdateSupported() && download.downloadId) {
        const { canInstall } = await ApkUpdate.canInstall();
        if (!canInstall) {
          await ApkUpdate.requestInstallPermission();
          setDownload((prev) => ({
            ...prev,
            error: 'فعّل السماح بتثبيت التطبيقات من مصادر خارجية عشان تكمل التحديث.',
          }));
          return;
        }
        setDownload((prev) => ({ ...prev, status: 'installing', error: null }));
        await ApkUpdate.install({ downloadId: download.downloadId });
        setDownload((prev) => ({ ...prev, status: 'ready' }));
        return;
      }
      if (download.webUrl) {
        const link = document.createElement('a');
        link.href = download.webUrl;
        link.download = latest?.apkName || 'sada-update.apk';
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch {
      setDownload((prev) => ({
        ...prev,
        status: 'ready',
        error: 'ما قدرناش نفتح المثبّت. حمّل الملف من مجلد التنزيلات وثبّته يدوياً.',
      }));
    }
  }, [download, latest]);

  const cancelDownload = useCallback(async () => {
    stopPolling();
    if (isNativeUpdateSupported() && download.downloadId) {
      try { await ApkUpdate.cancelDownload({ downloadId: download.downloadId }); } catch { /* ignore */ }
    }
    setDownload(emptyDownload);
  }, [download, stopPolling]);

  const dismissUpdate = useCallback(() => {
    const version = latest?.version || null;
    setDismissedVersion(version);
    writeDismissedVersion(version);
  }, [latest]);

  const available = !!latest && !!latest.apkUrl && isNewer(latest.version, currentVersion);
  const dismissed = !!dismissedVersion && !!latest && compareVersions(dismissedVersion, latest.version) >= 0;

  return (
    <UpdateContext.Provider value={{
      currentVersion,
      latest,
      recent,
      available,
      checking,
      lastCheckedAt,
      error,
      dismissed,
      download,
      checkForUpdates,
      dismissUpdate,
      startDownload,
      installUpdate,
      cancelDownload,
    }}>
      {children}
    </UpdateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUpdate() {
  const ctx = useContext(UpdateContext);
  if (!ctx) throw new Error('useUpdate must be used within UpdateProvider');
  return ctx;
}
