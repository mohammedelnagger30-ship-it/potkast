export interface Category {
  id: string;
  name_ar: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface HostSocialLinks {
  youtube?: string;
  twitter?: string;
  instagram?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface Host {
  id: string;
  name_ar: string;
  slug: string;
  photo_url: string;
  cover_url: string;
  title_ar: string;
  specialty_ar: string;
  bio_ar: string;
  country: string;
  category_id: string | null;
  is_verified: boolean;
  followers_count: number;
  social_links: HostSocialLinks;
  created_at: string;
  category?: Category;
  podcasts_count?: number;
  is_following?: boolean;
}

export interface Podcast {
  id: string;
  title: string;
  description: string;
  host_name: string;
  host_bio: string;
  host_id: string | null;
  host?: Host;
  plays_count: number;
  rating_avg: number;
  category_id: string;
  type: 'religious' | 'scientific' | 'cultural' | 'motivational' | 'professional';
  cover_url: string;
  audience_level: 'beginner' | 'intermediate' | 'expert';
  created_at: string;
  category?: Category;
  is_favorited?: boolean;
}

export interface Episode {
  id: string;
  podcast_id: string;
  title: string;
  description: string;
  audio_url: string;
  duration_seconds: number;
  plays_count: number;
  published_at: string;
  podcast?: Podcast;
}

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('ar-EG');
}

export interface Favorite {
  user_id: string;
  podcast_id: string;
  created_at: string;
}

export interface ListeningHistory {
  user_id: string;
  episode_id: string;
  progress_seconds: number;
  completed: boolean;
  updated_at: string;
}

export const typeLabels: Record<string, string> = {
  religious: 'ديني',
  scientific: 'علمي',
  cultural: 'ثقافي',
  motivational: 'تحفيزي',
  professional: 'مهني',
};

export const levelLabels: Record<string, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  expert: 'متقدم',
};

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} س ${remMins} د`;
  }
  return `${mins} د ${secs > 0 ? `${secs} ث` : ''}`;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `قبل ${diffDays} أيام`;
  if (diffDays < 14) return 'قبل أسبوع';
  if (diffDays < 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays < 60) return 'قبل شهر';
  return `قبل ${Math.floor(diffDays / 30)} أشهر`;
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
