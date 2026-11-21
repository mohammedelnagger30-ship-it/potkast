import { Link } from 'react-router-dom';
import { Play, Pause, Heart, BadgeCheck } from 'lucide-react';
import type { Podcast } from '@/types/podcast';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { Badge } from '@/components/ui';
import { typeLabels, levelLabels } from '@/types/podcast';

interface PodcastCardProps {
  podcast: Podcast;
  onToggleFavorite?: (podcastId: string) => void;
  compact?: boolean;
}

export function PodcastCard({ podcast, onToggleFavorite, compact = false }: PodcastCardProps) {
  const { currentEpisode, isPlaying, togglePlay, currentPodcast, playEpisode } = useAudioPlayer();

  const isCurrentPodcast = currentPodcast?.id === podcast.id;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCurrentPodcast && currentEpisode) {
      togglePlay();
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(podcast.id);
  };

  const hostLink = podcast.host?.slug ? `/hosts/${podcast.host.slug}` : null;
  const hostName = podcast.host?.name_ar || podcast.host_name;

  if (compact) {
    return (
      <Link
        to={`/podcasts/${podcast.id}`}
        className="flex-shrink-0 w-40 lg:w-48 group"
      >
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden mb-2 bg-neutral-200 dark:bg-neutral-800">
          {podcast.cover_url && (
            <img
              src={podcast.cover_url}
              alt={podcast.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          <button
            onClick={handlePlay}
            className="absolute bottom-2 left-2 w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg active:scale-90"
          >
            {isCurrentPodcast && isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="mr-0.5" />}
          </button>
        </div>
        <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">{podcast.title}</h3>
        {hostLink ? (
          <Link
            to={hostLink}
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-neutral-500 dark:text-neutral-400 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-0.5"
          >
            {hostName}
            {podcast.host?.is_verified && <BadgeCheck size={11} className="text-primary-600 flex-shrink-0" />}
          </Link>
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
      <div className="relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-neutral-200 dark:bg-neutral-800">
        {podcast.cover_url && (
          <img
            src={podcast.cover_url}
            alt={podcast.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
        <button
          onClick={handlePlay}
          className="absolute bottom-2 left-2 w-11 h-11 rounded-full bg-primary-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg active:scale-90"
        >
          {isCurrentPodcast && isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="mr-0.5" />}
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
        <Link
          to={hostLink}
          onClick={(e) => e.stopPropagation()}
          className="text-sm text-neutral-500 dark:text-neutral-400 truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors inline-flex items-center gap-1"
        >
          {hostName}
          {podcast.host?.is_verified && <BadgeCheck size={13} className="text-primary-600 flex-shrink-0" />}
        </Link>
      ) : (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{hostName}</p>
      )}
    </Link>
  );
}
