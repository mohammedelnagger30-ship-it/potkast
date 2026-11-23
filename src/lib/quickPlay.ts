import type { Episode } from '@/types/podcast';

/**
 * Instant-play index.
 *
 * `public/first-episodes.json` is generated from the real catalog by
 * `scripts/build-quickplay-index.mjs`. It holds the newest playable episode of
 * each podcast so a play button never has to await Supabase before calling
 * `audio.play()`. A copy is kept in localStorage for offline/cold starts.
 */
const CACHE_KEY = 'sada:quickplay-index';
const META_KEY = 'sada:quickplay-meta';
const INDEX_URL = '/first-episodes.json';

type IndexRow = Pick<
  Episode,
  'id' | 'podcast_id' | 'title' | 'audio_url' | 'duration_seconds'
>;

interface IndexPayload {
  rows: Record<string, IndexRow>;
  count: number;
}

const quickEpisodes = new Map<string, Episode>();
let loadedFromCache = false;
let loadPromise: Promise<void> | null = null;

function seed(rows: Record<string, IndexRow>) {
  for (const [podcastId, row] of Object.entries(rows)) {
    if (!row?.audio_url) continue;
    quickEpisodes.set(podcastId, {
      description: '',
      plays_count: 0,
      ...row,
      podcast_id: podcastId,
    } as Episode);
  }
}

/** Parse the saved copy only when the idle loader runs, never before first paint. */
function seedFromCache(): void {
  if (loadedFromCache) return;
  loadedFromCache = true;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) seed(JSON.parse(raw) as Record<string, IndexRow>);
  } catch {
    // Ignore a blocked or corrupted cache — the network index still loads.
  }
}

export function quickEpisodeFor(podcastId: string): Episode | undefined {
  return quickEpisodes.get(podcastId);
}

export function rememberEpisodes(podcastId: string, episodes: Episode[]) {
  const first = episodes.find((ep) => ep.audio_url);
  if (!first) return;
  quickEpisodes.set(podcastId, first);
}

export function loadQuickPlayIndex(): Promise<void> {
  if (loadPromise) return loadPromise;
  seedFromCache();
  loadPromise = fetch(INDEX_URL)
    .then((res) => (res.ok ? res.json() as Promise<Record<string, IndexRow>> : Promise.reject(new Error('index'))))
    .then((rows) => {
      seed(rows);
      // Avoid re-parsing/rewriting a 300KB snapshot on every single cold start.
      const count = Object.keys(rows).length;
      let savedCount = 0;
      try {
        savedCount = Number(localStorage.getItem(META_KEY) || 0) || 0;
      } catch {
        // Storage may be blocked.
      }
      if (savedCount !== count) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
          localStorage.setItem(META_KEY, String(count));
        } catch {
          // Storage quota is optional; the in-memory index is already populated.
        }
      }
    })
    .catch(() => undefined);
  return loadPromise;
}
