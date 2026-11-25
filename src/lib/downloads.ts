import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  cancelNativeDownload, deleteNativeDownload, getNativeDownloadStatus,
  localSourceForNativeUri, startNativeDownload,
} from './nativeDownload';

export type DownloadStatus = 'queued' | 'downloading' | 'done' | 'error' | 'canceled';

export interface DownloadRecord {
  id: string;
  episodeId: string;
  podcastId: string;
  episodeTitle: string;
  podcastTitle: string;
  audioUrl: string;
  durationSeconds: number;
  mime: string;
  size: number;
  progress: number;
  status: DownloadStatus;
  error?: string;
  createdAt: number;
  /** blob = IndexedDB, cache = opaque SW response, native = Android DownloadManager file */
  storage?: 'blob' | 'cache' | 'native';
  nativeId?: number;
  nativeUri?: string;
}

interface StoredFile {
  id: string;
  blob: Blob;
  mime: string;
  createdAt: number;
}

interface NammyOfflineDB extends DBSchema {
  files: { key: string; value: StoredFile };
  meta: { key: string; value: DownloadRecord };
}

const DB_NAME = 'nammy-offline';
const DB_VERSION = 1;
const DOWNLOADS_EVENT = 'nammy:downloads-changed';

let dbPromise: Promise<IDBPDatabase<NammyOfflineDB>> | null = null;
const localUrls = new Map<string, string>();
const swCached = new Set<string>();

export const OFFLINE_AUDIO_PREFIX = '/__offline_audio__/';

/** CDNs that never send CORS headers — go straight to the service worker cache. */
const OPAQUE_ONLY_HOSTS = [
  'anchor.fm',
  'sphinx.acast.com',
  'api.hosting.thmanyah.com',
  'mixfm-sa.com',
];

export function prefersServiceWorker(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return OPAQUE_ONLY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<NammyOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export function subscribeDownloads(callback: () => void): () => void {
  window.addEventListener(DOWNLOADS_EVENT, callback);
  return () => window.removeEventListener(DOWNLOADS_EVENT, callback);
}

export function notifyDownloadsChanged() {
  window.dispatchEvent(new Event(DOWNLOADS_EVENT));
}

export function localUrlFor(episodeId: string): string {
  return localUrls.get(episodeId) || (swCached.has(episodeId) ? `${OFFLINE_AUDIO_PREFIX}${episodeId}` : '');
}

export function isDownloaded(episodeId: string): boolean {
  return localUrls.has(episodeId) || swCached.has(episodeId);
}

/** Remember a native file path so playback resolves instantly, even after a restart. */
export function registerNativeFile(episodeId: string, uri: string): string {
  const source = localSourceForNativeUri(uri);
  if (source) localUrls.set(episodeId, source);
  return source;
}

/** Mark a file kept as an opaque response in the service worker cache. */
export function markSwCached(episodeId: string) {
  swCached.add(episodeId);
}

/** Ask the service worker to drop a cached audio response. */
export function clearSwAudio(episodeId: string) {
  navigator.serviceWorker?.controller?.postMessage({ type: 'delete-audio', episodeId });
}

/** Fallback for CDNs without CORS: the SW fetches no-cors and keeps an opaque response. */
export function cacheAudioInServiceWorker(episodeId: string, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const sw = navigator.serviceWorker?.controller;
    if (!sw) {
      reject(new Error('عامل الخدمة غير جاهز بعد — أعد فتح الصفحة'));
      return;
    }
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data?.ok) resolve();
      else reject(new Error(event.data?.error || 'فشل حفظ الملف'));
    };
    sw.postMessage({ type: 'cache-audio', episodeId, url }, [channel.port2]);
  });
}

/** Restore playback URLs without loading every saved file into memory. */
export async function hydrateLocalUrls(): Promise<void> {
  try {
    const db = await getDb();
    const metas = await db.getAll('meta');
    const blobIds = new Set<string>();

    for (const meta of metas) {
      if (meta.status !== 'done') continue;
      if (meta.storage === 'native' && meta.nativeUri) {
        registerNativeFile(meta.episodeId, meta.nativeUri);
      } else if (meta.storage === 'cache') {
        swCached.add(meta.episodeId);
      } else {
        blobIds.add(meta.id);
      }
    }

    // Old blob downloads still need an object URL, but native files never do.
    if (blobIds.size) {
      const files = await db.getAll('files');
      for (const file of files) {
        if (blobIds.has(file.id) && !localUrls.has(file.id)) {
          localUrls.set(file.id, URL.createObjectURL(file.blob));
        }
      }
    }
  } catch {
    // IndexedDB can be unavailable in private browsing; downloads stay disabled.
  }
}

