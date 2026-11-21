import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateStatsOnListen } from '@/lib/statsHelper';
import type { Episode, Podcast } from '@/types/podcast';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  currentEpisode: Episode | null;
  currentPodcast: Podcast | null;
  queue: Episode[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  repeatMode: RepeatMode;
}

interface AudioPlayerContextValue extends PlayerState {
  playEpisode: (episode: Episode, podcast?: Podcast, queue?: Episode[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  skip: (seconds: number) => void;
  setVolume: (vol: number) => void;
  setPlaybackRate: (rate: number) => void;
  cycleRepeatMode: () => void;
  playNext: () => void;
  playPrev: () => void;
  stop: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | undefined>(undefined);

const SAVE_INTERVAL_MS = 5000;

// No experimental/placeholder audio: only real episode audio URLs are played.
function resolveAudioUrl(url?: string | null): string {
  return url || '';
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaveRef = useRef(0);
  const progressRef = useRef(0);

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'metadata';
    audio.volume = 1;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      progressRef.current = audio.currentTime;
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => handleEnded();
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Apply volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const saveProgress = useCallback(
    async (episodeId: string, seconds: number, completed: boolean) => {
      if (!user) return;
      const now = Date.now();
      if (now - lastSaveRef.current < SAVE_INTERVAL_MS && !completed) return;
      lastSaveRef.current = now;

      await supabase
        .from('listening_history')
        .upsert({
          user_id: user.id,
          episode_id: episodeId,
          progress_seconds: Math.floor(seconds),
          completed,
          updated_at: new Date().toISOString(),
        });

      // Update stats tables
      updateStatsOnListen(user.id, episodeId, Math.floor(seconds), completed).catch(() => {});
    },
    [user]
  );

  const handleEnded = useCallback(() => {
    if (currentEpisode) {
      saveProgress(currentEpisode.id, duration, true);
    }

    if (repeatMode === 'one') {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    // Play next in queue
    if (queueIndex < queue.length - 1) {
      const nextIdx = queueIndex + 1;
      setQueueIndex(nextIdx);
      const nextEp = queue[nextIdx];
      setCurrentEpisode(nextEp);
      if (audioRef.current) {
        audioRef.current.src = resolveAudioUrl(nextEp.audio_url);
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    } else if (repeatMode === 'all' && queue.length > 0) {
      setQueueIndex(0);
      setCurrentEpisode(queue[0]);
      if (audioRef.current) {
        audioRef.current.src = resolveAudioUrl(queue[0].audio_url);
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    } else {
      setIsPlaying(false);
    }
  }, [currentEpisode, duration, queue, queueIndex, repeatMode, saveProgress]);

  // Auto-save progress periodically while playing
  useEffect(() => {
    if (!isPlaying || !currentEpisode) return;
    const interval = setInterval(() => {
      if (audioRef.current && progressRef.current > 0) {
        saveProgress(currentEpisode.id, progressRef.current, false);
      }
    }, SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPlaying, currentEpisode, saveProgress]);

  const playEpisode = useCallback(
    (episode: Episode, podcast?: Podcast, newQueue?: Episode[]) => {
      if (!audioRef.current) return;
      if (!episode.audio_url) return;

      // If same episode, just toggle play
      if (currentEpisode?.id === episode.id) {
        if (audioRef.current.paused) {
          audioRef.current.play().catch(() => setIsPlaying(false));
        } else {
          audioRef.current.pause();
        }
        return;
      }

      setCurrentEpisode(episode);
      if (podcast) setCurrentPodcast(podcast);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((e) => e.id === episode.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      }

      audioRef.current.src = resolveAudioUrl(episode.audio_url);
      audioRef.current.playbackRate = playbackRate;

      // Resume from saved progress
      if (user) {
        supabase
          .from('listening_history')
          .select('progress_seconds, completed')
          .eq('user_id', user.id)
          .eq('episode_id', episode.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data && !data.completed && data.progress_seconds > 5 && audioRef.current) {
              audioRef.current.currentTime = data.progress_seconds;
            }
            audioRef.current?.play().catch(() => setIsPlaying(false));
          });
      } else {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    },
    [currentEpisode, playbackRate, user]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentEpisode) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [currentEpisode]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration, audioRef.current.currentTime + seconds));
    setCurrentTime(audioRef.current.currentTime);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
  }, []);

  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => (prev === 'none' ? 'all' : prev === 'all' ? 'one' : 'none'));
  }, []);

  const playNext = useCallback(() => {
    if (queue.length === 0) return;
    const nextIdx = queueIndex + 1 < queue.length ? queueIndex + 1 : 0;
    setQueueIndex(nextIdx);
    const nextEp = queue[nextIdx];
    setCurrentEpisode(nextEp);
    if (audioRef.current) {
      audioRef.current.src = resolveAudioUrl(nextEp.audio_url);
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [queue, queueIndex, playbackRate]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1 >= 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    const prevEp = queue[prevIdx];
    setCurrentEpisode(prevEp);
    if (audioRef.current) {
      audioRef.current.src = resolveAudioUrl(prevEp.audio_url);
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [queue, queueIndex, playbackRate]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setCurrentEpisode(null);
    setCurrentPodcast(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Save progress on unmount/page hide
  useEffect(() => {
    const onHide = () => {
      if (currentEpisode && audioRef.current && progressRef.current > 0) {
        saveProgress(currentEpisode.id, progressRef.current, false);
      }
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [currentEpisode, saveProgress]);

  return (
    <AudioPlayerContext.Provider
      value={{
        currentEpisode,
        currentPodcast,
        queue,
        queueIndex,
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        repeatMode,
        playEpisode,
        togglePlay,
        seek,
        skip,
        setVolume,
        setPlaybackRate,
        cycleRepeatMode,
        playNext,
        playPrev,
        stop,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudioPlayer() {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  return ctx;
}
