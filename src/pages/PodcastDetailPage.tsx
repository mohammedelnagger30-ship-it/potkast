import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  Heart,
  Clock,
  Mic,
  ChevronLeft,
  CheckCircle2,
  Bookmark,
  StickyNote,
  Trash2,
  ChevronDown,
  BadgeCheck,
  Headphones,
  Star,
  BookOpen,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { DownloadButton, DownloadPodcastButton } from '@/components/DownloadButton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { hostPhotoUrl } from '@/lib/hostPhotos';
import { supabase } from '@/lib/supabase';
import type { Podcast, Episode, ListeningHistory } from '@/types/podcast';
import type { EpisodeBookmark, EpisodeNote } from '@/types/features';
import {
  typeLabels,
  levelLabels,
  formatDuration,
  formatRelativeTime,
  formatCount,
} from '@/types/podcast';

const EPISODES_PER_PAGE = 40;

// A small LRU of podcast pages makes revisits instant and keeps the last opened
// shows readable offline. Only the first batch is stored, never the whole show.
const DETAIL_CACHE_KEY = 'sada:podcast-detail-cache';
const DETAIL_CACHE_LIMIT = 20;
const DETAIL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedDetail {
  podcast: Podcast;
  episodes: Episode[];
  at: number;
}

function readDetailCache(id: string): CachedDetail | null {
  try {
    const all = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || '{}') as Record<string, CachedDetail>;
    const item = all[id];
    if (item && Date.now() - item.at < DETAIL_MAX_AGE_MS) return item;
  } catch {
    // Ignore a corrupted cache.
  }
  return null;
}

function writeDetailCache(id: string, podcast: Podcast, episodes: Episode[]) {
  try {
    const all = JSON.parse(localStorage.getItem(DETAIL_CACHE_KEY) || '{}') as Record<string, CachedDetail>;
    all[id] = { podcast, episodes: episodes.slice(0, 100), at: Date.now() };
    const keys = Object.keys(all);
    if (keys.length > DETAIL_CACHE_LIMIT) {
      keys
        .sort((a, b) => (all[a].at || 0) - (all[b].at || 0))
        .slice(0, keys.length - DETAIL_CACHE_LIMIT)
        .forEach((key) => { delete all[key]; });
    }
    localStorage.setItem(DETAIL_CACHE_KEY, JSON.stringify(all));
  } catch {
    // Storage is optional — the network result is already in memory.
  }
}

/** RSS descriptions often arrive as HTML; show clean text, never raw tags. */
function plainText(value: string | null | undefined): string {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h\d)>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

