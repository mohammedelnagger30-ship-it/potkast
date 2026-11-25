import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Episode, Host, Podcast } from '@/types/podcast';

// Known dead URLs are corrected in the client too, so cards show the real cover
// immediately even before the SQL migration is run in Supabase.
const PODCAST_COVER_OVERRIDES: Record<string, string> = {
  '4bccdb96-a058-5535-9028-78cf9176dc4b': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/17/d6/57/17d657e9-e09e-bc5d-db4a-2503cb6fcd3a/mza_14947685244643952825.jpg/600x600bb.jpg',
  '5e8c571c-9d1d-5809-a108-c69b6ca9f4c4': 'https://media.rss.com/el-maher-mindset/20250422_080406_12db83a9c0c785dee9f6ec0ca862bbf0.jpg',
  'e9eda82d-8d29-5399-bdb2-294066ca2613': 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/690565/690565-1582864423938-efc797c4dfc22.jpg',
  'c051ef34-0830-455f-9011-5cdba49b2307': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/fd/39/dc/fd39dc95-17b7-81f0-5044-e734882f81d9/mza_2248314467891740836.jpg/600x600bb.jpg',
  'c587fb51-69ab-4620-a037-cd6c641d5a0a': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/25/1a/ad/251aad9e-889f-5eb1-127c-c4f970d2e28d/mza_2405595109086693276.jpg/600x600bb.jpg',
  '4459577e-c90e-4dbc-aad9-460bdd2e27d1': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/f0/2f/ab/f02fab64-5a02-0d2c-c415-442653667bf6/mza_10899302102545678924.jpg/600x600bb.jpg',
  '7ab0adbe-b4f5-4066-b653-3be6ae6ce14f': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/b6/3a/43/b63a4385-e0fb-a275-c527-d533718693a2/mza_14241096479469985078.jpg/600x600bb.jpg',
  '85e145ff-7f4f-4bfc-8655-719d1e8b30ed': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts221/v4/95/69/73/9569738f-a98f-de76-836a-775adc17554c/mza_17060221040272791735.jpg/600x600bb.jpg',
  'c926f9d0-f39e-483a-b284-65079e954e8b': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts126/v4/12/7a/47/127a4734-094c-2e34-0d46-578d791dfa6f/mza_17924502777962523431.jpg/600x600bb.jpg',
};

const HOST_PHOTO_OVERRIDES: Record<string, string> = {
  'a1ef378f-1785-5cf9-9a72-cb5ce0c2922e': 'https://is1-ssl.mzstatic.com/image/thumb/Podcasts211/v4/17/d6/57/17d657e9-e09e-bc5d-db4a-2503cb6fcd3a/mza_14947685244643952825.jpg/600x600bb.jpg',
  '2c2afc32-1e0f-5b93-a48c-2dfde6816b4d': 'https://media.rss.com/el-maher-mindset/20250422_080406_12db83a9c0c785dee9f6ec0ca862bbf0.jpg',
  '96928822-c4a2-514a-9ecc-eaf1d3370728': 'https://d3t3ozftmdmh3i.cloudfront.net/production/podcast_uploaded_nologo/690565/690565-1582864423938-efc797c4dfc22.jpg',
};

interface ArtworkProps {
  src?: string | null;
  fallbackSrc?: string | null;
  seed: string;
  label: string;
  className?: string;
  imageClassName?: string;
}

// Hosts that publish 3000px originals (some over 1 MB) are served through a
// small resize proxy. Native resize rules are used where the host supports them.
const RESIZE_PROXY_HOSTS = ['d3t3ozftmdmh3i.cloudfront.net', 'media.rss.com'];

function optimizeImageUrl(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  // Some RSS feeds store HTML-escaped query strings (&amp;), which breaks resize params.
  let url = trimmed.replace(/&amp;/gi, '&');

  // SoundCloud artwork: -t3000x3000.jpg → -t500x500.jpg (547 KB → 34 KB).
  url = url.replace(/-(t)(\d+)x(\d+)\.(jpg|jpeg|png|webp)(\?.*)?$/i, (match, prefix: string, w: string, h: string, ext: string, query?: string) => {
    return Math.max(Number(w), Number(h)) > 600 ? `-t500x500.${ext}${query || ''}` : match;
  });

  try {
    const parsed = new URL(url);

    // imgix: max-w=3000&max-h=3000 → w=400&h=400 (361 KB → 18 KB).
    if (/imgix\.net$/i.test(parsed.hostname) && (parsed.searchParams.has('max-w') || parsed.searchParams.has('max-h'))) {
      parsed.searchParams.delete('max-w');
      parsed.searchParams.delete('max-h');
      parsed.searchParams.set('w', '400');
      parsed.searchParams.set('h', '400');
      parsed.searchParams.set('fit', 'crop');
      url = parsed.toString();
    }

    if (/graph\.facebook\.com$/i.test(parsed.hostname) && parsed.pathname.includes('/picture')) {
      parsed.searchParams.set('width', '400');
      parsed.searchParams.set('height', '400');
      url = parsed.toString();
    }

    if (RESIZE_PROXY_HOSTS.includes(parsed.hostname)) {
      url = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=400&h=400&fit=cover&output=jpg`;
    }
  } catch {
    // Keep the original URL if it cannot be parsed.
  }

  return url;
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
  const candidates = useMemo(() => {
    const list: string[] = [];
    for (const raw of [src, fallbackSrc]) {
      const clean = raw?.trim();
      if (!clean) continue;
      const optimized = optimizeImageUrl(clean);
      if (optimized && !list.includes(optimized)) list.push(optimized);
      // If the proxy/tweak fails, still try the original URL before local art.
      if (optimized && optimized !== clean && !list.includes(clean)) list.push(clean);
    }
    return list;
  }, [src, fallbackSrc]);
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
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${imageClassName}`}
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
      src={PODCAST_COVER_OVERRIDES[podcast.id] || podcast.cover_url}
      fallbackSrc={(podcast.host?.id && HOST_PHOTO_OVERRIDES[podcast.host.id]) || podcast.host?.photo_url}
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
      src={HOST_PHOTO_OVERRIDES[host.id] || host.photo_url}
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
