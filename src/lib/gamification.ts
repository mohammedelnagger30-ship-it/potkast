export function levelFromXp(xp: number): number {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

export function xpForLevel(level: number): number {
  return Math.pow(level - 1, 2) * 50;
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; percent: number } {
  const level = levelFromXp(xp);
  const levelStart = xpForLevel(level);
  const nextLevel = xpForLevel(level + 1);
  const needed = nextLevel - levelStart;
  const current = xp - levelStart;
  return {
    current,
    needed,
    percent: Math.min((current / needed) * 100, 100),
  };
}

export interface LevelInfo {
  level: number;
  title: string;
  color: string;
}

const levelTitles: { level: number; title: string; color: string }[] = [
  { level: 1, title: 'مبتدئ', color: '#94A3B8' },
  { level: 2, title: 'مبتدئ', color: '#94A3B8' },
  { level: 3, title: 'مبتدئ', color: '#94A3B8' },
  { level: 4, title: 'متعلم', color: '#0EA5E9' },
  { level: 5, title: 'متعلم', color: '#0EA5E9' },
  { level: 6, title: 'متعلم', color: '#0EA5E9' },
  { level: 7, title: 'ممارس', color: '#10B981' },
  { level: 8, title: 'ممارس', color: '#10B981' },
  { level: 9, title: 'ممارس', color: '#10B981' },
  { level: 10, title: 'ملتزم', color: '#D4A017' },
  { level: 11, title: 'ملتزم', color: '#D4A017' },
  { level: 12, title: 'ملتزم', color: '#D4A017' },
  { level: 13, title: 'متقدم', color: '#F97316' },
  { level: 14, title: 'متقدم', color: '#F97316' },
  { level: 15, title: 'متقدم', color: '#F97316' },
  { level: 16, title: 'خبير', color: '#EF4444' },
  { level: 17, title: 'خبير', color: '#EF4444' },
  { level: 18, title: 'خبير', color: '#EF4444' },
  { level: 19, title: 'مرشد', color: '#8B5CF6' },
  { level: 20, title: 'ماستر', color: '#F59E0B' },
];

export function getLevelInfo(xp: number): LevelInfo {
  const level = Math.min(levelFromXp(xp), 20);
  const info = levelTitles[level - 1] || levelTitles[0];
  return { level, title: info.title, color: info.color };
}

export interface Achievement {
  id: string;
  label: string;
  icon: string;
  unlocked: boolean;
  threshold: number;
  metric: 'missions' | 'streak' | 'xp' | 'podcasts';
}

export const achievementDefs: Omit<Achievement, 'unlocked'>[] = [
  { id: 'first_step', label: 'أول خطوة', icon: 'footprints', threshold: 1, metric: 'missions' },
  { id: 'streak_7', label: '7 أيام متتالية', icon: 'flame', threshold: 7, metric: 'streak' },
  { id: 'reader', label: 'قارئ نشط', icon: 'book-open', threshold: 5, metric: 'missions' },
  { id: 'disciplined', label: 'منضبط', icon: 'check-circle', threshold: 15, metric: 'missions' },
  { id: 'inspired', label: 'ملهم', icon: 'sparkles', threshold: 300, metric: 'xp' },
  { id: 'pro', label: 'محترف', icon: 'award', threshold: 1000, metric: 'xp' },
  { id: 'streak_30', label: '30 يوماً', icon: 'trophy', threshold: 30, metric: 'streak' },
  { id: 'listener', label: 'مستمع مميز', icon: 'mic', threshold: 10, metric: 'podcasts' },
  { id: 'missions_50', label: '50 مهمة', icon: 'target', threshold: 50, metric: 'missions' },
  { id: 'missions_100', label: '100 مهمة', icon: 'medal', threshold: 100, metric: 'missions' },
  { id: 'streak_14', label: '14 يوماً', icon: 'zap', threshold: 14, metric: 'streak' },
  { id: 'xp_5000', label: 'خبير', icon: 'crown', threshold: 5000, metric: 'xp' },
  { id: 'podcasts_25', label: '25 حلقة', icon: 'headphones', threshold: 25, metric: 'podcasts' },
  { id: 'xp_2500', label: 'متقدم', icon: 'star', threshold: 2500, metric: 'xp' },
  { id: 'missions_25', label: '25 مهمة', icon: 'rocket', threshold: 25, metric: 'missions' },
  { id: 'streak_3', label: '3 أيام', icon: 'leaf', threshold: 3, metric: 'streak' },
];

export const achievementColors: Record<string, { bg: string; ring: string; text: string }> = {
  first_step: { bg: 'from-emerald-400 to-emerald-600', ring: 'ring-emerald-300', text: 'text-emerald-600' },
  streak_7: { bg: 'from-orange-400 to-orange-600', ring: 'ring-orange-300', text: 'text-orange-600' },
  reader: { bg: 'from-blue-400 to-blue-600', ring: 'ring-blue-300', text: 'text-blue-600' },
  disciplined: { bg: 'from-teal-400 to-teal-600', ring: 'ring-teal-300', text: 'text-teal-600' },
  inspired: { bg: 'from-purple-400 to-purple-600', ring: 'ring-purple-300', text: 'text-purple-600' },
  pro: { bg: 'from-amber-400 to-amber-600', ring: 'ring-amber-300', text: 'text-amber-600' },
  streak_30: { bg: 'from-yellow-400 to-yellow-600', ring: 'ring-yellow-300', text: 'text-yellow-600' },
  listener: { bg: 'from-pink-400 to-pink-600', ring: 'ring-pink-300', text: 'text-pink-600' },
  missions_50: { bg: 'from-cyan-400 to-cyan-600', ring: 'ring-cyan-300', text: 'text-cyan-600' },
  missions_100: { bg: 'from-red-400 to-red-600', ring: 'ring-red-300', text: 'text-red-600' },
  streak_14: { bg: 'from-lime-400 to-lime-600', ring: 'ring-lime-300', text: 'text-lime-600' },
  xp_5000: { bg: 'from-indigo-400 to-indigo-600', ring: 'ring-indigo-300', text: 'text-indigo-600' },
  podcasts_25: { bg: 'from-rose-400 to-rose-600', ring: 'ring-rose-300', text: 'text-rose-600' },
  xp_2500: { bg: 'from-sky-400 to-sky-600', ring: 'ring-sky-300', text: 'text-sky-600' },
  missions_25: { bg: 'from-violet-400 to-violet-600', ring: 'ring-violet-300', text: 'text-violet-600' },
  streak_3: { bg: 'from-green-400 to-green-600', ring: 'ring-green-300', text: 'text-green-600' },
};

export function formatXp(xp: number): string {
  if (xp >= 1000) return `${(xp / 1000).toFixed(1)}k`;
  return xp.toString();
}

export function formatListeningTime(seconds: number): string {
  if (seconds === 0) return '0 دقيقة';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;
  if (hours < 24) return remMins > 0 ? `${hours} س ${remMins} د` : `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days} ي ${remHours} س` : `${days} يوم`;
}
