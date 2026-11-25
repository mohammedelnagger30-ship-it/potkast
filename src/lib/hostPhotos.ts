const HOST_PHOTO_FALLBACKS: Record<string, string> = {
  // Wikimedia Commons / Wikidata: Ahmad Al-Shugairi (أحمد الشقيري).
  // The imported RSS feeds have no artwork, so keep a known good portrait
  // available even before the database migration is run.
  'ahmed-al-shugairi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shukairy_2010.jpg',
  'ahmad-al-shugairi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Ahmad_Al-Shukairy_2010.jpg/500px-Ahmad_Al-Shukairy_2010.jpg',
};

/** Database photo first, then a verified fallback for hosts whose feed has no artwork. */
export function hostPhotoUrl(host?: { slug?: string | null; photo_url?: string | null } | null): string {
  if (host?.photo_url) return host.photo_url;
  return (host?.slug && HOST_PHOTO_FALLBACKS[host.slug]) || '';
}
