import type { Podcast } from '@/types/podcast';

/**
 * Real podcast artwork only.
 *
 * Some imported feeds stored the presenter's portrait as the cover of every
 * series, and their episodes have no image_url. For those few shows we use the
 * artwork of the matching YouTube playlist/episode — an actual image, not a
 * generated label. Where an episode image exists, it wins first.
 */

const COVER_OVERRIDES: Record<string, string> = {
  // د. أحمد عبد المنعم — playlists linked from the imported RSS feeds.
  '0fec59ca-1f6e-52a8-af96-bab6c7c57bce': 'https://i.ytimg.com/vi/PCvkBlD_wvs/hqdefault.jpg', // تربويات
  'b22031ab-10ac-5f81-9f92-ff1f8cd0035f': 'https://i.ytimg.com/vi/FD2pnGsMEcY/hqdefault.jpg', // عن القرآن
  '07d7b7ba-b3a0-5d81-b4db-7ea06b6352ad': 'https://i.ytimg.com/vi/U_BAOVorAnQ/hqdefault.jpg', // هدى للناس

  // عبد الرحمن منصور — matching series/episode artwork.
  '6d2b4b52-fa59-5699-bc59-2e16a7fd08a0': 'https://i.ytimg.com/vi/TyaO8XGQp5g/hqdefault.jpg', // الناس والسحر
  'c1dcf32b-2e15-5713-926d-cb0fb7e9a09e': 'https://i.ytimg.com/vi/7jTyTU04R5o/hqdefault.jpg', // للبيوت أسرار
  '053d2ac3-bb78-5607-afde-e4342aca6cc4': 'https://i.ytimg.com/vi/uyKVwqs3iIY/hqdefault.jpg', // قصة التأهيل
  '87bc3a87-dbaa-5311-ac97-ba2f0c9f6b23': 'https://i.ytimg.com/vi/RkHvi2E8NnE/hqdefault.jpg', // أضلني صاحبي
  '97e440b7-bef7-597c-a67c-40dbfa6ef98a': 'https://i.ytimg.com/vi/BE5-FL-t1R8/hqdefault.jpg', // محاضرات متنوعة
};

function isReusedPortrait(url: string, host?: Podcast['host']): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (hostname.endsWith('facebook.com') && path.includes('/picture')) return true;
    if (hostname === 'raw.githubusercontent.com' && path.endsWith('/a-abdelmonem.jpg')) return true;

    if (host?.photo_url) {
      const portrait = new URL(host.photo_url);
      if (portrait.href === parsed.href) return true;
    }
  } catch {
    // Malformed URLs are handled by the image component; never override here.
  }
  return false;
}

/**
 * Cover of the first episode when available, then verified series artwork,
 * then the feed's own cover. Never generates placeholder text.
 */
export function podcastCoverUrl(
  podcast: Pick<Podcast, 'id' | 'title' | 'cover_url'> & { host?: Podcast['host'] },
  episodeCover?: string | null
): string {
  const cover = (podcast.cover_url || '').trim();
  const realEpisodeCover = (episodeCover || '').trim();

  if (realEpisodeCover) return realEpisodeCover;

  const override = COVER_OVERRIDES[podcast.id];
  if (override) return override;

  return cover;
}
