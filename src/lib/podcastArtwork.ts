import type { Podcast } from '@/types/podcast';

/**
 * Some imported feeds reuse the presenter's portrait as the artwork of every
 * series. Showing that same face on every card looks broken, so those feeds get
 * a distinct, title-based cover. Real series artwork is always kept as-is.
 */

const PALETTES: [string, string, string][] = [
  ['#0f766e', '#134e4a', '#5eead4'],
  ['#1d4ed8', '#1e3a8a', '#93c5fd'],
  ['#9a3412', '#7c2d12', '#fdba74'],
  ['#6d28d9', '#4c1d95', '#c4b5fd'],
  ['#047857', '#064e3b', '#6ee7b7'],
  ['#be185d', '#831843', '#f9a8d4'],
];

function isReusedPortrait(url: string, host?: Podcast['host']): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // A Facebook profile picture used as series artwork.
    if (hostname.endsWith('facebook.com') && path.includes('/picture')) return true;

    // The islampodcast importer stores one portrait for all of a host's series.
    if (hostname === 'raw.githubusercontent.com' && path.endsWith('/a-abdelmonem.jpg')) return true;

    if (host?.photo_url) {
      const portrait = new URL(host.photo_url);
      if (portrait.href === parsed.href) return true;
    }
  } catch {
    // Malformed URLs are handled by the image component; never generate here.
  }
  return false;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function seriesTitle(title: string): string {
  return title
    .split(/[|｜]/)[0]
    .replace(/\s+-\s+.*$/, '')
    .trim() || title;
}

function wrapTitle(title: string, maxChars = 14): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  if (lines.length > 3) {
    const kept = lines.slice(0, 3);
    kept[2] = `${kept[2].slice(0, maxChars - 1)}…`;
    return kept;
  }
  return lines;
}

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i += 1) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(result);
}

/** Deterministic branded cover: same podcast always gets the same artwork. */
function generatedCover(title: string): string {
  const [from, to, accent] = PALETTES[hash(title) % PALETTES.length];
  const lines = wrapTitle(seriesTitle(title));
  const startY = 300 - (lines.length - 1) * 30;
  const text = lines
    .map((line, i) =>
      `<text x="300" y="${startY + i * 62}" text-anchor="middle" direction="rtl" fill="#ffffff" font-family="Tahoma, Arial, sans-serif" font-size="46" font-weight="bold">${escapeXml(line)}</text>`
    )
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="600" height="600" fill="url(#g)"/><circle cx="500" cy="100" r="190" fill="${accent}" opacity="0.16"/><circle cx="90" cy="540" r="170" fill="${accent}" opacity="0.12"/><path d="M0 440 Q150 370 300 440 T600 440 V600 H0Z" fill="#000000" opacity="0.12"/>${text}<text x="300" y="548" text-anchor="middle" fill="#ffffff" opacity="0.72" font-family="Tahoma, Arial, sans-serif" font-size="22">بودكاست</text></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Real podcast artwork first; a unique cover when the feed only has a portrait. */
export function podcastCoverUrl(podcast: Pick<Podcast, 'title' | 'cover_url'> & { host?: Podcast['host'] }): string {
  const cover = (podcast.cover_url || '').trim();
  if (!cover || isReusedPortrait(cover, podcast.host)) return generatedCover(podcast.title);
  return cover;
}
