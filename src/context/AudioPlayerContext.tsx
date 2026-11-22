import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateStatsOnListen } from '@/lib/statsHelper';
import { localUrlFor, OFFLINE_AUDIO_PREFIX } from '@/lib/downloads';
import { notifyProgressChanged } from '@/lib/progress';
import type { Episode, Podcast } from '@/types/podcast';

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  currentEpisode: Episode | null;
  currentPodcast: Podcast | null;
  queue: Episode[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
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
const PROGRESS_CACHE_KEY = 'nammy:progress-cache';

// Play the downloaded file when one exists, otherwise stream the real remote URL.
// No experimental/placeholder audio is ever played.
function resolveAudioUrl(url?: string | null, episodeId?: string): string {
  return (episodeId && localUrlFor(episodeId)) || url || '';
}

// Metadata may still be loading when the saved position arrives. Apply it as
// soon as the element is seekable, and only if this is still the same source.
function seekWhenReady(audio: HTMLAudioElement, time: number, isCurrent: () => boolean) {
  const apply = () => {
    if (!isCurrent()) return;
    try {
      audio.currentTime = time;
    } catch {
      // Not seekable yet — the loadedmetadata listener will retry.
    }
  };
  if (audio.readyState >= 1) apply();
  else audio.addEventListener('loadedmetadata', apply, { once: true });
}

// ProgressContext keeps a local copy of listening_history. Reading it here
// means playback can start from the saved position in one request, instead of
// starting from zero and seeking later (which forces a second range request).
function cachedResumeFor(episodeId: string): number {
  try {
    const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
    if (!raw) return 0;
    const cache = JSON.parse(raw) as { history?: Array<{ episode_id: string; progress_seconds: number; completed: boolean }> };
    const row = cache.history?.find((item) => item.episode_id === episodeId);
    return row && !row.completed && row.progress_seconds > 5 ? Math.floor(row.progress_seconds) : 0;
  } catch {
    return 0;
  }
}

function withStartAt(url: string, seconds: number): string {
  if (!url || seconds <= 5) return url;
  return `${url.split('#')[0]}#t=${Math.floor(seconds)}`;
}

function isLocalAudioUrl(url: string): boolean {
  return url.startsWith('blob:') || url.startsWith(OFFLINE_AUDIO_PREFIX) || url.startsWith('/');
}

/**
 * A `#t=` fragment makes the browser wait for a second Range request before it
 * fires `playing`. On real CDNs that can add tens of seconds. Local files seek
 * instantly, so we only use the fragment there; remote audio starts now and
 * jumps to the saved position once it is already audible.
 */
function sourceFor(episodeId: string | undefined, audioUrl: string | null | undefined, resumeAt: number) {
  const url = resolveAudioUrl(audioUrl, episodeId);
  const local = isLocalAudioUrl(url);
  return { url: local ? withStartAt(url, resumeAt) : url, local };
}

function resumeAfterAudible(
  audio: HTMLAudioElement,
  time: number,
  isCurrent: () => boolean,
) {
  const apply = () => {
    if (!isCurrent()) return;
    try {
      if (typeof audio.fastSeek === 'function') audio.fastSeek(time);
      else audio.currentTime = time;
    } catch {
      try { audio.currentTime = time; } catch { /* source changed */ }
    }
  };

  const onTime = () => {
    if (audio.currentTime >= 0.2) {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('playing', onPlaying);
      apply();
    }
  };
  const onPlaying = () => {
    // Fallback for browsers that don't emit timeupdate quickly.
    window.setTimeout(() => {
      audio.removeEventListener('timeupdate', onTime);
      apply();
    }, 150);
  };

  audio.addEventListener('timeupdate', onTime);
  audio.addEventListener('playing', onPlaying, { once: true });
}

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastSaveRef = useRef(0);
  const progressRef = useRef(0);
  // Incremented whenever the source changes so a slow history lookup can't
  // seek a later episode or override a newer user action.
  const playTokenRef = useRef(0);

  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [currentPodcast, setCurrentPodcast] = useState<Podcast | null>(null);
  const [queue, setQueue] = useState<Episode[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
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
    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };
    const onEnded = () => handleEnded();
    const onLoadedMetadata = () => setDuration(audio.duration || 0);
    const onError = () => {
      setIsPlaying(false);
      setIsBuffering(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('waiting', onWaiting);
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

      const { error } = await supabase
        .from('listening_history')
        .upsert({
          user_id: user.id,
          episode_id: episodeId,
          progress_seconds: Math.floor(seconds),
          completed,
          updated_at: new Date().toISOString(),
        });

      if (!error) notifyProgressChanged();

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
        playTokenRef.current += 1;
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
        const audio = audioRef.current;
        const token = ++playTokenRef.current;
        const resumeAt = cachedResumeFor(nextEp.id);
        const source = sourceFor(nextEp.id, nextEp.audio_url, resumeAt);
        audio.src = source.url;
        setIsBuffering(true);
        audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
        if (!source.local && resumeAt > 5) {
          resumeAfterAudible(audio, resumeAt, () => token === playTokenRef.current && audioRef.current === audio);
        }
      }
    } else if (repeatMode === 'all' && queue.length > 0) {
      setQueueIndex(0);
      setCurrentEpisode(queue[0]);
      if (audioRef.current) {
        const audio = audioRef.current;
        const token = ++playTokenRef.current;
        const resumeAt = cachedResumeFor(queue[0].id);
        const source = sourceFor(queue[0].id, queue[0].audio_url, resumeAt);
        audio.src = source.url;
        setIsBuffering(true);
        audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
        if (!source.local && resumeAt > 5) {
          resumeAfterAudible(audio, resumeAt, () => token === playTokenRef.current && audioRef.current === audio);
        }
      }
    } else {
      playTokenRef.current += 1;
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

      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const resumeAt = cachedResumeFor(episode.id);
      const isCurrent = () => token === playTokenRef.current && audioRef.current === audio;
      const source = sourceFor(episode.id, episode.audio_url, resumeAt);
      audio.src = source.url;
      audio.playbackRate = playbackRate;
      setIsBuffering(true);

      // Start immediately. Neither Supabase nor a remote `#t=` seek is allowed
      // to sit between the user's tap and the first audible frame.
      audio.play().catch(() => {
        if (isCurrent()) setIsPlaying(false);
      });

      // For streamed audio the saved position is applied only after playback
      // has started, so the user hears sound instead of waiting for a second range.
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(audio, resumeAt, isCurrent);
      }

      // The local cache normally covers resume. Only ask Supabase when it
      // didn't, and don't seek once the episode is already playing.
      if (user && resumeAt === 0) {
        void (async () => {
          try {
            const { data } = await supabase
              .from('listening_history')
              .select('progress_seconds, completed')
              .eq('user_id', user.id)
              .eq('episode_id', episode.id)
              .maybeSingle();
            if (!isCurrent()) return;
            const savedAt = data && !data.completed ? data.progress_seconds : 0;
            if (savedAt > 5 && audio.currentTime < 1) {
              if (source.local) seekWhenReady(audio, savedAt, isCurrent);
              else resumeAfterAudible(audio, savedAt, isCurrent);
            }
          } catch {
            // Playback already started; losing the saved position is harmless.
          }
        })();
      }
    },
    [currentEpisode, playbackRate, user]
  );

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentEpisode) return;
    if (audioRef.current.paused) {
      setIsBuffering(true);
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
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const resumeAt = cachedResumeFor(nextEp.id);
      const source = sourceFor(nextEp.id, nextEp.audio_url, resumeAt);
      audio.src = source.url;
      audio.playbackRate = playbackRate;
      setIsBuffering(true);
      audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(audio, resumeAt, () => token === playTokenRef.current && audioRef.current === audio);
      }
    }
  }, [queue, queueIndex, playbackRate]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1 >= 0 ? queueIndex - 1 : queue.length - 1;
    setQueueIndex(prevIdx);
    const prevEp = queue[prevIdx];
    setCurrentEpisode(prevEp);
    if (audioRef.current) {
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const resumeAt = cachedResumeFor(prevEp.id);
      const source = sourceFor(prevEp.id, prevEp.audio_url, resumeAt);
      audio.src = source.url;
      audio.playbackRate = playbackRate;
      setIsBuffering(true);
      audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(audio, resumeAt, () => token === playTokenRef.current && audioRef.current === audio);
      }
    }
  }, [queue, queueIndex, playbackRate]);

  const stop = useCallback(() => {
    playTokenRef.current += 1;
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
        isBuffering,
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
