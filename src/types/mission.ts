import type { Category, Episode } from './podcast';

export type MissionDifficulty = 'easy' | 'medium' | 'hard';
export type MissionType = 'daily' | 'weekly' | 'challenge';
export type UserMissionStatus = 'pending' | 'in_progress' | 'completed';

export interface Mission {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  difficulty: MissionDifficulty;
  xp_reward: number;
  duration_minutes: number;
  type: MissionType;
  linked_episode_id: string | null;
  created_at: string;
  category?: Category;
  linked_episode?: Episode;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  status: UserMissionStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  assigned_date: string;
  created_at: string;
  mission?: Mission;
}

export const difficultyLabels: Record<MissionDifficulty, string> = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export const difficultyBadgeVariant: Record<MissionDifficulty, 'success' | 'warning' | 'error'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
};

export const typeLabels: Record<MissionType, string> = {
  daily: 'يومية',
  weekly: 'أسبوعية',
  challenge: 'تحدي',
};

export const statusLabels: Record<UserMissionStatus, string> = {
  pending: 'في الانتظار',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتملة',
};

export function formatDurationShort(minutes: number): string {
  if (minutes === 0) return '—';
  if (minutes < 60) return `${minutes} دقيقة`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} ساعة`;
  return `${hrs} س ${mins} د`;
}

export const interestToCategoryMap: Record<string, string> = {
  spiritual: 'روحاني / ديني',
  science: 'العلوم',
  culture: 'ثقافة وأدب',
  health: 'الصحة واللياقة',
  career: 'المسيرة المهنية',
  finance: 'المال والاستثمار',
  relationships: 'العلاقات والأسرة',
  mental: 'الصحة النفسية',
  leadership: 'القيادة',
  technology: 'التقنية',
};
