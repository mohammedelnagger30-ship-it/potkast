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
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Badge, Button, Card } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
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

export default function PodcastDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentEpisode, isPlaying, togglePlay, playEpisode } = useAudioPlayer();

  const [podcast, setPodcast] = useState<Podcast | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [historyMap, setHistoryMap] = useState<Map<string, ListeningHistory>>(new Map());
  const [bookmarks, setBookmarks] = useState<EpisodeBookmark[]>([]);
  const [notes, setNotes] = useState<EpisodeNote[]>([]);
  const [expandedEp, setExpandedEp] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTime, setBookmarkTime] = useState('0:00');
  const [visibleEpisodes, setVisibleEpisodes] = useState(EPISODES_PER_PAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);

      const { data: podData } = await supabase
        .from('podcasts')
        .select('*, category:categories(*), host:hosts(*)')
        .eq('id', id)
        .maybeSingle();

      if (!podData) {
        setLoading(false);
        return;
      }
      setPodcast(podData as Podcast);

      const { data: epData } = await supabase
        .from('episodes')
        .select('*')
        .eq('podcast_id', id)
        .order('published_at', { ascending: false })
        .range(0, 999);

      const firstBatch = (epData || []) as Episode[];
      const allEpisodes = [...firstBatch];
      for (let offset = 1000; firstBatch.length === 1000; offset += 1000) {
        const { data } = await supabase
          .from('episodes')
          .select('*')
          .eq('podcast_id', id)
          .order('published_at', { ascending: false })
          .range(offset, offset + 999);
        const batch = (data || []) as Episode[];
        allEpisodes.push(...batch);
        if (batch.length < 1000) break;
      }

      setEpisodes(allEpisodes);
      setVisibleEpisodes(EPISODES_PER_PAGE);

      if (user) {
        const [favResult, histResult] = await Promise.all([
          supabase.from('favorites').select('podcast_id').eq('user_id', user.id).eq('podcast_id', id).maybeSingle(),
          supabase.from('listening_history').select('*').eq('user_id', user.id).in('episode_id', (epData || []).map((e) => e.id)),
        ]);

        setIsFavorited(!!favResult.data);

        const hMap = new Map<string, ListeningHistory>();
        (histResult.data || []).forEach((h: ListeningHistory) => {
          hMap.set(h.episode_id, h);
        });
        setHistoryMap(hMap);

        const [bmResult, notesResult] = await Promise.all([
          supabase.from('episode_bookmarks').select('*').eq('user_id', user.id).in('episode_id', (epData || []).map((e) => e.id)),
          supabase.from('episode_notes').select('*').eq('user_id', user.id).in('episode_id', (epData || []).map((e) => e.id)),
        ]);
        setBookmarks((bmResult.data as EpisodeBookmark[]) || []);
        setNotes((notesResult.data as EpisodeNote[]) || []);
      }

      setLoading(false);
    };

    fetchData();
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
              {podcast.cover_url && (
                <img
                  src={podcast.cover_url}
                  alt={podcast.title}
                  className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl object-cover shadow-lg border-4 border-white dark:border-neutral-900"
                />
              )}
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

            {/* Favorite */}
            <div className="sm:pt-2">
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
            </div>
          </div>

          {/* Description */}
          {podcast.description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mt-4">
              {podcast.description}
            </p>
          )}

          {podcast.host?.slug ? (
            <Link
              to={`/hosts/${podcast.host.slug}`}
              className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 flex items-center gap-3 hover:ring-1 hover:ring-primary-300 transition-all group"
            >
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-neutral-200 dark:bg-neutral-700">
                {podcast.host.photo_url ? (
                  <img src={podcast.host.photo_url} alt={podcast.host.name_ar} className="w-full h-full object-cover" />
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
      <div className="mb-4">
        <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-4">الحلقات</h2>
      </div>

      <div className="space-y-2">
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
              className={`card-base p-4 transition-all animate-fade-in-up ${
                isCurrent ? 'ring-2 ring-primary-500' : ''
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center gap-4">
              {/* Play button */}
              <button
                onClick={() => handlePlayEpisode(ep)}
                disabled={!ep.audio_url}
                className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed ${
                  isCurrent
                    ? 'bg-primary-600 text-white'
                    : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white'
                }`}
              >
                {isCurrent && isPlaying ? (
                  <Pause size={20} fill="currentColor" />
                ) : (
                  <Play size={20} fill="currentColor" className="mr-0.5" />
                )}
              </button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {isCompleted && (
                    <CheckCircle2 size={16} className="text-success-500 flex-shrink-0" />
                  )}
                  <h3 className="font-bold text-neutral-900 dark:text-neutral-100 truncate">{ep.title}</h3>
                </div>
                {ep.description && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">{ep.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-neutral-400">
                    <Clock size={12} />
                    {formatDuration(ep.duration_seconds)}
                  </span>
                  <span className="text-xs text-neutral-400">{formatRelativeTime(ep.published_at)}</span>
                  {progressPct > 0 && !isCompleted && (
                    <span className="text-xs text-primary-600 dark:text-primary-400 font-semibold">
                      {Math.round(progressPct)}% مكتمل
                    </span>
                  )}
                </div>
                {/* Progress bar for in-progress episodes */}
                {progressPct > 0 && !isCompleted && (
                  <div className="mt-1.5 h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Expand button */}
              <button
                onClick={() => {
                  setExpandedEp(expandedEp === ep.id ? null : ep.id);
                  const epNote = notes.find((n) => n.episode_id === ep.id);
                  setNoteText(epNote?.content || '');
                }}
                className="flex-shrink-0 text-neutral-400 hover:text-primary-600 transition-colors p-1"
              >
                <ChevronDown size={18} className={`transition-transform ${expandedEp === ep.id ? 'rotate-180' : ''}`} />
              </button>
              </div>

              {/* Expanded section: bookmarks & notes */}
              {expandedEp === ep.id && (
                <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-4 animate-fade-in">
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
          className="mt-3 w-full py-3 rounded-xl text-sm font-bold bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-all"
        >
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
