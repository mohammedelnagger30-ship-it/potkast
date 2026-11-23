import type { Category, Podcast } from '@/types/podcast';

/** Lightweight offline cache for the podcast catalog list. */
const CACHE_KEY = 'sada:catalog-cache-v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedCatalog {
  podcasts: Podcast[];
  categories: Category[];
  savedAt: number;
}

export function readCatalogCache(): CachedCatalog | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCatalog;
    if (!Array.isArray(parsed.podcasts) || !Array.isArray(parsed.categories)) return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCatalogCache(podcasts: Podcast[], categories: Category[]): void {
  try {
    const payload: CachedCatalog = { podcasts, categories, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage is optional — the live query still works.
  }
}
