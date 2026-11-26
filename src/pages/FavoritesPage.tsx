import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Headphones, Play, Pause, Trash2 } from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card } from '@/components/ui';
import { DownloadButton } from '@/components/DownloadButton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { supabase } from '@/lib/supabase';
import { formatDuration, formatRelativeTime, type Episode, type Podcast } from '@/types/podcast';

interface FavoriteEpisodeRow {
  created_at: string;
  episode: (Episode & { podcast?: Podcast }) | null;
}

type MaybeRelation<T> = T | T[] | null | undefined;

function firstRelation<T>(value: MaybeRelation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  const { currentEpisode, isPlaying, togglePlay, playEpisode } = useAudioPlayer();
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [episodes, setEpisodes] = useState<FavoriteEpisodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setPodcasts([]); setEpisodes([]); setLoading(false); return; }
    setLoading(true);
    const [podRes, epRes] = await Promise.all([
      supabase.from('favorites').select('podcast_id, created_at, podcast:podcasts(*, category:categories(*), host:hosts(*))').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('episode_favorites').select('created_at, episode:episodes(*, podcast:podcasts(*, category:categories(*), host:hosts(*)))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(200),
    ]);
    const podcastRows = (podRes.data || []) as unknown as Array<{ podcast: MaybeRelation<Podcast> }>;
    setPodcasts(podcastRows.map((r) => firstRelation(r.podcast)).filter((p): p is Podcast => !!p));

    const episodeRows = (epRes.data || []) as unknown as Array<{
      created_at: string;
      episode: MaybeRelation<Episode & { podcast?: MaybeRelation<Podcast> }>;
    }>;
    setEpisodes(
      episodeRows.map((r) => {
        const episode = firstRelation(r.episode);
        if (!episode) return { created_at: r.created_at, episode: null };
        const podcast = firstRelation(episode.podcast) || undefined;
        return { created_at: r.created_at, episode: { ...episode, podcast } };
      })
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  const removePodcast = async (podcastId: string) => {
    if (!user) return;
    setPodcasts((prev) => prev.filter((p) => p.id !== podcastId));
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('podcast_id', podcastId);
  };

  const removeEpisode = async (episodeId: string) => {
    if (!user) return;
    setEpisodes((prev) => prev.filter((r) => r.episode?.id !== episodeId));
    await supabase.from('episode_favorites').delete().eq('user_id', user.id).eq('episode_id', episodeId);
  };

  return (
    <Layout title="المفضلة">
      <div className="mb-6">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">البودكاست والحلقات اللي حفظتها للرجوع لها.</p>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400">جارٍ التحميل...</div>
      ) : (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Heart size={18} className="text-error-500" />
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white">بودكاست مفضلة</h2>
              <span className="text-xs text-neutral-400">({podcasts.length})</span>
            </div>
            {podcasts.length === 0 ? (
              <Card className="text-sm text-neutral-500 dark:text-neutral-400">مافيش بودكاست في المفضلة.</Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {podcasts.map((p) => (
                  <Card key={p.id} className="flex items-center gap-3">
                    <Link to={`/podcasts/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      {p.cover_url ? <OptimizedImage src={p.cover_url} alt="" width={112} className="h-14 w-14 rounded-xl object-cover" /> : <div className="h-14 w-14 rounded-xl bg-primary-100 dark:bg-primary-900/30" />}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-neutral-900 dark:text-white">{p.title}</p>
                        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{p.host?.name_ar || p.host_name}</p>
                      </div>
                    </Link>
                    <button onClick={() => removePodcast(p.id)} aria-label="إزالة من المفضلة" className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-900/20">
                      <Trash2 size={16} />
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Headphones size={18} className="text-primary-600" />
              <h2 className="text-base font-extrabold text-neutral-900 dark:text-white">حلقات مفضلة</h2>
              <span className="text-xs text-neutral-400">({episodes.filter((r) => r.episode).length})</span>
            </div>
            {episodes.filter((r) => r.episode).length === 0 ? (
              <Card className="text-sm text-neutral-500 dark:text-neutral-400">مافيش حلقات في المفضلة.</Card>
            ) : (
              <div className="space-y-2">
                {episodes.filter((r): r is FavoriteEpisodeRow & { episode: Episode & { podcast?: Podcast } } => !!r.episode).map(({ episode: ep }) => {
                  const isCurrent = currentEpisode?.id === ep.id;
                  const playing = isCurrent && isPlaying;
                  return (
                    <Card key={ep.id} className="flex items-center gap-3">
                      <button
                        onClick={() => { if (isCurrent) togglePlay(); else playEpisode(ep, ep.podcast, [ep]); }}
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isCurrent ? 'bg-primary-600 text-white' : 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'}`}
                        aria-label={playing ? 'إيقاف' : 'تشغيل'}
                      >
                        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="mr-0.5" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <Link to={ep.podcast?.id ? `/podcasts/${ep.podcast.id}` : '#'} className="block truncate text-sm font-bold text-neutral-900 dark:text-white hover:text-primary-600">{ep.title}</Link>
                        <p className="truncate text-[11px] text-neutral-400">{ep.podcast?.title || ''}{ep.duration_seconds > 0 ? ` • ${formatDuration(ep.duration_seconds)}` : ''} • {formatRelativeTime(ep.published_at)}</p>
                      </div>
                      <DownloadButton episode={ep} podcast={ep.podcast} compact />
                      <button onClick={() => removeEpisode(ep.id)} aria-label="إزالة من المفضلة" className="rounded-lg p-2 text-neutral-400 hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-900/20">
                        <Trash2 size={16} />
                      </button>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </Layout>
  );
}
