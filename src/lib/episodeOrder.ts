import type { Episode } from '@/types/podcast';

/** Helpers for a predictable, human-friendly episode order. */

const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const ORDINALS: Record<string, number> = {
  'الأول': 1, 'الاول': 1, 'الأولى': 1, 'الاولى': 1,
  'الثاني': 2, 'الثانية': 2,
  'الثالث': 3, 'الثالثة': 3,
  'الرابع': 4, 'الرابعة': 4,
  'الخامس': 5, 'الخامسة': 5,
  'السادس': 6, 'السادسة': 6,
  'السابع': 7, 'السابعة': 7,
  'الثامن': 8, 'الثامنة': 8,
  'التاسع': 9, 'التاسعة': 9,
  'العاشر': 10, 'العاشرة': 10,
  'الحادي عشر': 11, 'الحادية عشر': 11,
  'الثاني عشر': 12, 'الثالث عشر': 13, 'الرابع عشر': 14, 'الخامس عشر': 15,
};

function normalize(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => ARABIC_DIGITS[d] || d).trim();
}

/**
 * Extract the episode number from real titles.
 *
 * Feeds use shapes like "001_..." , "الدرس السابع" and
 * "خواطر (2) » 01 - العنوان". The number after » / - / : is the episode, not
 * the season number in brackets, so prefer those markers before falling back
 * to a leading number.
 */
export function episodeNumber(title: string): number | null {
  const value = normalize(title || '');

  const patterns = [
    /^\s*(\d{1,4})(?!\d)/,
    /(?:الحلقة|الدرس|الجزء|الفصل|الجلسة|المحاضرة|اللقاء)\s*(\d{1,4})(?!\d)/,
    /[»›:]\s*(\d{1,4})(?!\d)/,
    /[-–—_]\s*(\d{1,4})(?!\d)/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return parseInt(match[1], 10);
  }

  const ordinal = Object.keys(ORDINALS).find((word) => value.includes(word));
  return ordinal ? ORDINALS[ordinal] : null;
}

const timestamp = (ep: Episode): number => {
  const value = Date.parse(ep.published_at || '');
  return Number.isFinite(value) ? value : 0;
};

const byTitle = (a: Episode, b: Episode): number =>
  a.title.localeCompare(b.title, 'ar') || a.id.localeCompare(b.id);

/** Series order: numbered lessons first (1 → 2 → 3), then by date. */
export function bySeries(a: Episode, b: Episode): number {
  const na = episodeNumber(a.title);
  const nb = episodeNumber(b.title);
  if (na !== null || nb !== null) {
    if (na === null) return 1;
    if (nb === null) return -1;
    if (na !== nb) return na - nb;
  }
  return timestamp(a) - timestamp(b) || byTitle(a, b);
}

/** Newest first, with deterministic tie-breakers so the list never reshuffles. */
export function byLatest(a: Episode, b: Episode): number {
  return timestamp(b) - timestamp(a) || byTitle(a, b);
}

/** Oldest first — useful when someone wants to follow a course from the start. */
export function byOldest(a: Episode, b: Episode): number {
  return timestamp(a) - timestamp(b) || byTitle(a, b);
}

/** Most played first, then newest. */
export function byPlays(a: Episode, b: Episode): number {
  return (b.plays_count || 0) - (a.plays_count || 0) || byLatest(a, b);
}
