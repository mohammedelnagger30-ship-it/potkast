import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  ListMusic,
  Headphones,
  Loader2,
  Heart,
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { useAuth } from '@/context/AuthContext';
import { DownloadButton } from '@/components/DownloadButton';
import { OptimizedImage } from '@/components/OptimizedImage';
import { supabase } from '@/lib/supabase';
import { formatTime, formatDuration } from '@/types/podcast';
import { podcastCoverUrl } from '@/lib/podcastArtwork';

const speedOptions = [0.75, 1, 1.25, 1.5, 2];

export default function PlayerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentEpisode,
    currentPodcast,
    currentTime,
    duration,
    isPlaying,
    isBuffering,
    volume,
    playbackRate,
    repeatMode,
    queue,
    queueIndex,
    togglePlay,
    seek,
    skip,
    setVolume,
    setPlaybackRate,
    cycleRepeatMode,
    playNext,
    playPrev,
    playEpisode,
  } = useAudioPlayer();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isEpisodeFavorited, setIsEpisodeFavorited] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user || !currentEpisode) {
      setIsEpisodeFavorited(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('episode_favorites')
        .select('episode_id')
        .eq('user_id', user.id)
        .eq('episode_id', currentEpisode.id)
        .maybeSingle();
      if (!cancelled) setIsEpisodeFavorited(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, currentEpisode?.id]);

  const toggleEpisodeFavorite = async () => {
    if (!user || !currentEpisode) return;
    const next = !isEpisodeFavorited;
    setIsEpisodeFavorited(next);
    if (next) {
      await supabase.from('episode_favorites').insert({ user_id: user.id, episode_id: currentEpisode.id });
    } else {
      await supabase.from('episode_favorites').delete().eq('user_id', user.id).eq('episode_id', currentEpisode.id);
    }
  };

  if (!currentEpisode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-6 text-center dark:bg-neutral-950">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
          <Headphones size={36} />
        </div>
        <h1 className="text-lg font-extrabold text-neutral-900 dark:text-white">مفيش حلقات شغالة دلوقتي</h1>
        <p className="max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          اختار حلقة من أي بودكاست وهيظهر المشغل هنا.
        </p>
        <button
          onClick={() => navigate('/podcasts')}
          className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition-colors hover:bg-primary-700"
        >
          تصفّح البودكاست
        </button>
      </div>
    );
  }

  const total = duration > 0 ? duration : currentEpisode.duration_seconds || 0;
  const nextEpisodes = queue.slice(queueIndex + 1, queueIndex + 6);
  const coverSource = currentPodcast || currentEpisode.podcast;
  const coverUrl = coverSource ? podcastCoverUrl(coverSource) : '';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-primary-50 via-white to-neutral-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-950">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-200/50 blur-3xl dark:bg-primary-900/20" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-accent-200/40 blur-3xl dark:bg-accent-900/10" />

      <div className="relative mx-auto flex min-h-screen max-w-xl flex-col px-5 pb-12 pt-5 sm:px-8">
        {/* Top bar */}
        <div className="mb-7 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            aria-label="رجوع"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-neutral-600 shadow-sm ring-1 ring-black/5 transition-colors hover:text-primary-600 dark:bg-neutral-900/80 dark:text-neutral-300"
          >
            <ArrowRight size={20} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">
              قيد التشغيل
            </p>
            <h1 className="text-sm font-extrabold text-neutral-900 dark:text-white">المشغل الصوتي</h1>
          </div>
          <button
            onClick={() => navigate('/podcasts')}
            aria-label="تصفّح البودكاست"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-neutral-600 shadow-sm ring-1 ring-black/5 transition-colors hover:text-primary-600 dark:bg-neutral-900/80 dark:text-neutral-300"
          >
            <ListMusic size={20} />
          </button>
        </div>

        {/* Cover */}
        <div className="relative mx-auto mb-7 w-60 sm:w-72">
          <div className="absolute inset-0 translate-y-4 rounded-[2rem] bg-primary-600/20 blur-2xl" />
          {coverUrl ? (
            <OptimizedImage
              src={coverUrl}
              alt={currentPodcast?.title || ''}
              width={480}
              priority
              sizes="(max-width: 640px) 80vw, 288px"
              className="relative aspect-square w-full rounded-[2rem] object-cover shadow-2xl ring-1 ring-black/5"
            />
          ) : (
            <div className="relative flex aspect-square w-full items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-2xl">
              <Headphones size={72} />
            </div>
          )}
        </div>

        {/* Episode info */}
        <div className="text-center">
          <h2 className="text-xl font-extrabold leading-snug text-neutral-900 dark:text-white">
            {currentEpisode.title}
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
            {currentPodcast?.id ? (
              <Link
                to={`/podcasts/${currentPodcast.id}`}
                className="font-bold transition-colors hover:text-primary-600 dark:hover:text-primary-400"
              >
                {currentPodcast.title}
              </Link>
            ) : (
              currentEpisode.podcast?.title || ''
            )}
          </p>
          {currentPodcast?.host?.slug && (
            <Link
              to={`/hosts/${currentPodcast.host.slug}`}
              className="mt-1 inline-block text-xs text-neutral-400 transition-colors hover:text-primary-600"
            >
              بصوت {currentPodcast.host.name_ar}
            </Link>
          )}
        </div>

        {/* Seek bar */}
        <div className="mt-7">
          <input
            type="range"
            dir="rtl"
            min={0}
            max={total || 1}
            step={1}
            value={Math.min(currentTime, total || 1)}
            onChange={(event) => seek(Number(event.target.value))}
            aria-label="موضع التشغيل"
            className="h-2 w-full cursor-pointer accent-primary-600"
          />
          <div className="mt-2 flex justify-between text-[11px] font-bold tabular-nums text-neutral-400" dir="ltr">
            <span>{formatTime(total)}</span>
            <span className="text-primary-600 dark:text-primary-400">{formatTime(currentTime)}</span>
          </div>
        </div>

        {/* Main controls */}
        <div className="mt-5 flex items-center justify-center gap-2 sm:gap-4" dir="rtl">
          <button
            onClick={playPrev}
            disabled={queue.length <= 1}
            aria-label="الحلقة السابقة"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-white hover:text-primary-600 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <SkipForward size={22} />
          </button>
          <button
            onClick={() => skip(-15)}
            aria-label="رجوع 15 ثانية"
            className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white hover:text-primary-600 dark:hover:bg-neutral-800"
          >
            <Rewind size={24} />
          </button>
          <button
            onClick={togglePlay}
            aria-label={isBuffering ? 'جارٍ التشغيل' : isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 text-white shadow-xl shadow-primary-600/30 transition-all hover:bg-primary-700 active:scale-95"
          >
            {isBuffering ? (
              <Loader2 size={32} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={32} fill="currentColor" />
            ) : (
              <Play size={32} fill="currentColor" className="mr-1" />
            )}
          </button>
          <button
            onClick={() => skip(15)}
            aria-label="تقديم 15 ثانية"
            className="flex h-12 w-12 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-white hover:text-primary-600 dark:hover:bg-neutral-800"
          >
            <FastForward size={24} />
          </button>
          <button
            onClick={playNext}
            disabled={queue.length <= 1}
            aria-label="الحلقة التالية"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-500 transition-colors hover:bg-white hover:text-primary-600 disabled:opacity-30 dark:hover:bg-neutral-800"
          >
            <SkipBack size={22} />
          </button>
        </div>

        {/* Secondary controls */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu((value) => !value)}
              className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-extrabold text-neutral-600 shadow-sm transition-colors hover:text-primary-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
              {playbackRate}x
            </button>
            {showSpeedMenu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowSpeedMenu(false)} />
                <div className="absolute bottom-full left-1/2 z-30 mb-2 min-w-[90px] -translate-x-1/2 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-800">
                  {speedOptions.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackRate(speed);
                        setShowSpeedMenu(false);
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-center text-xs font-bold transition-colors ${
                        playbackRate === speed
                          ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'
                          : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={cycleRepeatMode}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition-colors ${
              repeatMode !== 'none'
                ? 'border-primary-200 bg-primary-50 text-primary-600 dark:border-primary-900 dark:bg-primary-900/30 dark:text-primary-400'
                : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
            {repeatMode === 'none' ? 'تكرار آخر حلقة' : repeatMode === 'one' ? 'تكرار الحلقة' : 'تكرار الكل'}
          </button>

          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              aria-label={volume > 0 ? 'كتم الصوت' : 'تشغيل الصوت'}
              className="text-neutral-500 transition-colors hover:text-primary-600"
            >
              {volume > 0 ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(event) => setVolume(parseFloat(event.target.value))}
              aria-label="مستوى الصوت"
              className="w-20 cursor-pointer accent-primary-600"
            />
          </div>

          <button
            onClick={toggleEpisodeFavorite}
            disabled={!user}
            aria-label={isEpisodeFavorited ? 'إزالة الحلقة من المفضلة' : 'إضافة الحلقة للمفضلة'}
            title={user ? (isEpisodeFavorited ? 'إزالة من المفضلة' : 'إضافة للمفضلة') : 'سجّل دخول لإضافة للمفضلة'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition-colors disabled:opacity-40 ${
              isEpisodeFavorited
                ? 'border-error-200 bg-error-50 text-error-500 dark:border-error-900 dark:bg-error-900/20'
                : 'border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
            }`}
          >
            <Heart size={16} fill={isEpisodeFavorited ? 'currentColor' : 'none'} />
            {isEpisodeFavorited ? 'في المفضلة' : 'مفضلة'}
          </button>

          <div className="rounded-xl border border-neutral-200 bg-white px-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
            <DownloadButton episode={currentEpisode} podcast={currentPodcast || undefined} />
          </div>
        </div>

        {/* Up next */}
        {queue.length > 1 && (
          <div className="mt-9">
            <div className="mb-3 flex items-center gap-2">
              <ListMusic size={16} className="text-primary-600 dark:text-primary-400" />
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">التالي في القائمة</h3>
            </div>
            <div className="space-y-2">
              {nextEpisodes.map((episode, index) => (
                <button
                  key={episode.id}
                  onClick={() => playEpisode(episode, currentPodcast || undefined, queue)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-neutral-100 bg-white/80 p-3 text-right shadow-sm transition-all hover:border-primary-300 hover:bg-primary-50/50 dark:border-neutral-800 dark:bg-neutral-900/70 dark:hover:border-primary-800 dark:hover:bg-primary-950/20"
                >
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 text-xs font-extrabold text-primary-600 dark:bg-primary-900/30">
                    {queueIndex + index + 2}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
                      {episode.title}
                    </span>
                    <span className="block text-[11px] text-neutral-400">{formatDuration(episode.duration_seconds)}</span>
                  </span>
                  <Play size={16} className="flex-shrink-0 text-neutral-300" />
                </button>
              ))}
              {nextEpisodes.length === 0 && (
                <p className="text-xs text-neutral-400">دي آخر حلقة في القائمة.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
