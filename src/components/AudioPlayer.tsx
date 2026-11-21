import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
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
  X,
} from 'lucide-react';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { formatTime } from '@/types/podcast';

const speedOptions = [0.75, 1, 1.25, 1.5, 2];

export function AudioPlayer() {
  const {
    currentEpisode,
    currentPodcast,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackRate,
    repeatMode,
    togglePlay,
    seek,
    skip,
    setVolume,
    setPlaybackRate,
    cycleRepeatMode,
    playNext,
    playPrev,
    stop,
  } = useAudioPlayer();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!currentEpisode) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const coverUrl = currentPodcast?.cover_url || '';
  const podcastTitle = currentPodcast?.title || '';
  const host = currentPodcast?.host;

  return (
    <>
      {/* Mobile: above bottom nav. Desktop: full-width bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:bottom-0 lg:inset-x-0 lg:right-0 lg:w-[calc(100%-16rem)]">
        <div className="glass-effect border-t border-neutral-200 dark:border-neutral-800 shadow-lg">
          {/* Progress bar (top line) */}
          <div className="relative h-1 bg-neutral-200 dark:bg-neutral-800 cursor-pointer group" onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * duration);
          }}>
            <div
              className="absolute inset-y-0 right-0 bg-primary-600 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Main content */}
          <div className="flex items-center gap-3 px-3 py-2.5 lg:px-6 lg:py-3">
            {/* Cover + info */}
            <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none lg:w-64">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={podcastTitle}
                  className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-lg bg-primary-600 flex items-center justify-center text-white flex-shrink-0">
                  <Play size={20} fill="currentColor" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                  {currentEpisode.title}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                  {podcastTitle}
                  {host?.slug && (
                    <> • <Link to={`/hosts/${host.slug}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">{host.name_ar}</Link></>
                  )}
                </p>
              </div>
            </div>

            {/* Center controls */}
            <div className="flex items-center gap-1 lg:gap-2 mx-auto">
              <button
                onClick={playPrev}
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                aria-label="السابق"
              >
                <SkipForward size={18} />
              </button>

              <button
                onClick={() => skip(-15)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                aria-label="رجوع 15 ثانية"
              >
                <Rewind size={18} />
              </button>

              <button
                onClick={togglePlay}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all shadow-sm"
                aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="mr-0.5" />}
              </button>

              <button
                onClick={() => skip(15)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                aria-label="تقديم 15 ثانية"
              >
                <FastForward size={18} />
              </button>

              <button
                onClick={playNext}
                className="hidden lg:flex items-center justify-center w-9 h-9 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                aria-label="التالي"
              >
                <SkipBack size={18} />
              </button>
            </div>

            {/* Right controls */}
            <div className="hidden lg:flex items-center gap-3 w-64 justify-end">
              {/* Time */}
              <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums" dir="ltr">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Repeat */}
              <button
                onClick={cycleRepeatMode}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                  repeatMode !== 'none'
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
                }`}
                aria-label="تكرار"
              >
                {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
              </button>

              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center justify-center px-2.5 h-8 rounded-lg text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all min-w-[44px]"
                >
                  {playbackRate}x
                </button>
                {showSpeedMenu && (
                  <>
                    <div className="fixed inset-0 z-50" onClick={() => setShowSpeedMenu(false)} />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-50 min-w-[80px]">
                      {speedOptions.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            setPlaybackRate(speed);
                            setShowSpeedMenu(false);
                          }}
                          className={`block w-full px-4 py-2 text-sm text-center font-semibold transition-all ${
                            playbackRate === speed
                              ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                              : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVolume(volume > 0 ? 0 : 1)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-all"
                >
                  {volume > 0 ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-primary-600 cursor-pointer"
                />
              </div>

              {/* Close */}
              <button
                onClick={stop}
                className="text-neutral-400 hover:text-error-500 transition-all"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mobile: time + speed */}
            <div className="flex lg:hidden items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 tabular-nums" dir="ltr">
                {formatTime(currentTime)}
              </span>
              <button
                onClick={() => {
                  const idx = speedOptions.indexOf(playbackRate);
                  const nextIdx = (idx + 1) % speedOptions.length;
                  setPlaybackRate(speedOptions[nextIdx]);
                }}
                className="px-2 h-7 rounded-lg text-[10px] font-bold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800"
              >
                {playbackRate}x
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
