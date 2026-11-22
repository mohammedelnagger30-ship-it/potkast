import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

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
  /** blob = readable file in IndexedDB, cache = opaque response in the SW cache */
  storage?: 'blob' | 'cache';
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

/** Create blob URLs for files that survived a previous app session. */
export async function hydrateLocalUrls(): Promise<void> {
  try {
    const db = await getDb();
    const files = await db.getAll('files');
    for (const file of files) {
      if (!localUrls.has(file.id)) localUrls.set(file.id, URL.createObjectURL(file.blob));
    }
    const metas = await db.getAll('meta');
    for (const meta of metas) {
      if (meta.storage === 'cache' && meta.status === 'done') swCached.add(meta.id);
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
  const url = localUrls.get(episodeId);
  if (url) URL.revokeObjectURL(url);
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

/** Stream a real episode audio file into IndexedDB. */
export async function downloadAudio(
  record: DownloadRecord,
  onProgress: (progress: number, loaded: number, total: number) => void,
  signal: AbortSignal
): Promise<DownloadRecord> {
  const response = await fetch(record.audioUrl, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error(`فشل التنزيل (${response.status})`);

  const total = Number(response.headers.get('content-length') || 0);
  const mime = response.headers.get('content-type')?.split(';')[0] || record.mime || 'audio/mpeg';
  let blob: Blob;

  if (response.body) {
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
    blob = new Blob(chunks as BlobPart[], { type: mime });
  } else {
    const buffer = await response.arrayBuffer();
    blob = new Blob([buffer], { type: mime });
    onProgress(1, buffer.byteLength, buffer.byteLength);
  }

  const db = await getDb();
  const previousUrl = localUrls.get(record.id);
  if (previousUrl) URL.revokeObjectURL(previousUrl);
  await db.put('files', { id: record.id, blob, mime, createdAt: Date.now() });
  localUrls.set(record.id, URL.createObjectURL(blob));

  const done: DownloadRecord = {
    ...record,
    status: 'done',
    progress: 1,
    size: blob.size,
    mime,
    error: undefined,
    storage: 'blob',
  };
  await db.put('meta', done);
  notifyDownloadsChanged();
  return done;
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
