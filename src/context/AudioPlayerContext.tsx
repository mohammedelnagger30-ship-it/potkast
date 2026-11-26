import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { updateStatsOnListen } from '@/lib/statsHelper';
import { creditListeningSeconds } from '@/lib/listeningCredits';
import { optimizedImageUrl } from '@/lib/imageUrls';
import { localUrlFor, OFFLINE_AUDIO_PREFIX } from '@/lib/downloads';
import { isQuranRecitationId } from '@/lib/ahmedArabiQuran';
import {
  isMediaNotificationSupported,
  listenMediaNotificationActions,
  startMediaNotification,
  stopMediaNotification,
  syncMediaNotification,
  type MediaTrack,
} from '@/lib/mediaNotification';
import { notifyProgressChanged, PROGRESS_CHANGED_EVENT } from '@/lib/progress';
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
  playEpisode: (episode: Episode, podcast?: Podcast, queue?: Episode[], resumeSeconds?: number) => void;
  setCurrentQueue: (episodes: Episode[]) => void;
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

// Parsing the whole progress snapshot used to happen on every single play tap.
// Keep it in memory and invalidate it only when ProgressContext says it changed.
let resumeCache: Map<string, number> | null = null;
let resumeCacheListenerAdded = false;

function getResumeCache(): Map<string, number> {
  if (!resumeCache) {
    resumeCache = new Map();
    try {
      const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
      if (raw) {
        const cache = JSON.parse(raw) as {
          history?: Array<{ episode_id: string; progress_seconds: number; completed: boolean }>;
        };
        for (const row of cache.history || []) {
          if (!row.completed && row.progress_seconds > 5) {
            resumeCache.set(row.episode_id, Math.floor(row.progress_seconds));
          }
        }
      }
    } catch {
      // An empty cache only means playback starts from the beginning.
    }
    if (!resumeCacheListenerAdded) {
      resumeCacheListenerAdded = true;
      window.addEventListener(PROGRESS_CHANGED_EVENT, () => { resumeCache = null; });
    }
  }
  return resumeCache;
}

// Play the downloaded file when one exists, otherwise stream the real remote URL.
// No experimental/placeholder audio is ever played.
function resolveAudioUrl(url?: string | null, episodeId?: string): string {
  return (episodeId && localUrlFor(episodeId)) || url || '';
}

function notificationArtist(episode: Episode | null, podcast: Podcast | null): string {
  return episode?.podcast?.title || podcast?.title || episode?.podcast?.host_name
    || podcast?.host_name || 'Sada';
}

// ProgressContext keeps a local copy of listening_history. Reading it here
// means playback can start from the saved position in one request, instead of
// starting from zero and seeking later (which forces a second range request).
function cachedResumeFor(episodeId: string): number {
  return getResumeCache().get(episodeId) || 0;
}

function withStartAt(url: string, seconds: number): string {
  if (!url || seconds <= 5) return url;
  return `${url.split('#')[0]}#t=${Math.floor(seconds)}`;
}

