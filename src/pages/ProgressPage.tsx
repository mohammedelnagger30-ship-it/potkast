import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, ProgressBar } from '@/components/ui';
import {
  TrendingUp, Award, Calendar, Zap, Flame, Mic, Target,
  BookOpen, Footprints, CheckCircle, Sparkles, Trophy, Clock, Headphones,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  getLevelInfo, xpProgressInLevel, achievementDefs,
  formatListeningTime, type Achievement,
} from '@/lib/gamification';
import { CategoryRadarChart, WeeklyBarChart, CalendarHeatmap } from '@/components/Charts';
import type { UserMission } from '@/types/mission';

const iconMap: Record<string, typeof Award> = {
  footprints: Footprints,
  flame: Flame,
  'book-open': BookOpen,
  'check-circle': CheckCircle,
  sparkles: Sparkles,
  award: Award,
  trophy: Trophy,
  mic: Mic,
};

interface CategoryProgressData {
  label: string;
  value: number;
  missionsCompleted: number;
  minutesListened: number;
  xp: number;
}

interface WeeklyActivity {
  day: string;
  missions: number;
  xp: number;
  listening: number;
}

interface HeatmapDay {
  date: string;
  count: number;
  level: number;
}

export default function ProgressPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [listenedCount, setListenedCount] = useState(0);
  const [totalListeningSeconds, setTotalListeningSeconds] = useState(0);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgressData[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<WeeklyActivity[]>([]);
  const [heatmapDays, setHeatmapDays] = useState<HeatmapDay[]>([]);

  const loadProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch completed missions with category info
    const { data: completedMissions } = await supabase
      .from('user_missions')
      .select('id, completed_at, assigned_date, status, mission:missions(*, category:categories(*))')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const completed = (completedMissions as unknown as UserMission[]) || [];
    setMissionsCompleted(completed.length);

    // Fetch listening history with episode duration info
    const { data: listened } = await supabase
      .from('listening_history')
      .select('id, episode_id, progress_seconds, completed, updated_at, episode:episodes(*, podcast:podcasts(*, category:categories(*), host:hosts(*)))')
      .eq('user_id', user.id);

    const listenedData = listened || [];
    setListenedCount(listenedData.length);

    // Total listening seconds
    const totalSeconds = listenedData.reduce((sum: number, item: any) => {
      const progress = item.progress_seconds || 0;
      return sum + progress;
    }, 0);
    setTotalListeningSeconds(totalSeconds);

    // XP
    const currentXp = profile?.xp || 0;
    setXp(currentXp);

    // Calculate streak from completed mission dates
    const allCompletedDates = completed
      .filter((um) => um.completed_at)
      .map((um) => new Date(um.completed_at!).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(allCompletedDates)].sort().reverse();

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
        currentStreak = 1;
        for (let i = 1; i < uniqueDates.length; i++) {
          const prev = new Date(uniqueDates[i - 1]);
          const curr = new Date(uniqueDates[i]);
          const diff = (prev.getTime() - curr.getTime()) / 86400000;
          if (Math.round(diff) === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }
    setStreak(currentStreak);
    setActiveDays(uniqueDates.length);

    // Calculate longest streak
    let maxStreak = 0;
    let tempStreak = 0;
    const sortedAsc = [...uniqueDates].sort();
    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diff = (curr.getTime() - prev.getTime()) / 86400000;
        if (Math.round(diff) === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      maxStreak = Math.max(maxStreak, tempStreak);
    }
    setLongestStreak(maxStreak);

    // Fetch all categories for radar chart
    const { data: allCategories } = await supabase
      .from('categories')
      .select('id, name_ar, icon, color')
      .order('name_ar');

    // Build category progress data
    const catMissionMap: Record<string, number> = {};
    const catXpMap: Record<string, number> = {};
    const catListenMap: Record<string, number> = {};

    completed.forEach((um) => {
      const catId = um.mission?.category_id;
      if (catId) {
        catMissionMap[catId] = (catMissionMap[catId] || 0) + 1;
        catXpMap[catId] = (catXpMap[catId] || 0) + (um.mission?.xp_reward || 0);
      }
    });

    listenedData.forEach((item: any) => {
      const catId = item.episode?.podcast?.category_id;
      if (catId) {
        catListenMap[catId] = (catListenMap[catId] || 0) + Math.floor((item.progress_seconds || 0) / 60);
      }
    });

    const maxMissions = Math.max(...Object.values(catMissionMap), 1);
    const maxListen = Math.max(...Object.values(catListenMap), 1);

    const catData: CategoryProgressData[] = (allCategories || []).map((cat: any) => {
      const missions = catMissionMap[cat.id] || 0;
      const minutes = catListenMap[cat.id] || 0;
      const catXp = catXpMap[cat.id] || 0;
      const missionPct = (missions / maxMissions) * 100;
      const listenPct = (minutes / maxListen) * 100;
      return {
        label: cat.name_ar,
        value: Math.round((missionPct + listenPct) / 2),
        missionsCompleted: missions,
        minutesListened: minutes,
        xp: catXp,
      };
    }).filter((c) => c.missionsCompleted > 0 || c.minutesListened > 0)
      .sort((a, b) => b.value - a.value);

    setCategoryProgress(catData);

    // Weekly activity (last 7 days)
    const dayLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const today = new Date();
    const weekData: WeeklyActivity[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = dayLabels[date.getDay()];

      const dayMissions = completed.filter((um) => {
        if (!um.completed_at) return false;
        return new Date(um.completed_at).toISOString().split('T')[0] === dateStr;
      });

      const dayXp = dayMissions.reduce((sum, um) => sum + (um.mission?.xp_reward || 0), 0);

      const dayListening = listenedData.filter((item: any) => {
        if (!item.updated_at) return false;
        return new Date(item.updated_at).toISOString().split('T')[0] === dateStr;
      });
      const listenSeconds = dayListening.reduce((sum: number, item: any) => sum + (item.progress_seconds || 0), 0);

      weekData.push({
        day: dayName,
        missions: dayMissions.length,
        xp: dayXp,
        listening: Math.floor(listenSeconds / 60),
      });
    }
    setWeeklyActivity(weekData);

    // Calendar heatmap (last 84 days = 12 weeks)
    const heatDays: HeatmapDay[] = [];
    const dateCountMap: Record<string, number> = {};
    completed.forEach((um) => {
      if (um.completed_at) {
        const d = new Date(um.completed_at).toISOString().split('T')[0];
        dateCountMap[d] = (dateCountMap[d] || 0) + 1;
      }
    });
    listenedData.forEach((item: any) => {
      if (item.updated_at) {
        const d = new Date(item.updated_at).toISOString().split('T')[0];
        dateCountMap[d] = (dateCountMap[d] || 0) + 1;
      }
    });

    const maxCount = Math.max(...Object.values(dateCountMap), 1);
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = dateCountMap[dateStr] || 0;
      const level = count === 0 ? 0 : Math.ceil((count / maxCount) * 4);
      heatDays.push({ date: dateStr, count, level });
    }
    setHeatmapDays(heatDays);

    // Achievements
    const unlockedAchievements: Achievement[] = achievementDefs.map((def) => {
      let unlocked = false;
      switch (def.metric) {
        case 'missions': unlocked = completed.length >= def.threshold; break;
        case 'streak': unlocked = maxStreak >= def.threshold; break;
        case 'xp': unlocked = currentXp >= def.threshold; break;
        case 'podcasts': unlocked = listenedData.length >= def.threshold; break;
      }
      return { ...def, unlocked };
    });
    setAchievements(unlockedAchievements);

    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const levelInfo = getLevelInfo(xp);
  const xpProgress = xpProgressInLevel(xp);
  const overallPercent = xpProgress.percent;

  // Radar chart data from category progress
  const radarData = categoryProgress.map((c) => ({
    category: c.label.length > 10 ? c.label.substring(0, 8) + '…' : c.label,
    value: c.value,
  }));

  if (loading) {
    return (
      <Layout title="تقدّمي">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="تقدّمي">
      {/* Overall progress ring + level info */}
      <div className="mb-6">
        <Card className="flex items-center gap-6">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-neutral-200 dark:stroke-neutral-800" />
              <circle
                cx="60" cy="60" r="52" fill="none" strokeWidth="10"
                stroke={levelInfo.color} strokeLinecap="round"
                className="transition-all duration-700"
                strokeDasharray="327"
                strokeDashoffset={327 - (327 * overallPercent) / 100}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-neutral-900 dark:text-white">{Math.round(overallPercent)}%</span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">المستوى {levelInfo.level}</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white mb-1">
              {levelInfo.title}
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {xpProgress.needed - xpProgress.current} نقطة للمستوى {levelInfo.level + 1}
            </p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Badge variant="primary">المستوى {levelInfo.level}</Badge>
              <Badge variant="accent">{xp.toLocaleString('ar-EG')} نقطة</Badge>
              {streak > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold">
                  <Flame size={12} />
                  {streak} أيام
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Zap, label: 'نقاط الخبرة', value: xp.toLocaleString('ar-EG'), color: 'text-accent-500' },
          { icon: Calendar, label: 'أيام نشطة', value: activeDays.toString(), color: 'text-primary-600' },
          { icon: Target, label: 'مهام مكتملة', value: missionsCompleted.toString(), color: 'text-success-500' },
          { icon: Flame, label: 'أطول سلسلة', value: longestStreak.toString(), color: 'text-orange-500' },
        ].map((stat, i) => (
          <Card key={i}>
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 ${stat.color} mb-2`}>
              <stat.icon size={18} />
            </div>
            <p className="text-xl font-extrabold text-neutral-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Radar chart */}
      {radarData.length >= 3 && (
        <Card className="mb-6">
          <CardHeader title="خريطة التطوّر" subtitle="تقدّمك في كل مجال تطويري" />
          <CategoryRadarChart data={radarData} />
        </Card>
      )}

      {/* Weekly activity bar chart */}
      <Card className="mb-6">
        <CardHeader title="نشاط هذا الأسبوع" subtitle="المهام المكتملة خلال آخر 7 أيام" />
        <WeeklyBarChart data={weeklyActivity} />
      </Card>

      {/* Category progress bars */}
      {categoryProgress.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="التقدّم حسب المجال" subtitle="نسبة إنجازك في كل مجال" />
          <div className="space-y-4">
            {categoryProgress.map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{cat.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400">{cat.missionsCompleted} مهمة</span>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">{cat.value}%</span>
                  </div>
                </div>
                <ProgressBar
                  value={cat.value}
                  variant={i % 3 === 0 ? 'primary' : i % 3 === 1 ? 'accent' : 'success'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Listening stats */}
      <Card className="mb-6">
        <CardHeader title="نشاط الاستماع" subtitle="إحصائيات البودكاست" />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
              <Headphones size={26} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{listenedCount}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">حلقة استمعت لها</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400">
              <Clock size={26} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{formatListeningTime(totalListeningSeconds)}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">وقت الاستماع</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar heatmap */}
      <Card className="mb-6">
        <CardHeader title="خريطة النشاط" subtitle="آخر 12 أسبوع" />
        <CalendarHeatmap days={heatmapDays} />
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader title="الإنجازات" subtitle={`${achievements.filter(a => a.unlocked).length} من ${achievements.length} وسام`} />
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {achievements.map((ach) => {
            const Icon = iconMap[ach.icon] || Award;
            return (
              <div
                key={ach.id}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-900/10'
                    : 'bg-neutral-50 dark:bg-neutral-800/30 opacity-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  ach.unlocked
                    ? 'bg-gradient-to-br from-accent-400 to-accent-600 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400'
                }`}>
                  <Icon size={22} />
                </div>
                <span className={`text-xs font-semibold text-center ${
                  ach.unlocked ? 'text-neutral-700 dark:text-neutral-300' : 'text-neutral-400'
                }`}>
                  {ach.label}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </Layout>
  );
}
