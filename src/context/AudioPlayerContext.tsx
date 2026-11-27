import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { recordListeningProgress } from '@/lib/statsHelper';
import { supabase } from '@/lib/supabase';
import { bySeries } from '@/lib/episodeOrder';
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
// An episode counts as listened once 90% of it has been reached. The counter
// must not wait for the native `ended` event (some streams never fire it).
const COMPLETION_RATIO = 0.9;

// Parsing the whole progress snapshot used to happen on every single play tap.
// Keep it in memory and invalidate it only when ProgressContext says it changed.
interface CachedHistoryRow {
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
}
let progressHistoryCache: CachedHistoryRow[] | null = null;
let resumeCache: Map<string, number> | null = null;
let completedCache: Set<string> | null = null;
let progressCacheListenerAdded = false;

function cachedHistory(): CachedHistoryRow[] {
  if (!progressHistoryCache) {
    try {
      const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) as { history?: CachedHistoryRow[] } : null;
      progressHistoryCache = parsed?.history || [];
    } catch {
      // An empty cache only means playback starts from the beginning.
      progressHistoryCache = [];
    }
    if (!progressCacheListenerAdded) {
      progressCacheListenerAdded = true;
      window.addEventListener(PROGRESS_CHANGED_EVENT, () => {
        progressHistoryCache = null;
        resumeCache = null;
        completedCache = null;
      });
    }
  }
  return progressHistoryCache;
}

function getResumeCache(): Map<string, number> {
  if (!resumeCache) {
    resumeCache = new Map();
    for (const row of cachedHistory()) {
      if (!row.completed && row.progress_seconds > 5) {
        resumeCache.set(row.episode_id, Math.floor(row.progress_seconds));
      }
    }
  }
  return resumeCache;
}

