import { supabase } from '@/lib/supabase';

export const PROGRESS_CHANGED_EVENT = 'nammy:progress-changed';

export function notifyProgressChanged() {
  window.dispatchEvent(new Event(PROGRESS_CHANGED_EVENT));
}

/** A listening row with the relations needed to work out per-host progress. */
export interface HistoryWithRelations {
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
  updated_at: string;
  episode?: {
    id: string;
    duration_seconds: number;
    podcast_id: string;
    podcast?: {
      id: string;
      title: string;
      host_id: string | null;
      host?: { id: string; name_ar: string; slug: string } | null;
    } | null;
  } | null;
}

export interface HostProgress {
  hostId: string;
  name: string;
  slug: string;
  totalEpisodes: number;
  completedEpisodes: number;
  startedEpisodes: number;
  listenedSeconds: number;
  /** completed episodes / host episodes (falls back to started episodes) */
  percent: number;
  /** listened time / duration of the episodes the user started */
  listenPercent: number;
}

export interface OverallProgress {
  totalEpisodes: number;
  completedEpisodes: number;
  startedEpisodes: number;
  listenedSeconds: number;
  percent: number;
  listenPercent: number;
  perHost: HostProgress[];
}

const pct = (part: number, whole: number) =>
  whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0;

interface Accumulator extends HostProgress {
  durationSeconds: number;
}

export function buildProgress(
  history: HistoryWithRelations[],
  totalsByHost: Record<string, number>,
  globalTotal: number
): OverallProgress {
  const accs = new Map<string, Accumulator>();

  for (const row of history) {
    const host = row.episode?.podcast?.host;
    if (!host?.id) continue;

    let acc = accs.get(host.id);
    if (!acc) {
      acc = {
        hostId: host.id,
        name: host.name_ar || 'مقدم',
        slug: host.slug || '',
        totalEpisodes: totalsByHost[host.id] || 0,
        completedEpisodes: 0,
        startedEpisodes: 0,
        listenedSeconds: 0,
        percent: 0,
        listenPercent: 0,
        durationSeconds: 0,
      };
      accs.set(host.id, acc);
    }

    const duration = row.episode?.duration_seconds || 0;
    const listened = Math.max(0, Math.min(row.progress_seconds || 0, duration || row.progress_seconds || 0));
    acc.startedEpisodes += 1;
    // Older clients saved the position but never wrote `completed`, so treat
    // reaching 90% as completion here too. The DB trigger keeps new writes
    // consistent; this makes cached/offline snapshots correct immediately.
    const reachedCompletion = duration > 0 && listened >= duration * 0.9;
    acc.completedEpisodes += row.completed || reachedCompletion ? 1 : 0;
    acc.listenedSeconds += listened;
    acc.durationSeconds += duration;
  }

  const perHost: HostProgress[] = [...accs.values()]
    .map(({ durationSeconds, ...rest }) => ({
      ...rest,
      percent: rest.totalEpisodes > 0
        ? pct(rest.completedEpisodes, rest.totalEpisodes)
        : pct(rest.completedEpisodes, rest.startedEpisodes),
      listenPercent: pct(rest.listenedSeconds, durationSeconds),
    }))
    .sort((a, b) => b.completedEpisodes - a.completedEpisodes || a.name.localeCompare(b.name, 'ar'));

  const completedEpisodes = perHost.reduce((sum, h) => sum + h.completedEpisodes, 0);
  const startedEpisodes = perHost.reduce((sum, h) => sum + h.startedEpisodes, 0);
  const listenedSeconds = perHost.reduce((sum, h) => sum + h.listenedSeconds, 0);
  const durationSeconds = [...accs.values()].reduce((sum, h) => sum + h.durationSeconds, 0);

  return {
    totalEpisodes: globalTotal,
    completedEpisodes,
    startedEpisodes,
    listenedSeconds,
    percent: globalTotal > 0 ? pct(completedEpisodes, globalTotal) : pct(completedEpisodes, startedEpisodes),
    listenPercent: pct(listenedSeconds, durationSeconds),
    perHost,
  };
}

export const emptyProgress: OverallProgress = {
  totalEpisodes: 0,
  completedEpisodes: 0,
  startedEpisodes: 0,
  listenedSeconds: 0,
  percent: 0,
  listenPercent: 0,
  perHost: [],
};

export function hostProgressFrom(history: HistoryWithRelations[], hostId: string, totalEpisodes: number): HostProgress {
  const built = buildProgress(history, { [hostId]: totalEpisodes }, totalEpisodes);
  return built.perHost.find((h) => h.hostId === hostId) || {
    hostId,
    name: '',
    slug: '',
    totalEpisodes,
    completedEpisodes: 0,
    startedEpisodes: 0,
    listenedSeconds: 0,
    percent: 0,
    listenPercent: 0,
  };
}

export async function fetchListeningHistory(userId: string): Promise<HistoryWithRelations[]> {
  const { data, error } = await supabase
    .from('listening_history')
    .select(
      'episode_id, progress_seconds, completed, updated_at, ' +
      'episode:episodes(id, duration_seconds, podcast_id, ' +
      'podcast:podcasts(id, title, host_id, host:hosts(id, name_ar, slug)))'
    )
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []) as unknown as HistoryWithRelations[];
}

/** One or two paged requests give the episode count of every podcast and of the whole catalog. */
export async function fetchCatalogTotals(): Promise<{ byHost: Record<string, number>; global: number }> {
  const byHost: Record<string, number> = {};
  let global = 0;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('podcasts')
      .select('id, host_id, episodes(count)')
      .range(offset, offset + 999);

    if (error) throw error;
    const rows = (data || []) as unknown as { id: string; host_id: string | null; episodes?: { count: number }[] }[];
    for (const row of rows) {
      const count = row.episodes?.[0]?.count || 0;
      global += count;
      if (row.host_id) byHost[row.host_id] = (byHost[row.host_id] || 0) + count;
    }
    if (rows.length < 1000) break;
    offset += 1000;
  }

  return { byHost, global };
}
