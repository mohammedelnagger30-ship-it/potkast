// Verified portraits that must win over stale artwork imported from RSS feeds.
const HOST_PHOTO_OVERRIDES: Record<string, string> = {
  // د. أحمد عبد المنعم — official public profile (@A_Abdelmonem82), which links
  // to إنه القرآن. The old SoundCloud avatar is no longer representative.
  'ahmed-abdelmoneim': 'https://unavatar.io/x/A_Abdelmonem82',
};

const HOST_PHOTO_FALLBACKS: Record<string, string> = {
  // Wikimedia Commons / Wikidata: Ahmad Al-Shugairi (أحمد الشقيري).
  // The imported RSS feeds have no artwork, so keep a known good portrait
  // available even before the database migration is run.
  'ahmed-al-shugairi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shugairi_2010.jpg',
  'ahmad-al-shugairi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shugairy_2010.jpg/500px-Ahmad_Al-Shugairi_2010.jpg',
};

/** Verified override first, database photo second, then a known fallback. */
export function hostPhotoUrl(host?: { slug?: string | null; photo_url?: string | null } | null): string {
  if (host?.slug && HOST_PHOTO_OVERRIDES[host.slug]) return HOST_PHOTO_OVERRIDES[host.slug];
  if (host?.photo_url) return host.photo_url;
  return (host?.slug && HOST_PHOTO_FALLBACKS[host.slug]) || '';
}
