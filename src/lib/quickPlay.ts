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
const INDEX_URL = '/first-episodes.json';

type IndexRow = Pick<
  Episode,
  'id' | 'podcast_id' | 'title' | 'audio_url' | 'duration_seconds' | 'published_at'
>;

const quickEpisodes = new Map<string, Episode>();
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

try {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) seed(JSON.parse(cached) as Record<string, IndexRow>);
} catch {
  // Ignore a blocked or corrupted cache — the network index still loads.
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
  loadPromise = fetch(INDEX_URL)
    .then((res) => (res.ok ? res.json() as Promise<Record<string, IndexRow>> : Promise.reject(new Error('index'))))
    .then((rows) => {
      seed(rows);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
      } catch {
        // Storage quota is optional; the in-memory index is already populated.
      }
    })
    .catch(() => undefined);
  return loadPromise;
}
