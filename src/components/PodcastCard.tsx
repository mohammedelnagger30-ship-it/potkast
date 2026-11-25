import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Pause, Heart, BadgeCheck, Loader2 } from 'lucide-react';
import type { Podcast, Episode } from '@/types/podcast';
import { supabase } from '@/lib/supabase';
import { quickEpisodeFor, rememberEpisodes } from '@/lib/quickPlay';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { Badge } from '@/components/ui';
import { PodcastArtwork } from '@/components/Artwork';
import { typeLabels, levelLabels } from '@/types/podcast';

interface PodcastCardProps {
  podcast: Podcast;
  onToggleFavorite?: (podcastId: string) => void;
  compact?: boolean;
}

// One lightweight lookup per podcast, reused on hover and on the actual click.
// This removes the Supabase round-trip from the click path on desktop.
const episodesCache = new Map<string, Promise<Episode[]>>();
const resolvedEpisodes = new Map<string, Episode[]>();

function episodesFor(podcastId: string): Promise<Episode[]> {
  let request = episodesCache.get(podcastId);
  if (!request) {
    request = Promise.resolve(
      supabase
        .from('episodes')
        .select('id,podcast_id,title,audio_url,duration_seconds,published_at')
        .eq('podcast_id', podcastId)
        .order('published_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          const list = (data || []) as Episode[];
          resolvedEpisodes.set(podcastId, list);
          rememberEpisodes(podcastId, list);
          return list;
        })
    );
    episodesCache.set(podcastId, request);
  }
  return request;
}

/** Synchronous fast path: no click should ever wait for the episode lookup. */
function firstPlayable(podcastId: string): Episode | undefined {
  const list = resolvedEpisodes.get(podcastId);
  return list?.find((ep) => ep.audio_url);
}

export function PodcastCard({ podcast, onToggleFavorite, compact = false }: PodcastCardProps) {
  const navigate = useNavigate();
  const { currentEpisode, isPlaying, togglePlay, currentPodcast, playEpisode, setCurrentQueue } = useAudioPlayer();
  const [starting, setStarting] = useState(false);

  const isCurrentPodcast = currentPodcast?.id === podcast.id;

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCurrentPodcast && currentEpisode) {
      togglePlay();
      return;
    }
    if (starting) return;

    // Use the warmed episode list when available. Awaiting Supabase inside the
    // click handler used to delay `audio.play()` by hundreds of milliseconds
    // (and could lose the browser's user activation on touch devices).
    const known = resolvedEpisodes.get(podcast.id);
    const knownFirst = firstPlayable(podcast.id) || quickEpisodeFor(podcast.id);
    if (knownFirst) {
      // The index is local and synchronous, so play() runs in this gesture —
      // no Supabase round trip can eat the browser's user activation.
      playEpisode(knownFirst, podcast, known || [knownFirst]);
      if (!known) {
        void episodesFor(podcast.id).then((list) => setCurrentQueue(list));
      }
      return;
    }

    setStarting(true);
    try {
      const list = await episodesFor(podcast.id);
      const first = list.find((ep) => ep.audio_url);
      if (first) playEpisode(first, podcast, list);
    } finally {
      setStarting(false);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(podcast.id);
  };

  const hostLink = podcast.host?.slug ? `/hosts/${podcast.host.slug}` : null;
  const hostName = podcast.host?.name_ar || podcast.host_name;

  // The whole card is already a <Link>; nesting another <a> inside it is
  // invalid HTML, so navigate in JS from a span that looks like a link.
  const openHost = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hostLink) navigate(hostLink);
  };

  if (compact) {
    return (
      <Link
        to={`/podcasts/${podcast.id}`}
        className="flex-shrink-0 w-40 lg:w-48 group"
      >
        <div className="relative w-full aspect-square mb-2">
          <PodcastArtwork
            podcast={podcast}
            className="h-full w-full rounded-2xl"
            imageClassName="group-hover:scale-105 transition-transform duration-300"
          />
          <button
            onClick={handlePlay}
            onMouseEnter={() => { void episodesFor(podcast.id); }}
            onFocus={() => { void episodesFor(podcast.id); }}
            onTouchStart={() => { void episodesFor(podcast.id); }}
            disabled={starting}
            aria-label={isCurrentPodcast && isPlaying ? 'إيقاف مؤقت' : 'تشغيل البودكاست'}
            className="absolute bottom-2 left-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-white opacity-100 shadow-lg transition-all duration-200 active:scale-90 disabled:opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
          >
            {starting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isCurrentPodcast && isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="mr-0.5" />
            )}
          </button>
        </div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{podcast.title}</h3>
        {hostLink ? (
          <span
            role="link"
            tabIndex={0}
            onClick={openHost}
            onKeyDown={(e) => { if (e.key === 'Enter') openHost(e); }}
            className="flex w-full min-w-0 items-center gap-0.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
          >
            <span className="truncate">{hostName}</span>
            {podcast.host?.is_verified && <BadgeCheck size={11} className="text-primary-600 flex-shrink-0" />}
          </span>
        ) : (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{hostName}</p>
        )}
      </Link>
    );
  }

  return (
    <Link
      to={`/podcasts/${podcast.id}`}
      className="card-base p-4 card-hover group block"
    >
      <div className="relative w-full aspect-square mb-3">
        <PodcastArtwork
          podcast={podcast}
          className="h-full w-full rounded-xl"
          imageClassName="group-hover:scale-105 transition-transform duration-300"
        />
        <button
          onClick={handlePlay}
          onMouseEnter={() => { void episodesFor(podcast.id); }}
          onFocus={() => { void episodesFor(podcast.id); }}
          onTouchStart={() => { void episodesFor(podcast.id); }}
          disabled={starting}
          aria-label={isCurrentPodcast && isPlaying ? 'إيقاف مؤقت' : 'تشغيل البودكاست'}
          className="absolute bottom-2 left-2 flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white opacity-100 shadow-lg transition-all duration-200 active:scale-90 disabled:opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
        >
          {starting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : isCurrentPodcast && isPlaying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" className="mr-0.5" />
          )}
        </button>
        {onToggleFavorite && (
          <button
            onClick={handleFavorite}
            className={`absolute top-2 left-2 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              podcast.is_favorited
                ? 'bg-error-500/90 text-white'
                : 'bg-black/30 text-white opacity-0 group-hover:opacity-100'
            }`}
          >
            <Heart size={16} fill={podcast.is_favorited ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        <Badge variant="primary" size="sm">{typeLabels[podcast.type] || podcast.type}</Badge>
        <Badge variant="neutral" size="sm">{levelLabels[podcast.audience_level] || podcast.audience_level}</Badge>
      </div>
      <h3 className="font-bold text-neutral-900 dark:text-white truncate">{podcast.title}</h3>
      {hostLink ? (
        <span
          role="link"
          tabIndex={0}
          onClick={openHost}
          onKeyDown={(e) => { if (e.key === 'Enter') openHost(e); }}
          className="flex w-full min-w-0 items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors cursor-pointer"
        >
          <span className="truncate">{hostName}</span>
          {podcast.host?.is_verified && <BadgeCheck size={13} className="text-primary-600 flex-shrink-0" />}
        </span>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{hostName}</p>
      )}
    </Link>
  );
}
