import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, ProgressBar } from '@/components/ui';
import {
  User as UserIcon,
  Settings,
  Award,
  Zap,
  Calendar,
  Bell,
  ChevronLeft,
  Moon,
  LogOut,
  Clock,
  Heart,
  Trophy,
  Route,
  BookHeart,
  CircleDot,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import { levelFromXp, xpProgressInLevel, achievementDefs } from '@/lib/gamification';

const interestLabels: Record<string, string> = {
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

export default function ProfilePage() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [missionsCompleted, setMissionsCompleted] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(0);

  const loadStats = useCallback(async () => {
    if (!user) return;

    const { data: completed } = await supabase
      .from('user_missions')
      .select('completed_at')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    setMissionsCompleted(completed?.length || 0);

    const dates = [...new Set(
      (completed || [])
        .filter((c) => c.completed_at)
        .map((c) => new Date(c.completed_at!).toISOString().split('T')[0])
    )];
    setActiveDays(dates.length);

    // Calculate unlocked achievements
    const xp = profile?.xp || 0;
    const unlocked = achievementDefs.filter((def) => {
      switch (def.metric) {
        case 'missions': return (completed?.length || 0) >= def.threshold;
        case 'xp': return xp >= def.threshold;
        case 'streak': return false; // simplified
        default: return false;
      }
    });
    setUnlockedCount(unlocked.length);
  }, [user, profile]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const displayName = profile?.name || user?.email?.split('@')[0] || 'مستخدم نمّي';
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })
    : '';
  const initials = displayName.charAt(0);
  const xp = profile?.xp || 0;
  const level = levelFromXp(xp);
  const xpProgress = xpProgressInLevel(xp);

  return (
    <Layout title="الملف الشخصي">
      {/* Profile header */}
      <div className="mb-6">
        <Card className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-extrabold mx-auto">
              {initials}
            </div>
            <div className="absolute bottom-0 left-0 w-7 h-7 rounded-full bg-success-500 border-4 border-white dark:border-neutral-900" />
          </div>
          <h2 className="text-xl font-extrabold text-neutral-900 dark:text-white">{displayName}</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {user?.email}
          </p>
          {memberSince && (
            <p className="text-xs text-neutral-400 mt-0.5">عضو منذ {memberSince}</p>
          )}
          <div className="flex justify-center gap-2 mt-3">
            <Badge variant="primary">
              <Zap size={14} className="ml-1" />
              المستوى {level}
            </Badge>
            <Badge variant="accent">
              <Award size={14} className="ml-1" />
              {unlockedCount} أوسمة
            </Badge>
          </div>
          <div className="mt-4 max-w-xs mx-auto">
            <ProgressBar value={xpProgress.percent} showLabel size="sm" variant="accent" />
            <p className="text-xs text-neutral-400 mt-1.5">
              {xpProgress.needed - xpProgress.current} نقطة للمستوى التالي
            </p>
          </div>
        </Card>
      </div>

      {/* Onboarding info */}
      <Card className="mb-6">
        <CardHeader title="تفضيلاتي" subtitle="الخيارات التي اخترتها أثناء الإعداد" />
        <div className="space-y-4">
          {/* Interests */}
          {profile?.interests && profile.interests.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart size={16} className="text-primary-600" />
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  مجالات الاهتمام
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((id) => (
                  <Badge key={id} variant="primary" size="sm">
                    {interestLabels[id] || id}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Daily goal */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-accent-500" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                الهدف اليومي
              </span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 pr-6">
              {profile?.daily_goal_minutes || 15} دقيقة يومياً
            </p>
          </div>

          {/* Reminder time */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={16} className="text-primary-600" />
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                وقت التذكير
              </span>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 pr-6" dir="ltr">
              {profile?.reminder_time || '08:00'}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Zap, label: 'نقاط', value: xp.toLocaleString('ar-EG') },
          { icon: Calendar, label: 'أيام نشطة', value: activeDays.toString() },
          { icon: Award, label: 'أوسمة', value: unlockedCount.toString() },
        ].map((s, i) => (
          <Card key={i} className="text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mx-auto mb-2">
              <s.icon size={18} />
            </div>
            <p className="text-lg font-extrabold text-neutral-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Settings */}
      <Card>
        <CardHeader title="الإعدادات" />
        <div className="space-y-1">
          {[
            { icon: Award, label: 'إنجازاتي وأوسمتي', to: '/achievements' },
            { icon: BookHeart, label: 'مذكراتي اليومية', to: '/journal' },
            { icon: CircleDot, label: 'عجلة الحياة', to: '/life-wheel' },
            { icon: Route, label: 'مسارات التعلّم', to: '/learning-paths' },
            { icon: Trophy, label: 'لوحة المتصدّرين', to: '/leaderboard' },
            { icon: Bell, label: 'إعدادات الإشعارات', to: '/notifications/settings' },
            { icon: UserIcon, label: 'تعديل المعلومات الشخصية', to: null },
            { icon: Settings, label: 'التفضيلات العامة', to: null },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to || '#'}
              className="flex items-center justify-between w-full px-3 py-3.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  <item.icon size={18} />
                </div>
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.label}</span>
              </div>
              <ChevronLeft size={18} className="text-neutral-400" />
            </Link>
          ))}

          {/* Theme toggle in settings */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-between w-full px-3 py-3.5 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                <Moon size={18} />
              </div>
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">المظهر</span>
            </div>
            <span className="text-sm text-neutral-400">
              {theme === 'light' ? 'نهاري' : 'ليلي'}
            </span>
          </button>

          {/* Sign out */}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl hover:bg-error-50 dark:hover:bg-error-900/20 transition-all duration-200 text-error-600 dark:text-error-400 mt-2"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-error-100 dark:bg-error-900/30">
              <LogOut size={18} />
            </div>
            <span className="font-semibold">تسجيل الخروج</span>
          </button>
        </div>
      </Card>
    </Layout>
  );
}
