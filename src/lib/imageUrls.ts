/**
 * Lightweight image optimisation.
 *
 * The catalog stores the original artwork URLs returned by podcast feeds. A
 * surprising number of them are 1800–3000px PNG/JPEG files (1–3 MB each),
 * which is wasteful for 48–240px cards and is the main reason lists feel slow.
 *
 * wsrv.nl is a stateless image proxy: it fetches the original once, converts
 * it to a small JPEG and serves it with a one-year cache header. The browser
 * (and the service worker) then reuse that copy. The original URL is always
 * kept as a fallback in OptimizedImage, so a proxy outage never breaks art.
 */

const PROXY_ORIGIN = 'https://wsrv.nl/';
const MAX_CACHE_ENTRIES = 800;
// Wikimedia already serves small, well-cached thumbnails and rate-limits the
// proxy's upstream requests, so pass those URLs through unchanged.
const DIRECT_IMAGE_HOSTS = new Set(['upload.wikimedia.org', 'graph.facebook.com']);

export type ImageAspect = 'square' | 'wide';

const urlCache = new Map<string, string>();

function isProxyUrl(url: string): boolean {
  return url.startsWith(PROXY_ORIGIN) || url.startsWith('https://images.weserv.nl/');
}

function proxyUrl(source: string, width: number, aspect: ImageAspect): string {
  const key = `${source}|${width}|${aspect}`;
  const cached = urlCache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    url: source,
    w: String(width),
    output: 'jpg',
    q: '75',
  });
  if (aspect === 'square') {
    params.set('h', String(width));
    params.set('fit', 'cover');
  }
  const result = `${PROXY_ORIGIN}?${params.toString()}`;

  if (urlCache.size >= MAX_CACHE_ENTRIES) urlCache.clear();
  urlCache.set(key, result);
  return result;
}

/**
 * Return a small, cacheable version of a remote image URL.
 * Local assets, data/blob URLs and already-proxied URLs are returned untouched.
 */
export function optimizedImageUrl(
  source?: string | null,
  width = 400,
  aspect: ImageAspect = 'square'
): string {
  const url = (source || '').trim();
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:') || isProxyUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return url;
    if (DIRECT_IMAGE_HOSTS.has(parsed.hostname.toLowerCase())) return url;
  } catch {
    return url;
  }

  return proxyUrl(url, Math.max(16, Math.min(2400, Math.round(width))), aspect);
}

/** Width-descriptor srcSet so high-DPI screens get 2x without paying for 3000px. */
export function optimizedImageSrcSet(
  source?: string | null,
  width = 400,
  aspect: ImageAspect = 'square'
): string {
  const url = (source || '').trim();
  if (!url || url.startsWith('/') || url.startsWith('data:') || url.startsWith('blob:') || isProxyUrl(url)) {
    return '';
  }
  try {
    if (DIRECT_IMAGE_HOSTS.has(new URL(url).hostname.toLowerCase())) return '';
  } catch {
    return '';
  }
  return `${optimizedImageUrl(url, width, aspect)} ${width}w, ${optimizedImageUrl(url, width * 2, aspect)} ${width * 2}w`;
}
