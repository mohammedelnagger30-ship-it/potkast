import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Episode, Host, Podcast } from '@/types/podcast';

interface ArtworkProps {
  src?: string | null;
  fallbackSrc?: string | null;
  seed: string;
  label: string;
  className?: string;
  imageClassName?: string;
}

/**
 * Artwork that never shows a broken image icon.
 *
 * Primary URL → optional fallback URL → deterministic local artwork. The local
 * artwork is derived from the episode/podcast id, so every episode gets its own
 * distinct cover even when the feed does not publish per-episode images.
 */
function hash(value: string): number {
  let result = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  }
  return result >>> 0;
}

export function localArtworkStyle(seed: string): CSSProperties {
  const value = hash(seed);
  const hue = value % 360;
  const hue2 = (hue + 42 + ((value >>> 9) % 90)) % 360;
  const angle = 115 + ((value >>> 17) % 130);
  const x = 18 + ((value >>> 5) % 55);
  const y = 16 + ((value >>> 11) % 50);
  const x2 = 72 - ((value >>> 13) % 42);
  const y2 = 58 + ((value >>> 19) % 32);

  return {
    backgroundColor: `hsl(${hue}, 68%, 24%)`,
    backgroundImage: [
      `radial-gradient(circle at ${x}% ${y}%, hsla(${hue}, 92%, 72%, 0.72), transparent 46%)`,
      `radial-gradient(circle at ${x2}% ${y2}%, hsla(${hue2}, 88%, 64%, 0.5), transparent 44%)`,
      `linear-gradient(${angle}deg, hsl(${hue}, 72%, 34%), hsl(${hue2}, 74%, 16%))`,
    ].join(', '),
  };
}

export function artworkInitial(label: string): string {
  const trimmed = String(label || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'س';
}

export default function Artwork({
  src,
  fallbackSrc,
  seed,
  label,
  className = '',
  imageClassName = '',
}: ArtworkProps) {
  const candidates = useMemo(
    () => Array.from(new Set(
      [src, fallbackSrc].filter((value): value is string => Boolean(value && value.trim())),
    )),
    [src, fallbackSrc],
  );
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const style = useMemo(() => localArtworkStyle(seed), [seed]);

  useEffect(() => {
    setAttempt(0);
    setLoaded(false);
    setFailed(false);
  }, [src, fallbackSrc, seed]);

  const current = candidates[attempt];

  // A blocked/stalled image (404, 403, ORB) can leave an <img> pending forever.
  // Give it a bounded chance to load, then keep only the generated artwork.
  useEffect(() => {
    if (!current || loaded) return;
    const timer = window.setTimeout(() => setFailed(true), 8000);
    return () => window.clearTimeout(timer);
  }, [current, loaded]);

  const handleError = () => {
    if (attempt + 1 < candidates.length) {
      setAttempt(attempt + 1);
      setLoaded(false);
      setFailed(false);
    } else {
      setFailed(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      {/* Generated artwork is always underneath, so there is never a blank card. */}
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full border border-white/25" />
      <span className="pointer-events-none absolute -bottom-10 -left-8 h-28 w-28 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/95 [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
        <span className="text-[1.1em] font-extrabold">{artworkInitial(label)}</span>
      </span>
      {current && !failed && (
        <img
          key={current}
          src={current}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className={`absolute inset-0 h-full w-full object-cover ${imageClassName}`}
        />
      )}
    </div>
  );
}

export function PodcastArtwork({
  podcast,
  className = '',
  imageClassName = '',
}: {
  podcast: Podcast;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <Artwork
      src={podcast.cover_url}
      fallbackSrc={podcast.host?.photo_url}
      seed={podcast.id || podcast.title}
      label={podcast.title}
      className={className}
      imageClassName={imageClassName}
    />
  );
}

export function HostArtwork({
  host,
  className = '',
  imageClassName = '',
}: {
  host: Host;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <Artwork
      src={host.photo_url}
      seed={host.id || host.name_ar}
      label={host.name_ar}
      className={className}
      imageClassName={imageClassName}
    />
  );
}

export function EpisodeArtwork({
  episode,
  className = '',
  imageClassName = '',
}: {
  episode: Episode;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <Artwork
      src={episode.image_url}
      seed={`${episode.id}|${episode.title}`}
      label={episode.title}
      className={className}
      imageClassName={imageClassName}
    />
  );
}
