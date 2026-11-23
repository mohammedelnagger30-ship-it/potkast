import {
  createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase';
import type { Episode } from '@/types/podcast';
import {
  cacheAudioInServiceWorker, deleteDownload, downloadAudio, downloadAudioNative, hydrateLocalUrls,
  isDownloaded, listDownloads, localUrlFor, markSwCached, prefersServiceWorker, recordFromEpisode,
  saveDownloadMeta, storageInfo, type DownloadRecord,
} from '@/lib/downloads';
import { canUseNativeDownloads } from '@/lib/nativeDownload';

const MAX_CONCURRENT = 2;
const PAGE_SIZE = 1000;

interface DownloadContextValue {
  downloads: DownloadRecord[];
  active: DownloadRecord[];
  finished: DownloadRecord[];
  problems: DownloadRecord[];
  storage: { usage: number; quota: number };
  loading: boolean;
  busyPodcasts: string[];
  isDownloaded: (episodeId: string) => boolean;
  localUrl: (episodeId: string) => string;
  downloadEpisode: (episode: Episode, podcast?: { id: string; title: string } | null) => void;
  downloadPodcast: (podcastId: string) => Promise<void>;
  cancel: (id: string) => void;
  retry: (id: string) => void;
  remove: (id: string) => Promise<void>;
  clearFinished: () => Promise<void>;
  refreshStorage: () => Promise<void>;
}

const DownloadContext = createContext<DownloadContextValue | undefined>(undefined);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [storage, setStorage] = useState({ usage: 0, quota: 0 });
  const [loading, setLoading] = useState(true);
  const [busyPodcasts, setBusyPodcasts] = useState<string[]>([]);

  const recordsRef = useRef<DownloadRecord[]>([]);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const runningRef = useRef(0);
  const pumpRef = useRef<() => void>(() => {});

  const refreshStorage = useCallback(async () => {
    setStorage(await storageInfo());
  }, []);

  const patch = useCallback((id: string, changes: Partial<DownloadRecord>, persist = true) => {
    const current = recordsRef.current.find((r) => r.id === id);
    if (!current) return;
    const merged = { ...current, ...changes };
    recordsRef.current = recordsRef.current.map((r) => (r.id === id ? merged : r));
    setDownloads(recordsRef.current);
    if (persist) saveDownloadMeta(merged).catch(() => {});
  }, []);

  const run = useCallback(async (record: DownloadRecord) => {
    const controller = new AbortController();
    controllersRef.current.set(record.id, controller);
    patch(record.id, { status: 'downloading', progress: 0, error: undefined }, false);

    // On Android the system downloader streams to disk and keeps going in the
    // background. Browsers keep the existing fetch/IndexedDB path.
    const native = canUseNativeDownloads();
    const opaqueOnly = !native && prefersServiceWorker(record.audioUrl);
    let lastUi = 0;
    let lastPersist = 0;

    const report = (progress: number, loaded: number) => {
      const now = Date.now();
      const final = progress >= 1;
      // Network chunks arrive many times a second; repainting on each one was
      // the main reason long downloads felt frozen.
      if (!final && now - lastUi < 120) return;
      lastUi = now;
      const persist = final || now - lastPersist > 1500;
      if (persist) lastPersist = now;
      patch(record.id, { progress, size: loaded || record.size }, persist);
    };

    const saveOpaque = async () => {
      patch(record.id, { status: 'downloading', progress: 0.05, error: undefined }, false);
      await cacheAudioInServiceWorker(record.id, record.audioUrl);
      markSwCached(record.id);
      patch(record.id, {
        status: 'done', progress: 1, size: 0,
        mime: record.mime || 'audio/mpeg', error: undefined, storage: 'cache',
      }, true);
    };

    const runWeb = async () => {
      if (opaqueOnly) {
        await saveOpaque();
      } else {
        const done = await downloadAudio(record, report, controller.signal);
        patch(record.id, done, true);
      }
    };

    const fail = (error: unknown) => {
      const message = error instanceof Error ? error.message : 'تعذر إكمال التنزيل';
      patch(record.id, { status: 'error', error: message }, true);
    };

    try {
      if (native) {
        const done = await downloadAudioNative(record, report, controller.signal);
        patch(record.id, done, true);
      } else {
        await runWeb();
      }
    } catch (err) {
      if (controller.signal.aborted) {
        patch(record.id, { status: 'canceled', progress: 0 }, true);
      } else if (native) {
        // Native transfer failed — try the browser downloader, then opaque SW.
        try {
          const done = await downloadAudio(record, report, controller.signal);
          patch(record.id, done, true);
        } catch {
          try {
            await saveOpaque();
          } catch (fallbackError) {
            fail(fallbackError);
          }
        }
      } else {
        const raw = err instanceof Error ? err.message : 'تعذر إكمال التنزيل';
        const maybeCors = /failed to fetch|networkerror|load failed/i.test(raw);
        if (maybeCors) {
          try {
            await saveOpaque();
          } catch (fallbackError) {
            fail(fallbackError);
          }
        } else {
          fail(err);
        }
      }
    } finally {
      controllersRef.current.delete(record.id);
      runningRef.current = Math.max(0, runningRef.current - 1);
      void refreshStorage();
      pumpRef.current();
    }
  }, [patch, refreshStorage]);

  const pump = useCallback(() => {
    while (runningRef.current < MAX_CONCURRENT) {
      const next = recordsRef.current.find((r) => r.status === 'queued');
      if (!next) break;
      runningRef.current += 1;
      void run(next);
    }
  }, [run]);
  pumpRef.current = pump;

  // Restore files from previous sessions and resume anything that was interrupted.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await hydrateLocalUrls();
        const rows = await listDownloads();
        const restored = rows.map((r) => (
          r.status === 'downloading' || r.status === 'queued'
            ? { ...r, status: 'queued' as const, progress: 0, error: undefined }
            : r
        ));
        if (!alive) return;
        recordsRef.current = restored;
        setDownloads(restored);
      } catch {
        // IndexedDB unavailable (private mode): the rest of the app still works.
      } finally {
        if (alive) {
          setLoading(false);
          void refreshStorage();
          pumpRef.current();
        }
      }
    })();
    return () => { alive = false; };
  }, [refreshStorage]);

  const enqueue = useCallback((records: DownloadRecord[]) => {
    const existing = new Set(recordsRef.current.map((r) => r.id));
    const fresh = records.filter((r) => r.audioUrl && !existing.has(r.id));
    if (fresh.length === 0) return;
    recordsRef.current = [...fresh, ...recordsRef.current];
    setDownloads(recordsRef.current);
    fresh.forEach((r) => saveDownloadMeta(r).catch(() => {}));
    pumpRef.current();
  }, []);

  const downloadEpisode = useCallback((episode: Episode, podcast?: { id: string; title: string } | null) => {
    enqueue([recordFromEpisode(episode, podcast)]);
  }, [enqueue]);

  const downloadPodcast = useCallback(async (podcastId: string) => {
    if (busyPodcasts.includes(podcastId)) return;
    setBusyPodcasts((prev) => [...prev, podcastId]);
    try {
      const { data: pod } = await supabase
        .from('podcasts')
        .select('id, title')
        .eq('id', podcastId)
        .maybeSingle();
      if (!pod) return;

      const all: Episode[] = [];
      let offset = 0;
      while (true) {
        const { data, error } = await supabase
          .from('episodes')
          .select('*')
          .eq('podcast_id', podcastId)
          .order('published_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);
        if (error) throw error;
        const batch = (data || []) as Episode[];
        all.push(...batch);
        if (batch.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      enqueue(all.map((ep) => recordFromEpisode(ep, pod as { id: string; title: string })));
    } catch {
      // A failed fetch simply leaves the button usable again.
    } finally {
      setBusyPodcasts((prev) => prev.filter((id) => id !== podcastId));
    }
  }, [busyPodcasts, enqueue]);

  const cancel = useCallback((id: string) => {
    const controller = controllersRef.current.get(id);
    if (controller) {
      controller.abort();
    } else {
      patch(id, { status: 'canceled', progress: 0 });
    }
  }, [patch]);

  const retry = useCallback((id: string) => {
    const record = recordsRef.current.find((r) => r.id === id);
    if (!record) return;
    patch(id, { status: 'queued', progress: 0, error: undefined });
    pumpRef.current();
  }, [patch]);

  const remove = useCallback(async (id: string) => {
    controllersRef.current.get(id)?.abort();
    await deleteDownload(id);
    recordsRef.current = recordsRef.current.filter((r) => r.id !== id);
    setDownloads(recordsRef.current);
    void refreshStorage();
  }, [refreshStorage]);

  const clearFinished = useCallback(async () => {
    const done = recordsRef.current.filter((r) => r.status === 'done');
    for (const row of done) await deleteDownload(row.id);
    recordsRef.current = recordsRef.current.filter((r) => r.status !== 'done');
    setDownloads(recordsRef.current);
    void refreshStorage();
  }, [refreshStorage]);

  const active = downloads.filter((r) => r.status === 'queued' || r.status === 'downloading');
  const finished = downloads.filter((r) => r.status === 'done');
  const problems = downloads.filter((r) => r.status === 'error' || r.status === 'canceled');

  return (
    <DownloadContext.Provider
      value={{
        downloads, active, finished, problems, storage, loading, busyPodcasts,
        isDownloaded: (id) => isDownloaded(id) || recordsRef.current.some((r) => r.id === id && r.status === 'done'),
        localUrl: localUrlFor,
        downloadEpisode, downloadPodcast, cancel, retry, remove, clearFinished, refreshStorage,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDownload() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
}
