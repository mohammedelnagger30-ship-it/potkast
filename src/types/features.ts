export interface WheelSpin {
  id: string;
  user_id: string;
  spin_date: string;
  reward_type: 'xp' | 'tip' | 'mission' | 'streak_shield';
  reward_amount: number;
  reward_detail: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  mood: 'great' | 'good' | 'neutral' | 'down' | 'stressed';
  content: string;
  linked_mission_id: string | null;
  linked_episode_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LifeWheelAssessment {
  id: string;
  user_id: string;
  spiritual: number;
  health: number;
  career: number;
  finance: number;
  relationships: number;
  mental: number;
  growth: number;
  fun: number;
  notes: string;
  created_at: string;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category_id: string | null;
  duration_weeks: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  cover_emoji: string;
  created_at: string;
}

export interface LearningPathStep {
  id: string;
  path_id: string;
  step_order: number;
  title: string;
  description: string;
  step_type: 'podcast' | 'mission' | 'tip' | 'reflection';
  linked_episode_id: string | null;
  linked_mission_id: string | null;
  tip_text: string | null;
  xp_reward: number;
}

export interface UserPathEnrollment {
  id: string;
  user_id: string;
  path_id: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface EpisodeBookmark {
  id: string;
  user_id: string;
  episode_id: string;
  timestamp_seconds: number;
  note: string;
  created_at: string;
}

export interface EpisodeNote {
  id: string;
  user_id: string;
  episode_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export const moodMeta: Record<string, { label: string; emoji: string; color: string }> = {
  great: { label: 'ممتاز', emoji: '😄', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
  good: { label: 'جيد', emoji: '🙂', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  neutral: { label: 'عادي', emoji: '😐', color: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500' },
  down: { label: 'محبط', emoji: '😔', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  stressed: { label: 'متوتر', emoji: '😣', color: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
};

export const lifeWheelAreas: { key: string; label: string; interestKey: string }[] = [
  { key: 'spiritual', label: 'الروحانية', interestKey: 'spiritual' },
  { key: 'health', label: 'الصحة واللياقة', interestKey: 'health' },
  { key: 'career', label: 'المسيرة المهنية', interestKey: 'career' },
  { key: 'finance', label: 'المال', interestKey: 'finance' },
  { key: 'relationships', label: 'العلاقات', interestKey: 'relationships' },
  { key: 'mental', label: 'الصحة النفسية', interestKey: 'mental' },
  { key: 'growth', label: 'النمو الشخصي', interestKey: 'leadership' },
  { key: 'fun', label: 'الترفيه والمرح', interestKey: 'culture' },
];

export const pathDifficultyLabels: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};
