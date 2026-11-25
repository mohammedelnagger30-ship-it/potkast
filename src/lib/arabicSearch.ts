const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;

const ARABIC_MAP: Array<[RegExp, string]> = [
  [/[أإآٱ]/g, 'ا'],
  [/[ى]/g, 'ي'],
  [/[ؤ]/g, 'و'],
  [/[ئ]/g, 'ي'],
  [/[ة]/g, 'ه'],
  [/[ڪ]/g, 'ك'],
  [/[ی]/g, 'ي'],
  [/[ۀ]/g, 'ه'],
];

export function normalizeArabicSearch(value: string | null | undefined): string {
  let text = String(value || '').toLowerCase().trim();
  text = text.replace(ARABIC_DIACRITICS, '');
  for (const [pattern, replacement] of ARABIC_MAP) {
    text = text.replace(pattern, replacement);
  }
  // normalize punctuation/whitespace for fuzzy-ish matching
  text = text.replace(/[^\p{L}\p{N}\s]+/gu, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

export function matchesArabicSearch(haystack: string | null | undefined, query: string): boolean {
  const q = normalizeArabicSearch(query);
  if (!q) return true;
  const h = normalizeArabicSearch(haystack);
  if (h.includes(q)) return true;
  // also match each token so "احمد عامر" matches in any order/extra spaces
  const tokens = q.split(' ').filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => h.includes(t));
}

export function matchesAnyArabicSearch(query: string, ...fields: Array<string | null | undefined>): boolean {
  const q = normalizeArabicSearch(query);
  if (!q) return true;
  const normalizedFields = fields.map(normalizeArabicSearch);
  if (normalizedFields.some((h) => h.includes(q))) return true;
  const tokens = q.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => normalizedFields.some((h) => h.includes(t)));
}