function isLocalAudioUrl(url: string): boolean {
  return url.startsWith('blob:')
    || url.startsWith(OFFLINE_AUDIO_PREFIX)
    || url.startsWith('/')
    || url.includes('/_capacitor_file_')
    || url.includes('/_capacitor_content_');
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
  // Furthest playback position already credited to user_stats for each episode.
  // Saving the absolute position again on every 5-second tick used to multiply
  // listening time; only the difference is credited from now on.
  const countedSecondsRef = useRef(new Map<string, number>());
  const progressRef = useRef(0);
  const lastTimeRenderRef = useRef(0);
  // Incremented whenever the source changes so a slow history lookup can't
  // seek a later episode or override a newer user action.
  const playTokenRef = useRef(0);
  const currentEpisodeRef = useRef<Episode | null>(null);
  const currentPodcastRef = useRef<Podcast | null>(null);
  const playNextRef = useRef<() => void>(() => undefined);
  const playPrevRef = useRef<() => void>(() => undefined);
  const stopRef = useRef<() => void>(() => undefined);
  const lastNotificationSyncRef = useRef(0);
  const playbackRateRef = useRef(1);

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

  /**
   * Resume the current episode from the app UI or the Android notification.
   *
   * A notification action is not a WebView user gesture, and Android may leave
   * the media element in a stalled state after a long background pause. Play can
   * also stay pending instead of rejecting, so a watchdog rebuilds the source a
   * couple of times when no audio frame actually arrives.
   */
  const resumePlayback = useCallback((resumeSeconds?: number, attempt = 0) => {
    const audio = audioRef.current;
    const episode = currentEpisodeRef.current;
    if (!audio || !episode?.audio_url) return;
    const ep = episode;
    const el = audio;

    const savedPosition = progressRef.current > 0 ? progressRef.current : el.currentTime;
    const resumeAt = Math.max(0, Math.floor(resumeSeconds ?? savedPosition ?? 0));

    function armWatchdog(token: number, currentAttempt: number) {
      let started = false;
      let timer = 0;

      const cleanup = () => {
        window.clearTimeout(timer);
        el.removeEventListener('playing', onPlaying);
        el.removeEventListener('timeupdate', onTime);
      };
      const onPlaying = () => { started = true; cleanup(); };
      const onTime = () => {
        if (!el.paused && el.currentTime > 0) {
          started = true;
          cleanup();
        }
      };

      timer = window.setTimeout(() => {
        cleanup();
        if (started || token !== playTokenRef.current || audioRef.current !== el) return;
        if (currentAttempt >= 2) {
          setIsPlaying(false);
          setIsBuffering(false);
          return;
        }
        // No 'playing' event: the WebView accepted play() but never resumed.
        // Rebuilding the source clears the stalled media pipeline.
        startFresh(currentAttempt + 1);
      }, 1500);

      el.addEventListener('playing', onPlaying, { once: true });
      el.addEventListener('timeupdate', onTime);
    }

    function startFresh(currentAttempt: number) {
      const token = ++playTokenRef.current;
      const local = isLocalAudioUrl(resolveAudioUrl(ep.audio_url, ep.id));
      const source = sourceFor(ep.id, ep.audio_url, local ? resumeAt : 0);
      el.src = source.url;
      // Clear any stale MEDIA_ELEMENT_ERROR left by a previous stop()/source swap.
      el.load();
      el.playbackRate = playbackRateRef.current;
      setIsBuffering(true);
      void el.play().catch(() => {
        if (token === playTokenRef.current && currentAttempt < 2) {
          startFresh(currentAttempt + 1);
        } else if (token === playTokenRef.current) {
          setIsPlaying(false);
          setIsBuffering(false);
        }
      });
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(el, resumeAt, () => token === playTokenRef.current && audioRef.current === el);
      }
      armWatchdog(token, currentAttempt);
    }

    const hasSource = !!el.getAttribute('src');
    if (!hasSource || el.error || el.ended || el.readyState === 0) {
      startFresh(attempt);
      return;
    }

    if (el.ended) {
      try { el.currentTime = 0; } catch { /* ignore */ }
    }
    const token = playTokenRef.current;
    setIsBuffering(true);
    void el.play().catch(() => {
      // A backgrounded WebView can reject play() once; retry with a fresh
      // source before giving up so the notification button still works.
      if (token === playTokenRef.current && attempt < 2) startFresh(attempt + 1);
      else if (token === playTokenRef.current) {
        setIsPlaying(false);
        setIsBuffering(false);
      }
    });
    armWatchdog(token, attempt);
  }, []);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    // Start buffering as soon as a source is assigned so play() has data ready.
    audio.preload = 'auto';
    audio.volume = 1;

    const pushNotification = (playing: boolean) => {
      if (!isMediaNotificationSupported()) return;
      const episode = currentEpisodeRef.current;
      if (!episode) return;
      const podcast = currentPodcastRef.current;
      const track: MediaTrack = {
        title: episode.title,
        artist: notificationArtist(episode, podcast),
        artwork: optimizedImageUrl(episode.podcast?.cover_url || podcast?.cover_url, 320),
        duration: Math.floor((audio.duration || 0) * 1000),
        position: Math.floor(audio.currentTime * 1000),
        playing,
      };
      syncMediaNotification(track);
    };

    const onTimeUpdate = () => {
      progressRef.current = audio.currentTime;
      // The UI does not need 4 React renders per second. Throttling this keeps
      // the whole page responsive while the audio keeps playing smoothly.
      const now = Date.now();
      if (now - lastNotificationSyncRef.current > 5000) {
        lastNotificationSyncRef.current = now;
        pushNotification(!audio.paused);
      }
      if (now - lastTimeRenderRef.current < 500) return;
      lastTimeRenderRef.current = now;
      setCurrentTime(audio.currentTime);
    };
    const onDurationChange = () => {
      setDuration(audio.duration || 0);
      pushNotification(!audio.paused);
    };
    const onPlay = () => {
      setIsPlaying(true);
      pushNotification(true);
    };
    const onPlaying = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      pushNotification(true);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPause = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      pushNotification(false);
    };
    const onEnded = () => handleEnded();
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      pushNotification(!audio.paused);
    };
    const onError = () => {
      setIsPlaying(false);
      setIsBuffering(false);
      pushNotification(false);
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

  useEffect(() => { currentEpisodeRef.current = currentEpisode; }, [currentEpisode]);
  useEffect(() => { currentPodcastRef.current = currentPodcast; }, [currentPodcast]);

  // Start/replace the Android media notification whenever the track changes.
  useEffect(() => {
    if (!isMediaNotificationSupported()) return;
    if (!currentEpisode) {
      stopMediaNotification();
      return;
    }
    startMediaNotification({
      title: currentEpisode.title,
      artist: notificationArtist(currentEpisode, currentPodcast),
      artwork: optimizedImageUrl(currentEpisode.podcast?.cover_url || currentPodcast?.cover_url, 320),
      duration: Math.floor(duration * 1000),
      position: Math.floor(currentTime * 1000),
      playing: isPlaying,
    });
    // Position/playing are synchronised separately from audio events; only a
    // new episode or podcast needs to restart the notification.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEpisode, currentPodcast]);

  // Apply playback rate
  useEffect(() => {
    playbackRateRef.current = playbackRate;
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
      // Curated recitations/lessons have no row in listening_history; writing
      // their synthetic IDs would either fail or pollute real completion stats.
      if (!user || isQuranRecitationId(episodeId) || episodeId.startsWith('curated:')) return;
      const now = Date.now();
      if (now - lastSaveRef.current < SAVE_INTERVAL_MS && !completed) return;
      lastSaveRef.current = now;

      const credit = creditListeningSeconds(countedSecondsRef.current.get(episodeId), seconds);
      const secondsListened = credit.secondsListened;
      countedSecondsRef.current.set(episodeId, credit.countedSeconds);

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

      // Credit only the seconds actually listened since the previous save.
      if (secondsListened > 0) {
        updateStatsOnListen(user.id, episodeId, secondsListened, completed).catch(() => {});
      }
    },
    [user]
  );

  const handleEnded = useCallback(() => {
    if (currentEpisode) {
      saveProgress(currentEpisode.id, duration, true);
    }

    const playAt = (idx: number) => {
      const ep = queue[idx];
      if (!ep || !audioRef.current) return;
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      setQueueIndex(idx);
      currentEpisodeRef.current = ep;
      if (ep.podcast) currentPodcastRef.current = ep.podcast;
      setCurrentEpisode(ep);
      countedSecondsRef.current.set(ep.id, 0);
      const local = isLocalAudioUrl(resolveAudioUrl(ep.audio_url, ep.id));
      // When looping/auto-advancing, start episodes from the beginning.
      const source = sourceFor(ep.id, ep.audio_url, 0);
      audio.src = source.url;
      audio.playbackRate = playbackRateRef.current;
      setIsBuffering(true);
      audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
      void local;
    };

    if (repeatMode === 'one') {
      if (audioRef.current) {
        playTokenRef.current += 1;
        if (currentEpisode) countedSecondsRef.current.set(currentEpisode.id, 0);
        audioRef.current.currentTime = 0;
        setIsBuffering(true);
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
      return;
    }

    // Continue to next episode in queue by default.
    if (queueIndex < queue.length - 1) {
      playAt(queueIndex + 1);
      return;
    }

    // End of queue: loop queue in "all", otherwise repeat the last episode.
    if (queue.length > 0) {
      if (repeatMode === 'all') {
        playAt(0);
      } else {
        if (audioRef.current) {
          playTokenRef.current += 1;
          if (currentEpisode) countedSecondsRef.current.set(currentEpisode.id, 0);
          audioRef.current.currentTime = 0;
          setIsBuffering(true);
          audioRef.current.play().catch(() => setIsPlaying(false));
        }
      }
      return;
    }

    playTokenRef.current += 1;
    setIsPlaying(false);
    stopMediaNotification();
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
    (episode: Episode, podcast?: Podcast, newQueue?: Episode[], resumeSeconds = 0) => {
      if (!audioRef.current) return;
      if (!episode.audio_url) return;

      // If same episode, just toggle play
      if (currentEpisode?.id === episode.id) {
        if (audioRef.current.paused) {
          resumePlayback();
        } else {
          audioRef.current.pause();
        }
        return;
      }

      currentEpisodeRef.current = episode;
      if (podcast) currentPodcastRef.current = podcast;
      setCurrentEpisode(episode);
      if (podcast) setCurrentPodcast(podcast);

      if (newQueue && newQueue.length > 0) {
        setQueue(newQueue);
        const idx = newQueue.findIndex((e) => e.id === episode.id);
        setQueueIndex(idx >= 0 ? idx : 0);
      }

      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const isCurrent = () => token === playTokenRef.current && audioRef.current === audio;
      const local = isLocalAudioUrl(resolveAudioUrl(episode.audio_url, episode.id));
      // Downloaded files seek instantly. Streamed audio starts at zero unless
      // the caller explicitly asks to continue — an implicit remote seek adds
      // a second range request and a visible stall right after the first frame.
      const resumeAt = local ? cachedResumeFor(episode.id) : Math.max(0, resumeSeconds);
      // Already-listened seconds at the resume point must not be credited twice.
      countedSecondsRef.current.set(episode.id, Math.floor(resumeAt));
      const source = sourceFor(episode.id, episode.audio_url, resumeAt);
      audio.src = source.url;
      audio.playbackRate = playbackRate;
      setIsBuffering(true);

      // Start immediately. Neither Supabase nor a remote `#t=` seek is allowed
      // to sit between the user's tap and the first audible frame.
      audio.play().catch(() => {
        if (isCurrent()) setIsPlaying(false);
      });

      // Only an explicit "continue listening" action seeks a remote stream.
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(audio, resumeAt, isCurrent);
      }
    },
    [currentEpisode, playbackRate, resumePlayback]
  );

  const setCurrentQueue = useCallback((episodes: Episode[]) => {
    setQueue(episodes);
    setQueueIndex((current) => {
      const id = currentEpisode?.id;
      if (!id) return current;
      const found = episodes.findIndex((ep) => ep.id === id);
      return found >= 0 ? found : current;
    });
  }, [currentEpisode?.id]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentEpisode) return;
    if (audioRef.current.paused) {
      resumePlayback();
    } else {
      audioRef.current.pause();
    }
  }, [currentEpisode, resumePlayback]);

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
    currentEpisodeRef.current = nextEp;
    if (nextEp.podcast) currentPodcastRef.current = nextEp.podcast;
    setCurrentEpisode(nextEp);
    if (audioRef.current) {
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const localNext = isLocalAudioUrl(resolveAudioUrl(nextEp.audio_url, nextEp.id));
      const resumeAt = localNext ? cachedResumeFor(nextEp.id) : 0;
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
    currentEpisodeRef.current = prevEp;
    if (prevEp.podcast) currentPodcastRef.current = prevEp.podcast;
    setCurrentEpisode(prevEp);
    if (audioRef.current) {
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      const localPrev = isLocalAudioUrl(resolveAudioUrl(prevEp.audio_url, prevEp.id));
      const resumeAt = localPrev ? cachedResumeFor(prevEp.id) : 0;
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
    currentEpisodeRef.current = null;
    currentPodcastRef.current = null;
    stopMediaNotification();
    setCurrentEpisode(null);
    setCurrentPodcast(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  // Keep stable refs for notification actions so the listener never captures
  // stale closures when the queue changes.
  useEffect(() => { playNextRef.current = playNext; }, [playNext]);
  useEffect(() => { playPrevRef.current = playPrev; }, [playPrev]);
  useEffect(() => { stopRef.current = stop; }, [stop]);

  useEffect(() => {
    if (!isMediaNotificationSupported()) return undefined;
    let handle: { remove: () => void } | null = null;
    void listenMediaNotificationActions(({ action, value }) => {
      const audio = audioRef.current;
      if (!audio) return;
      switch (action) {
        case 'play':
          resumePlayback();
          break;
        case 'pause':
          audio.pause();
          break;
        case 'next':
          playNextRef.current();
          break;
        case 'prev':
          playPrevRef.current();
          break;
        case 'seek':
          try {
            audio.currentTime = Math.max(0, Math.min(audio.duration || 0, value));
          } catch {
            // Source changed between the tap and the seek.
          }
          break;
        case 'stop':
          stopRef.current();
          break;
        default:
          break;
      }
    }).then((listener) => { handle = listener; }).catch(() => undefined);
    return () => { handle?.remove(); };
  }, [resumePlayback]);

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

  const value = useMemo<AudioPlayerContextValue>(() => ({
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
    setCurrentQueue,
    togglePlay,
    seek,
    skip,
    setVolume,
    setPlaybackRate,
    cycleRepeatMode,
    playNext,
    playPrev,
    stop,
  }), [
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
    setCurrentQueue,
    togglePlay,
    seek,
    skip,
    setVolume,
    setPlaybackRate,
    cycleRepeatMode,
    playNext,
    playPrev,
    stop,
  ]);

  return (
    <AudioPlayerContext.Provider value={value}>
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