export async function listDownloads(): Promise<DownloadRecord[]> {
  const db = await getDb();
  const rows = await db.getAll('meta');
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveDownloadMeta(record: DownloadRecord): Promise<void> {
  const db = await getDb();
  await db.put('meta', record);
  notifyDownloadsChanged();
}

export async function deleteDownload(episodeId: string): Promise<void> {
  const db = await getDb();
  await db.delete('meta', episodeId);
  await db.delete('files', episodeId);
  void deleteNativeDownload(episodeId).catch(() => undefined);
  const url = localUrls.get(episodeId);
  if (url && !url.startsWith(OFFLINE_AUDIO_PREFIX) && !url.includes('/_capacitor_')) {
    URL.revokeObjectURL(url);
  }
  localUrls.delete(episodeId);
  swCached.delete(episodeId);
  clearSwAudio(episodeId);
  notifyDownloadsChanged();
}

export async function clearFinishedDownloads(): Promise<void> {
  const rows = await listDownloads();
  for (const row of rows) {
    if (row.status === 'done') await deleteDownload(row.id);
  }
}

export async function storageInfo(): Promise<{ usage: number; quota: number }> {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 };
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

export function downloadLocationLabel(record: DownloadRecord): string {
  if (record.storage === 'native') return 'ملف محفوظ على جهازك (إدارة ملفات/التنزيلات حسب النظام)';
  return 'محفوظ داخل التطبيق في المتصفح لهذا الجهاز (بدون إنترنت)';
}

export async function saveDownloadedFile(record: DownloadRecord): Promise<'saved' | 'unsupported'> {
  if (record.storage === 'native' && record.nativeUri) {
    // Native files are already on device; caller can show location.
    return 'unsupported';
  }
  const db = await getDb();
  const file = await db.get('files', record.id);
  let blob = file?.blob;
  if (!blob && record.storage === 'cache' && 'caches' in window) {
    const cache = await window.caches.open(SW_CACHE);
    const response = await cache.match(swCacheKey(record.audioUrl));
    if (response) blob = await response.blob();
  }
  if (!blob) return 'unsupported';
  const ext = (blob.type || record.mime || 'audio/mpeg').includes('mpeg') ? 'mp3' : (blob.type.split('/')[1] || 'audio');
  const safe = (record.episodeTitle || 'episode').replace(/[\/:*?"<>|]+/g, '-').slice(0, 80);
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url;
  a.download = `${safe}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'saved';
}

const RANGE_CHUNK = 4 * 1024 * 1024;
const RANGE_WORKERS = 5;
const RANGE_UNSUPPORTED = 'RANGE_UNSUPPORTED';

type ProgressFn = (progress: number, loaded: number, total: number) => void;

async function probeByteRanges(url: string, signal: AbortSignal) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (signal.aborted) controller.abort();
  else signal.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetch(url, {
      headers: { Range: 'bytes=0-0' },
      signal: controller.signal,
      credentials: 'omit',
    });
    if (response.status !== 206) {
      // The server ignored Range; cancel the body so we do not waste bandwidth.
      void response.body?.cancel().catch(() => undefined);
      return null;
    }
    const total = Number((response.headers.get('content-range') || '').split('/').pop() || 0);
    const mime = response.headers.get('content-type')?.split(';')[0] || '';
    void response.body?.cancel().catch(() => undefined);
    return Number.isFinite(total) && total > 1 ? { total, mime } : null;
  } catch (error) {
    if (signal.aborted) throw error;
    return null;
  } finally {
    signal.removeEventListener('abort', forwardAbort);
  }
}

async function downloadSingle(
  record: DownloadRecord,
  onProgress: ProgressFn,
  signal: AbortSignal,
  mimeHint: string,
) {
  const response = await fetch(record.audioUrl, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`فشل التنزيل (${response.status})`);

  const total = Number(response.headers.get('content-length') || 0);
  const mime = response.headers.get('content-type')?.split(';')[0] || mimeHint || 'audio/mpeg';

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress(1, buffer.byteLength, buffer.byteLength || total);
    return { blob: new Blob([buffer], { type: mime }), mime, total: buffer.byteLength || total };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(total ? Math.min(1, loaded / total) : 0, loaded, total);
  }
  return { blob: new Blob(chunks as BlobPart[], { type: mime }), mime, total: loaded || total };
}

/** Download a real episode in parallel byte ranges when the host allows it. */
export async function downloadAudio(
  record: DownloadRecord,
  onProgress: ProgressFn,
  signal: AbortSignal
): Promise<DownloadRecord> {
  const probe = await probeByteRanges(record.audioUrl, signal);
  let blob: Blob | null = null;
  let total = probe?.total || 0;
  let mime = probe?.mime || record.mime || 'audio/mpeg';

  if (probe) {
    const count = Math.ceil(probe.total / RANGE_CHUNK);
    const parts = new Array<ArrayBuffer>(count);
    let next = 0;
    let loaded = 0;

    try {
      await Promise.all(
        Array.from({ length: Math.min(RANGE_WORKERS, count) }, async () => {
          while (true) {
            const index = next++;
            if (index >= count) return;
            const start = index * RANGE_CHUNK;
            const end = Math.min(start + RANGE_CHUNK, probe.total) - 1;
            const response = await fetch(record.audioUrl, {
              headers: { Range: `bytes=${start}-${end}` },
              signal,
              credentials: 'omit',
            });
            if (response.status !== 206) throw new Error(RANGE_UNSUPPORTED);
            const buffer = await response.arrayBuffer();
            parts[index] = buffer;
            loaded += buffer.byteLength;
            onProgress(Math.min(1, loaded / probe.total), loaded, probe.total);
          }
        }),
      );
      blob = new Blob(parts as BlobPart[], { type: mime });
    } catch (error) {
      if (signal.aborted) throw error;
      if (!(error instanceof Error) || error.message !== RANGE_UNSUPPORTED) throw error;
      // Server changed its mind mid-transfer — fall back to one normal stream.
    }
  }

  if (!blob) {
    const single = await downloadSingle(record, onProgress, signal, mime);
    blob = single.blob;
    mime = single.mime;
    total = single.total;
  }

  const db = await getDb();
  const previousUrl = localUrls.get(record.id);
  if (previousUrl && !previousUrl.includes('/_capacitor_')) URL.revokeObjectURL(previousUrl);
  await db.put('files', { id: record.id, blob, mime, createdAt: Date.now() });
  localUrls.set(record.id, URL.createObjectURL(blob));

  const done: DownloadRecord = {
    ...record,
    status: 'done',
    progress: 1,
    size: blob.size || total,
    mime,
    error: undefined,
    storage: 'blob',
  };
  await db.put('meta', done);
  notifyDownloadsChanged();
  return done;
}

/** Android path: DownloadManager streams to disk and survives backgrounding. */
export async function downloadAudioNative(
  record: DownloadRecord,
  onProgress: ProgressFn,
  signal: AbortSignal
): Promise<DownloadRecord> {
  const started = await startNativeDownload({
    url: record.audioUrl,
    episodeId: record.id,
    title: record.episodeTitle,
  });

  const finish = (uri: string, total: number): DownloadRecord => {
    const source = registerNativeFile(record.id, uri);
    const done: DownloadRecord = {
      ...record,
      status: 'done',
      progress: 1,
      size: total || record.size,
      mime: record.mime || 'audio/mpeg',
      nativeId: started.id > 0 ? started.id : undefined,
      nativeUri: uri,
      error: undefined,
      storage: 'native',
    };
    if (!source) throw new Error('تعذر فتح الملف المحمّل');
    return done;
  };

  if (started.status === 'SUCCESSFUL' && started.uri) {
    return finish(started.uri, started.total || record.size);
  }

  return new Promise<DownloadRecord>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.clearInterval(timer);
      signal.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      void cancelNativeDownload(started.id, record.id).catch(() => undefined);
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('canceled'));
      }
    };

    const poll = async () => {
      if (settled) return;
      try {
        const state = await getNativeDownloadStatus(started.id, record.id);
        if (settled) return;
        if (signal.aborted) {
          onAbort();
          return;
        }
        const knownTotal = state.total || started.total || 0;
        const progress = knownTotal > 0
          ? Math.min(1, (state.bytes || 0) / knownTotal)
          : state.status === 'SUCCESSFUL' ? 1 : 0.02;
        onProgress(progress, state.bytes || 0, knownTotal);

        if (state.status === 'SUCCESSFUL') {
          if (!state.uri) throw new Error('فشل التنزيل — الملف غير متاح');
          const done = finish(state.uri, knownTotal);
          const db = await getDb();
          await db.put('meta', done);
          notifyDownloadsChanged();
          settled = true;
          cleanup();
          resolve(done);
        } else if (state.status === 'FAILED') {
          throw new Error('تعذر تنزيل الملف على الجهاز — جرّب مرة تانية');
        }
      } catch (error) {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
    };

    const timer = window.setInterval(() => { void poll(); }, 450);
    signal.addEventListener('abort', onAbort, { once: true });
    void poll();
  });
}

export function recordFromEpisode(
  episode: { id: string; title: string; audio_url: string; duration_seconds: number },
  podcast?: { id: string; title: string } | null
): DownloadRecord {
  return {
    id: episode.id,
    episodeId: episode.id,
    podcastId: podcast?.id || '',
    episodeTitle: episode.title,
    podcastTitle: podcast?.title || '',
    audioUrl: episode.audio_url,
    durationSeconds: episode.duration_seconds || 0,
    mime: 'audio/mpeg',
    size: 0,
    progress: 0,
    status: 'queued',
    createdAt: Date.now(),
  };
}