export default function PodcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentEpisode, isPlaying, togglePlay, playEpisode } = useAudioPlayer();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteEpisodeIds, setFavoriteEpisodeIds] = useState<Set<string>>(new Set());
  const [historyMap, setHistoryMap] = useState<Map<string, ListeningHistory>>(new Map());
  const [bookmarks, setBookmarks] = useState<EpisodeBookmark[]>([]);
  const [notes, setNotes] = useState<EpisodeNote[]>([]);
  const [expandedEp, setExpandedEp] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState('0:00');
  const [visibleEpisodes, setVisibleEpisodes] = useState(EPISODES_PER_PAGE);
  const [descExpanded, setDescExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    const fetchData = async () => {
      const cached = readDetailCache(id);
      if (cached) {
        setPodcast(cached.podcast);
        setEpisodes(cached.episodes);
        setVisibleEpisodes(EPISODES_PER_PAGE);
        setDescExpanded(false);
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Podcast details and the first episode batch are independent. Fetch them
      // together and show the page as soon as they arrive — the rest of a long
      // show's episodes load in the background instead of blocking first paint.
      const [podRes, firstRes] = await Promise.all([
        supabase
          .from('podcasts')
          .select('*, category:categories(*), host:hosts(*)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('episodes')
          .select('*')
          .eq('podcast_id', id)
          .order('published_at', { ascending: false })
          .range(0, 99),
      ]);

      if (cancelled) return;
      const podData = podRes.data;
      if (!podData) {
        setLoading(false);
        return;
      }
      setPodcast(podData as Podcast);
      setDescExpanded(false);

      const firstBatch = (firstRes.data || []) as Episode[];
      setEpisodes(firstBatch);
      setVisibleEpisodes(EPISODES_PER_PAGE);
      setLoading(false);
      writeDetailCache(id, podData as Podcast, firstBatch);

      void (async () => {
        const allEpisodes = [...firstBatch];
        for (let offset = 100; firstBatch.length === 100; offset += 100) {
          const { data } = await supabase
            .from('episodes')
            .select('*')
            .eq('podcast_id', id)
            .order('published_at', { ascending: false })
            .range(offset, offset + 99);
          const batch = (data || []) as Episode[];
          allEpisodes.push(...batch);
          if (batch.length < 100) break;
          if (cancelled) return;
        }
        if (!cancelled) setEpisodes(allEpisodes);

        if (user && allEpisodes.length > 0) {
          const ids = allEpisodes.slice(0, 1000).map((e) => e.id);
          const [favResult, epFavResult, histResult, bmResult, notesResult] = await Promise.all([
            supabase.from('favorites').select('podcast_id').eq('user_id', user.id).eq('podcast_id', id).maybeSingle(),
            supabase.from('episode_favorites').select('episode_id').eq('user_id', user.id).in('episode_id', ids),
            supabase.from('listening_history').select('*').eq('user_id', user.id).in('episode_id', ids),
            supabase.from('episode_bookmarks').select('*').eq('user_id', user.id).in('episode_id', ids),
            supabase.from('episode_notes').select('*').eq('user_id', user.id).in('episode_id', ids),
          ]);
          if (cancelled) return;

          setIsFavorited(!!favResult.data);
          setFavoriteEpisodeIds(new Set((epFavResult.data || []).map((r: { episode_id: string }) => r.episode_id)));
          const hMap = new Map<string, ListeningHistory>();
          (histResult.data || []).forEach((h: ListeningHistory) => hMap.set(h.episode_id, h));
          setHistoryMap(hMap);
          setBookmarks((bmResult.data as EpisodeBookmark[]) || []);
          setNotes((notesResult.data as EpisodeNote[]) || []);
        }
      })();
    };

    fetchData();
    return () => { cancelled = true; };
  }, [id, user]);

  const toggleFavorite = useCallback(async () => {
    if (!user || !podcast) return;
    const newFav = !isFavorited;
    setIsFavorited(newFav);

    if (newFav) {
      await supabase.from('favorites').insert({ user_id: user.id, podcast_id: podcast.id });
    } else {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('podcast_id', podcast.id);
    }
  }, [user, podcast, isFavorited]);

  const toggleEpisodeFavorite = useCallback(async (episodeId: string) => {
    if (!user) return;
    const isFav = favoriteEpisodeIds.has(episodeId);
    setFavoriteEpisodeIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(episodeId);
      else next.add(episodeId);
      return next;
    });

    if (isFav) {
      await supabase.from('episode_favorites').delete().eq('user_id', user.id).eq('episode_id', episodeId);
    } else {
      await supabase.from('episode_favorites').insert({ user_id: user.id, episode_id: episodeId });
    }
  }, [user, favoriteEpisodeIds]);

  const handlePlayEpisode = (ep: Episode) => {
    if (currentEpisode?.id === ep.id) {
      togglePlay();
    } else {
      playEpisode(ep, podcast || undefined, episodes);
    }
  };

  const addBookmark = async (episodeId: string) => {
    if (!user) return;
    const parts = bookmarkTime.split(':');
    const seconds = parts.length === 2 ? parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) : parseInt(bookmarkTime, 10) || 0;
    const { data } = await supabase
      .from('episode_bookmarks')
      .insert({ user_id: user.id, episode_id: episodeId, timestamp_seconds: seconds, note: bookmarkNote.trim() })
      .select('*')
      .maybeSingle();
    if (data) setBookmarks([...bookmarks, data as EpisodeBookmark]);
    setBookmarkNote('');
    setBookmarkTime('0:00');
  };

  const deleteBookmark = async (bmId: string) => {
    await supabase.from('episode_bookmarks').delete().eq('id', bmId);
    setBookmarks(bookmarks.filter((b) => b.id !== bmId));
  };

  const saveNote = async (episodeId: string) => {
    if (!user || !noteText.trim()) return;
    const existing = notes.find((n) => n.episode_id === episodeId);
    if (existing) {
      await supabase.from('episode_notes').update({ content: noteText.trim(), updated_at: new Date().toISOString() }).eq('id', existing.id);
      setNotes(notes.map((n) => n.id === existing.id ? { ...n, content: noteText.trim() } : n));
    } else {
      const { data } = await supabase
        .from('episode_notes')
        .insert({ user_id: user.id, episode_id: episodeId, content: noteText.trim() })
        .select('*')
        .maybeSingle();
      if (data) setNotes([...notes, data as EpisodeNote]);
    }
    setNoteText('');
  };

  const deleteNote = async (noteId: string) => {
    await supabase.from('episode_notes').delete().eq('id', noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  if (loading) {
    return (
      <Layout title="البودكاست">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!podcast) {
    return (
      <Layout title="البودكاست">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 font-semibold mb-4">لم يتم العثور على هذا البودكاست</p>
          <Link to="/podcasts">
            <Button variant="primary" size="md" rightIcon={<ChevronLeft size={18} />}>
              العودة للبودكاست
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const cleanDescription = plainText(podcast.description);

  return (
    <Layout title="البودكاست">
      {/* Back button */}
      <button
        onClick={() => navigate('/podcasts')}
        className="flex items-center gap-1 text-sm font-semibold text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 transition-all mb-4"
      >
        <ArrowRight size={18} />
        عودة للبودكاست
      </button>

      {/* Header card */}
      <div className="card-base mb-6 animate-fade-in-up">
        <div className="px-5 lg:px-6 py-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Cover */}
            <div className="flex-shrink-0">
              {(() => {
                const cover = podcast.cover_url || hostPhotoUrl(podcast.host) || '';
                return cover ? (
                  <OptimizedImage
                    src={cover}
                    alt={podcast.title}
                    width={256}
                    priority
                    sizes="128px"
                    className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-neutral-900"
                  />
                ) : (
                  <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center text-white text-4xl font-extrabold shadow-lg border-4 border-white dark:border-neutral-900">
                    {podcast.title.charAt(0)}
                  </div>
                );
              })()}
            </div>

            {/* Info */}
            <div className="flex-1 pt-1 sm:pt-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="primary" size="sm">{typeLabels[podcast.type]}</Badge>
                <Badge variant="neutral" size="sm">{levelLabels[podcast.audience_level]}</Badge>
                {podcast.category && (
                  <Badge variant="accent" size="sm">{podcast.category.name_ar}</Badge>
                )}
              </div>
              <h1 className="text-xl lg:text-2xl font-extrabold text-neutral-900 dark:text-white mb-1">
                {podcast.title}
              </h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Mic size={14} />
                {podcast.host?.slug ? (
                  <Link
                    to={`/hosts/${podcast.host.slug}`}
                    className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1 font-semibold"
                  >
                    {podcast.host.name_ar}
                    {podcast.host.is_verified && <BadgeCheck size={14} className="text-primary-600" />}
                  </Link>
                ) : (
                  podcast.host_name
                )}
              </p>
            </div>

            {/* Favorite + offline download */}
            <div className="sm:pt-2 flex flex-col gap-2">
              <button
                onClick={toggleFavorite}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isFavorited
                    ? 'bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400'
                    : 'border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-primary-400'
                }`}
              >
                <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
                {isFavorited ? 'في المفضلة' : 'أضف للمفضلة'}
              </button>
              <DownloadPodcastButton podcastId={podcast.id} count={episodes.length} />
            </div>
          </div>

          {/* Description */}
          {cleanDescription && (
            <div className="relative mt-5 overflow-hidden rounded-2xl border border-primary-100 dark:border-primary-900/40 bg-gradient-to-l from-primary-50/80 via-white to-white dark:from-primary-950/30 dark:via-neutral-900 dark:to-neutral-900">
              <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-primary-200/50 dark:bg-primary-800/20 blur-2xl" />
              <div className="relative p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-300">
                    <BookOpen size={16} />
                  </span>
                  <h2 className="text-sm font-extrabold text-neutral-900 dark:text-white">عن هذا البودكاست</h2>
                </div>
                <p className={`text-[13px] leading-7 text-neutral-600 dark:text-neutral-300 ${descExpanded ? '' : 'line-clamp-3'}`}>
                  {cleanDescription}
                </p>
                {cleanDescription.length > 160 && (
                  <button
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {descExpanded ? 'عرض أقل' : 'اقرأ المزيد'}
                  </button>
                )}
              </div>
            </div>
          )}

          {podcast.host?.slug ? (
            <Link
              to={`/hosts/${podcast.host.slug}`}
              className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center gap-3 hover:ring-1 hover:ring-primary-300 transition-all group"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700">
                {hostPhotoUrl(podcast.host) ? (
                  <OptimizedImage src={hostPhotoUrl(podcast.host)} alt={podcast.host.name_ar} width={88} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-extrabold text-primary-600">
                    {podcast.host.name_ar.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-neutral-400 mb-0.5 flex items-center gap-1">
                  المقدم
                  {podcast.host.is_verified && <BadgeCheck size={12} className="text-primary-600" />}
                </p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                  {podcast.host.title_ar ? `${podcast.host.title_ar} ${podcast.host.name_ar}` : podcast.host.name_ar}
                  {podcast.host.specialty_ar && <span className="font-normal text-neutral-500 dark:text-neutral-400"> — {podcast.host.specialty_ar}</span>}
                </p>
              </div>
              <ChevronLeft size={18} className="text-neutral-400 flex-shrink-0" />
            </Link>
          ) : podcast.host_bio && (
            <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50">
              <p className="text-xs font-semibold text-neutral-400 mb-1">عن المقدم</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{podcast.host_bio}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 mt-4 text-sm text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {episodes.length} حلقة
            </span>
            {podcast.plays_count > 0 && (
              <span className="flex items-center gap-1">
                <Headphones size={14} />
                {formatCount(podcast.plays_count)} تشغيل
              </span>
            )}
            {podcast.rating_avg > 0 && (
              <span className="flex items-center gap-1">
                <Star size={14} className="text-accent-500" fill="currentColor" />
                {podcast.rating_avg.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Episodes list */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
            <Headphones size={20} />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white">الحلقات</h2>
            <p className="mt-0.5 text-xs text-neutral-400">استمع بترتيبك، وكمّل من حيث ما وقفت</p>
          </div>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          {episodes.length} حلقة
        </span>
      </div>

      <div className="space-y-2.5">
        {episodes.slice(0, visibleEpisodes).map((ep, idx) => {
          const isCurrent = currentEpisode?.id === ep.id;
          const hist = historyMap.get(ep.id);
          const isCompleted = hist?.completed;
          const progressPct = hist && !hist.completed && ep.duration_seconds > 0
            ? (hist.progress_seconds / ep.duration_seconds) * 100
            : 0;

          return (
            <div
              key={ep.id}
              className={`group relative card-base overflow-hidden transition-all animate-fade-in-up hover:shadow-card-hover ${
                isCurrent ? 'ring-2 ring-primary-500' : 'hover:-translate-y-0.5'
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {isCurrent && <span className="absolute right-0 top-0 h-full w-1 bg-primary-500" />}

              <div className="flex items-center gap-3.5 p-3.5 sm:p-4">
                {/* Episode image */}
                <div className="relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                  {(() => {
                    const thumb = ep.image_url || podcast.cover_url || hostPhotoUrl(podcast.host) || '';
                    return thumb ? (
                      <OptimizedImage src={thumb} alt={ep.title} width={160} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center text-white text-lg font-extrabold">
                        {ep.title.charAt(0)}
                      </div>
                    );
                  })()}
                  <button
                    onClick={() => handlePlayEpisode(ep)}
                    disabled={!ep.audio_url}
                    aria-label={isCurrent && isPlaying ? 'إيقاف مؤقت' : 'تشغيل الحلقة'}
                    className={`absolute inset-0 flex items-center justify-center transition-all disabled:cursor-not-allowed ${isCurrent ? 'bg-black/35' : 'bg-black/0 hover:bg-black/25'}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-all ${isCurrent ? 'bg-primary-600 text-white shadow-lg' : 'bg-white/90 text-primary-700 opacity-90 group-hover:opacity-100'}`}>
                      {isCurrent && isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="mr-0.5" />}
                    </span>
                  </button>
                  <span className="absolute -left-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full border border-neutral-200 bg-white px-1 text-[10px] font-extrabold text-neutral-500 shadow-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                    {idx + 1}
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    {isCompleted && <CheckCircle2 size={15} className="flex-shrink-0 text-success-500" />}
                    <h3 className="truncate text-sm font-extrabold text-neutral-900 dark:text-neutral-100">
                      {ep.title}
                    </h3>
                  </div>
                  {ep.description && (
                    <p className="line-clamp-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">
                      {plainText(ep.description)}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ep.duration_seconds > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                        <Clock size={12} />
                        {formatDuration(ep.duration_seconds)}
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-400">{formatRelativeTime(ep.published_at)}</span>
                    {isCompleted && (
                      <span className="text-[11px] font-bold text-success-500">مكتملة</span>
                    )}
                  </div>
                  {progressPct > 0 && !isCompleted && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-primary-500 to-accent-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-primary-600 dark:text-primary-400">
                        {Math.round(progressPct)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => toggleEpisodeFavorite(ep.id)}
                    disabled={!user}
                    aria-label={favoriteEpisodeIds.has(ep.id) ? 'إزالة الحلقة من المفضلة' : 'إضافة الحلقة للمفضلة'}
                    title={user ? (favoriteEpisodeIds.has(ep.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة') : 'سجّل دخول لإضافة للمفضلة'}
                    className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors disabled:opacity-40 ${
                      favoriteEpisodeIds.has(ep.id)
                        ? 'bg-error-50 text-error-500 dark:bg-error-900/20'
                        : 'text-neutral-400 hover:bg-neutral-100 hover:text-error-500 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Heart size={16} fill={favoriteEpisodeIds.has(ep.id) ? 'currentColor' : 'none'} />
                  </button>
                  <DownloadButton episode={ep} podcast={podcast} compact />

                  {/* Expand button */}
                  <button
                    onClick={() => {
                      setExpandedEp(expandedEp === ep.id ? null : ep.id);
                      const epNote = notes.find((n) => n.episode_id === ep.id);
                      setNoteText(epNote?.content || '');
                    }}
                    aria-label={expandedEp === ep.id ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-primary-600 dark:hover:bg-neutral-800"
                  >
                    <ChevronDown size={17} className={`transition-transform ${expandedEp === ep.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Expanded section: bookmarks & notes */}
              {expandedEp === ep.id && (
                <div className="space-y-4 border-t border-neutral-100 px-3.5 pb-3.5 pt-4 animate-fade-in dark:border-neutral-800 sm:px-4 sm:pb-4">
                  {/* Bookmarks */}
                  <div>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1">
                      <Bookmark size={14} /> العلامات المرجعية
                    </p>
                    {bookmarks.filter((b) => b.episode_id === ep.id).length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {bookmarks.filter((b) => b.episode_id === ep.id).map((bm) => (
                          <div key={bm.id} className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                            <span className="text-xs font-bold text-primary-600 dark:text-primary-400 flex-shrink-0" dir="ltr">
                              {Math.floor(bm.timestamp_seconds / 60)}:{(bm.timestamp_seconds % 60).toString().padStart(2, '0')}
                            </span>
                            {bm.note && <span className="text-xs text-neutral-600 dark:text-neutral-400 flex-1 truncate">{bm.note}</span>}
                            <button onClick={() => deleteBookmark(bm.id)} className="text-neutral-400 hover:text-error-500 flex-shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={bookmarkTime}
                        onChange={(e) => setBookmarkTime(e.target.value)}
                        placeholder="0:00"
                        dir="ltr"
                        className="w-16 px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs"
                      />
                      <input
                        type="text"
                        value={bookmarkNote}
                        onChange={(e) => setBookmarkNote(e.target.value)}
                        placeholder="ملاحظة (اختياري)"
                        className="flex-1 px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs"
                      />
                      <button
                        onClick={() => addBookmark(ep.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-1">
                      <StickyNote size={14} /> ملاحظاتي
                    </p>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={3}
                      placeholder="اكتب ملاحظاتك حول هذه الحلقة..."
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary-400"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => saveNote(ep.id)}
                        disabled={!noteText.trim()}
                        className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 disabled:opacity-50"
                      >
                        حفظ
                      </button>
                      {notes.find((n) => n.episode_id === ep.id) && (
                        <button
                          onClick={() => deleteNote(notes.find((n) => n.episode_id === ep.id)!.id)}
                          className="px-3 py-1.5 rounded-lg text-error-600 dark:text-error-400 text-xs font-bold hover:bg-error-50 dark:hover:bg-error-900/20"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {episodes.length > visibleEpisodes && (
        <button
          onClick={() => setVisibleEpisodes((v) => v + EPISODES_PER_PAGE)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 py-3 text-sm font-bold text-primary-700 transition-all hover:border-primary-400 hover:bg-primary-100 dark:border-primary-900 dark:bg-primary-950/20 dark:text-primary-300 dark:hover:bg-primary-900/30"
        >
          <ChevronDown size={16} />
          عرض المزيد ({episodes.length - visibleEpisodes} حلقة متبقية)
        </button>
      )}

      {episodes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
            <Mic size={28} />
          </div>
          <p className="text-neutral-500 dark:text-neutral-400 font-semibold">لا توجد حلقات بعد</p>
        </div>
      )}
    </Layout>
  );
}
