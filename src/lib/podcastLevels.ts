import { levelLabels } from '@/types/podcast';

export type PodcastLevel = 'beginner' | 'intermediate' | 'expert';

/** Display order of the level filter, independent of whatever the DB contains. */
export const PODCAST_LEVELS: PodcastLevel[] = ['beginner', 'intermediate', 'expert'];

/**
 * Older imports and the learning-path tables use slightly different level
 * names. Normalise them so the podcast filter and badges always agree.
 */
export function normalizePodcastLevel(value: unknown): PodcastLevel | '' {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'beginner' || raw === 'مبتدئ' || raw === 'مبتداء') return 'beginner';
  if (raw === 'intermediate' || raw === 'متوسط') return 'intermediate';
  if (raw === 'advanced' || raw === 'expert' || raw === 'متقدم' || raw === 'خبير') return 'expert';
  return '';
}

export function podcastLevelLabel(value: unknown): string {
  const level = normalizePodcastLevel(value);
  if (level) return levelLabels[level];
  const raw = String(value ?? '').trim();
  return raw === 'all' ? 'الكل' : raw;
}