/** Episodes already marked complete, so replaying one never resets its flag. */
function getCompletedCache(): Set<string> {
  if (!completedCache) {
    completedCache = new Set();
    for (const row of cachedHistory()) {
      if (row.completed) completedCache.add(row.episode_id);
    }
  }
  return completedCache;
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
  // Credit real playback time, not position differences. Seeking or reloading
  // used to be counted as listening because the old code compared absolute
  // player positions. A jump that is too large for the elapsed wall time is a
  // seek and is intentionally ignored.
  const lastTimeUpdateRef = useRef<{ at: number; position: number } | null>(null);
  const pendingListenRef = useRef(new Map<string, number>());
  // Once crossed, completion is sticky for the session: later 5-second saves
  // (and replays) must never write `completed: false` over it.
  const completedIdsRef = useRef<Set<string>>(new Set(getCompletedCache()));
  const saveProgressRef = useRef<(_episodeId: string, _seconds: number, _completed: boolean, _force?: boolean) => Promise<void>>(
    async () => undefined
  );
  // The audio element is created once. These refs let its native handlers call
  // the newest callbacks instead of the empty first-render closures (which is
  // why "next episode after finish" never used to run).
  const handleEndedRef = useRef<() => void>(() => undefined);
  // A finished source can emit `ended` more than once. The source token makes
  // auto-advance fire exactly once per episode, including the near-end fallback.
  const endHandledTokenRef = useRef<number>(-1);
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

      // Count only seconds the audio actually advanced while playing. This is
      // immune to forward/backward seeks, reloads and the phone notification.
      const episode = currentEpisodeRef.current;
      if (episode && !audio.paused && !audio.seeking) {
        const nowPerf = performance.now();
        const prev = lastTimeUpdateRef.current;
        if (prev) {
          const advanced = audio.currentTime - prev.position;
          const wall = Math.max(0, (nowPerf - prev.at) / 1000);
          const rate = Math.max(0.25, playbackRateRef.current || 1);
          const plausible = advanced > 0 && advanced <= Math.max(1.5, wall * rate + 0.75);
          if (plausible) {
            pendingListenRef.current.set(
              episode.id,
              (pendingListenRef.current.get(episode.id) || 0) + advanced
            );
          }
        }
        lastTimeUpdateRef.current = { at: nowPerf, position: audio.currentTime };
      } else {
        lastTimeUpdateRef.current = null;
      }

      // Mark the episode complete at 90% — no need to wait for `ended`, which
      // some streams never emit. Sticky ref makes this fire exactly once.
      const total = audio.duration;
      if (episode && Number.isFinite(total) && total > 0
        && !completedIdsRef.current.has(episode.id)
        && audio.currentTime >= total * COMPLETION_RATIO) {
        completedIdsRef.current.add(episode.id);
        void saveProgressRef.current(episode.id, audio.currentTime, true);
      }
      // Some streams never emit `ended`. Reaching the last second is the same
      // event for the listener, so advance here too. handleEnded is token-guarded
      // and therefore safe to call from both paths.
      if (episode && Number.isFinite(total) && total > 0 && audio.currentTime >= total - 1) {
        handleEndedRef.current();
      }
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
      lastTimeUpdateRef.current = { at: performance.now(), position: audio.currentTime };
      setIsPlaying(true);
      pushNotification(true);
    };
    const onPlaying = () => {
      lastTimeUpdateRef.current = { at: performance.now(), position: audio.currentTime };
      setIsPlaying(true);
      setIsBuffering(false);
      pushNotification(true);
    };
    const onWaiting = () => {
      lastTimeUpdateRef.current = null;
      setIsBuffering(true);
    };
    const onPause = () => {
      lastTimeUpdateRef.current = null;
      setIsPlaying(false);
      setIsBuffering(false);
      pushNotification(false);
      // The 5-second autosave is torn down as soon as `isPlaying` flips false.
      // Flush the seconds measured since the last save here, otherwise pausing
      // (or stopping from the phone notification) silently drops them.
      const current = currentEpisodeRef.current;
      // Ignore the synthetic pause emitted while swapping `audio.src`: there
      // the old position is still cached but currentTime has already reset.
      if (current && progressRef.current > 0
        && Math.abs(audio.currentTime - progressRef.current) < 2) {
        void saveProgressRef.current(current.id, progressRef.current, false, true);
      }
    };
    const onEnded = () => handleEndedRef.current();
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
    async (episodeId: string, seconds: number, completed: boolean, force = false) => {
      // Curated recitations/lessons have no row in listening_history; writing
      // their synthetic IDs would either fail or pollute real completion stats.
      if (!user || isQuranRecitationId(episodeId) || episodeId.startsWith('curated:')) return;
      const isComplete = completed || completedIdsRef.current.has(episodeId);
      if (isComplete) completedIdsRef.current.add(episodeId);
      const now = Date.now();
      if (!force && now - lastSaveRef.current < SAVE_INTERVAL_MS && !isComplete) return;
      lastSaveRef.current = now;

      const pending = pendingListenRef.current.get(episodeId) || 0;
      const listenedSeconds = Math.floor(pending);
      if (listenedSeconds > 0) {
        pendingListenRef.current.set(episodeId, pending - listenedSeconds);
      }

      try {
        await recordListeningProgress(user.id, episodeId, Math.floor(seconds), listenedSeconds, isComplete);
        notifyProgressChanged();
      } catch {
        // Keep the uncredited seconds so the next save can retry them.
        if (listenedSeconds > 0) {
          pendingListenRef.current.set(episodeId, (pendingListenRef.current.get(episodeId) || 0) + listenedSeconds);
        }
      }
    },
    [user]
  );
  // The audio element is created once on mount, so its handlers reach the
  // latest save function through this ref instead of a stale closure.
  saveProgressRef.current = saveProgress;

  /** Start one item of the active queue. Every advance path shares this so the
   * source, counting baseline and media notification cannot drift apart. */
  const startQueuedEpisode = useCallback(
    (idx: number, list: Episode[] = queue) => {
      const ep = list[idx];
      if (!ep || !audioRef.current) return false;
      const audio = audioRef.current;
      const token = ++playTokenRef.current;
      endHandledTokenRef.current = -1;
      setQueueIndex(idx);
      currentEpisodeRef.current = ep;
      if (ep.podcast) currentPodcastRef.current = ep.podcast;
      setCurrentEpisode(ep);
      pendingListenRef.current.set(ep.id, 0);
      lastTimeUpdateRef.current = null;
      const local = isLocalAudioUrl(resolveAudioUrl(ep.audio_url, ep.id));
      // Auto-advance starts the next lesson from the beginning.
      const resumeAt = local ? cachedResumeFor(ep.id) : 0;
      const source = sourceFor(ep.id, ep.audio_url, resumeAt);
      audio.src = source.url;
      audio.playbackRate = playbackRateRef.current;
      setIsBuffering(true);
      void audio.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
      if (!source.local && resumeAt > 5) {
        resumeAfterAudible(audio, resumeAt, () => token === playTokenRef.current && audioRef.current === audio);
      }
      return true;
    },
    [queue]
  );

  /** Favourites, downloads and mission links start with a one-item queue. Load
   * the real siblings of that podcast in series order so "next after finish"
   * works there too, not just when the user pressed "play all". */
  const loadSiblingAndPlay = useCallback(
    async (finished: Episode | null) => {
      const token = playTokenRef.current;
      const stopIfCurrent = () => {
        if (token !== playTokenRef.current) return;
        playTokenRef.current += 1;
        setIsPlaying(false);
        setIsBuffering(false);
        stopMediaNotification();
      };
      if (!finished || finished.id.startsWith('curated:') || finished.id.startsWith('quran:')) {
        stopIfCurrent();
        return;
      }
      try {
        const { data } = await supabase
          .from('episodes')
          .select('id, podcast_id, title, description, audio_url, duration_seconds, plays_count, published_at, image_url')
          .eq('podcast_id', finished.podcast_id);
        if (token !== playTokenRef.current) return;
        const siblings = ((data || []) as Episode[])
          .filter((ep) => !!ep.audio_url)
          .sort(bySeries);
        if (siblings.length === 0) {
          stopIfCurrent();
          return;
        }
        const currentIdx = siblings.findIndex((ep) => ep.id === finished.id);
        const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % siblings.length;
        const podcast = currentPodcastRef.current || finished.podcast || undefined;
        const withPodcast = siblings.map((ep) => ({ ...ep, podcast: ep.podcast || podcast }));
        setQueue(withPodcast);
        startQueuedEpisode(nextIdx, withPodcast);
      } catch {
        stopIfCurrent();
      }
    },
    [startQueuedEpisode]
  );

  const stopAfterQueue = useCallback(() => {
    playTokenRef.current += 1;
    setIsPlaying(false);
    setIsBuffering(false);
    stopMediaNotification();
  }, []);

  const handleEnded = useCallback(() => {
    if (endHandledTokenRef.current === playTokenRef.current) return;
    endHandledTokenRef.current = playTokenRef.current;

    const finished = currentEpisodeRef.current;
    if (finished) void saveProgressRef.current(finished.id, progressRef.current, true, true);

    if (repeatMode === 'one') {
      if (audioRef.current) {
        const token = ++playTokenRef.current;
        endHandledTokenRef.current = -1;
        if (finished) pendingListenRef.current.set(finished.id, 0);
        lastTimeUpdateRef.current = null;
        audioRef.current.currentTime = 0;
        setIsBuffering(true);
        void audioRef.current.play().catch(() => { if (token === playTokenRef.current) setIsPlaying(false); });
      }
      return;
    }

    // Ordered queue: lesson 1 → 2 → 3 … no matter where playback started.
    if (queueIndex >= 0 && queueIndex < queue.length - 1) {
      startQueuedEpisode(queueIndex + 1, queue);
      return;
    }
    if (repeatMode === 'all' && queue.length > 1) {
      startQueuedEpisode(0, queue);
      return;
    }
    if (queue.length <= 1) {
      void loadSiblingAndPlay(finished);
      return;
    }
    stopAfterQueue();
  }, [queue, queueIndex, repeatMode, startQueuedEpisode, loadSiblingAndPlay, stopAfterQueue]);

  // Native `ended` comes from an element created on the first render; this ref
  // keeps it connected to the latest queue/repeat state.
  handleEndedRef.current = handleEnded;

  // Auto-save progress periodically while playing
  useEffect(() => {
    if (!isPlaying || !currentEpisode) return;
    const interval = setInterval(() => {
      if (audioRef.current && progressRef.current > 0) {
        void saveProgress(currentEpisode.id, progressRef.current, false);
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

      // Flush any playback time measured for the episode we are leaving.
      if (currentEpisode) {
        void saveProgress(currentEpisode.id, progressRef.current, false, true);
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
      endHandledTokenRef.current = -1;
      const isCurrent = () => token === playTokenRef.current && audioRef.current === audio;
      const local = isLocalAudioUrl(resolveAudioUrl(episode.audio_url, episode.id));
      // Downloaded files seek instantly. Streamed audio starts at zero unless
      // the caller explicitly asks to continue — an implicit remote seek adds
      // a second range request and a visible stall right after the first frame.
      const resumeAt = local ? cachedResumeFor(episode.id) : Math.max(0, resumeSeconds);
      // Position is resume state only. Credited seconds come from measured
      // playback, so resuming at 10:00 never adds those 10 minutes again.
      pendingListenRef.current.set(episode.id, 0);
      lastTimeUpdateRef.current = null;
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
    [currentEpisode, playbackRate, resumePlayback, saveProgress]
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
    // A seek is not listening time; drop the interval baseline so the next
    // timeupdate cannot treat the jump as 10 minutes of playback.
    lastTimeUpdateRef.current = null;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((seconds: number) => {
    if (!audioRef.current) return;
    lastTimeUpdateRef.current = null;
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
    startQueuedEpisode(nextIdx, queue);
  }, [queue, queueIndex, startQueuedEpisode]);

  const playPrev = useCallback(() => {
    if (queue.length === 0) return;
    const prevIdx = queueIndex - 1 >= 0 ? queueIndex - 1 : queue.length - 1;
    startQueuedEpisode(prevIdx, queue);
  }, [queue, queueIndex, startQueuedEpisode]);

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
            lastTimeUpdateRef.current = null;
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

  // Save progress on unmount/page hide/backgrounding. Mobile browsers do not
  // always fire pagehide when the app is merely sent to the background, so the
  // visibility change is the reliable signal for flushing pending seconds.
  useEffect(() => {
    const onHide = () => {
      if (currentEpisode && audioRef.current && progressRef.current > 0) {
        void saveProgress(currentEpisode.id, progressRef.current, false, true);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
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
