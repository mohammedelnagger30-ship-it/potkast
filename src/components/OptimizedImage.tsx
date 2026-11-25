import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { optimizedImageUrl, optimizedImageSrcSet, type ImageAspect } from '@/lib/imageUrls';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  src?: string | null;
  /** Rendered width in CSS pixels. The 2x candidate is generated automatically. */
  width?: number;
  aspect?: ImageAspect;
  priority?: boolean;
  sizes?: string;
}

/**
 * <img> that requests a small, cacheable artwork variant and falls back to the
 * original URL if the proxy is unavailable. Every remote image in lists uses
 * this so opening a page no longer downloads multi-megabyte feed artwork.
 */
export function OptimizedImage({
  src,
  width = 400,
  aspect = 'square',
  priority = false,
  sizes = '(max-width: 640px) 45vw, 220px',
  loading,
  fetchPriority,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [current, setCurrent] = useState(() => optimizedImageUrl(src, width, aspect));
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    setCurrent(optimizedImageUrl(src, width, aspect));
    setUsedFallback(false);
  }, [src, width, aspect]);

  if (!src) return null;

  const srcSet = usedFallback ? undefined : optimizedImageSrcSet(src, width, aspect);

  return (
    <img
      {...rest}
      src={current}
      srcSet={srcSet || undefined}
      sizes={srcSet ? sizes : undefined}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      fetchPriority={fetchPriority ?? (priority ? 'high' : 'low')}
      decoding="async"
      onError={(event) => {
        if (!usedFallback && current !== src) {
          setUsedFallback(true);
          setCurrent(src);
        }
        onError?.(event);
      }}
    />
  );
}
