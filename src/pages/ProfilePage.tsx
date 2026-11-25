import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Bell, BookHeart, Calendar, CircleDot, Download, Heart, LogOut, Moon, Route,
  Settings2, Trophy, Zap,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Card, CardHeader } from '@/components/ui';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import { ProfileProgressCard } from '@/components/profile/ProfileProgressCard';
import { UserPathsCard } from '@/components/profile/UserPathsCard';
import { AppearanceCard } from '@/components/settings/AppearanceCard';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useUpdate } from '@/context/UpdateContext';
import { supabase } from '@/lib/supabase';
import { achievementDefs } from '@/lib/gamification';

const quickLinks = [
  { icon: Settings2, label: 'كل الإعدادات', to: '/settings' },
  { icon: Heart, label: 'المفضلة', to: '/favorites' },
  { icon: Award, label: 'إنجازاتي وأوسمتي', to: '/achievements' },
  { icon: BookHeart, label: 'مذكراتي اليومية', to: '/journal' },
  { icon: CircleDot, label: 'عجلة الحياة', to: '/life-wheel' },
  { icon: Route, label: 'مسارات التعلّم', to: '/learning-paths' },
  { icon: Trophy, label: 'لوحة المتصدّرين', to: '/leaderboard' },
  { icon: Bell, label: 'إعدادات الإشعارات', to: '/notifications/settings' },
  { icon: Download, label: 'تحديثات التطبيق', to: '/updates' },
];

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { theme } = useTheme();
  const { available, dismissed, latest, currentVersion } = useUpdate();
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
        .map((c) => new Date(c.completed_at!).toISOString().split('T')[0]),
    )];
    setActiveDays(dates.length);

    const xp = profile?.xp || 0;
    setUnlockedCount(achievementDefs.filter((def) => {
      switch (def.metric) {
        case 'missions': return (completed?.length || 0) >= def.threshold;
        case 'xp': return xp >= def.threshold;
        default: return false;
      }
    }).length);
  }, [user, profile]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const xp = profile?.xp || 0;

  return (
    <Layout title="الملف الشخصي">
      <ProfileIdentityCard />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Zap, label: 'نقاط الخبرة', value: xp.toLocaleString('ar-EG') },
          { icon: Calendar, label: 'أيام نشطة', value: activeDays.toString() },
          { icon: Award, label: 'أوسمة', value: unlockedCount.toString() },
          { icon: Trophy, label: 'مهام مكتملة', value: missionsCompleted.toString() },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mx-auto mb-2 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <p className="text-lg font-extrabold text-neutral-900 dark:text-white">{value}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
          </Card>
        ))}
      </div>

      {/* Listening progress */}
      <ProfileProgressCard />

      {/* Learning paths */}
      <UserPathsCard />

      {/* Appearance */}
      <AppearanceCard compact />

      {/* App update status */}
      <Card className="mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              available && !dismissed
                ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-600'
                : 'bg-success-100 dark:bg-success-900/30 text-success-600'
            }`}>
              <Download size={17} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                {available && !dismissed
                  ? `نسخة جديدة متاحة: ${latest?.version}`
                  : `Sada — النسخة ${currentVersion}`}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {available && !dismissed
                  ? 'افتح قسم التحديثات عشان تنزّلها وتثبّتها'
                  : 'أنت على أحدث نسخة'}
              </p>
            </div>
          </div>
          <Link
            to="/updates"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            عرض التحديثات
          </Link>
        </div>
      </Card>

      {/* Quick links */}
      <Card className="mb-6">
        <CardHeader title="استكشف حسابك" subtitle="كل أقسامك في مكان واحد" />
        <div className="grid sm:grid-cols-2 gap-2">
          {quickLinks.map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors"
            >
              <span className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 flex items-center justify-center flex-shrink-0">
                <Icon size={17} />
              </span>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center">
              <Moon size={17} />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                المظهر الحالي: {theme === 'dark' ? 'ليلي' : 'نهاري'}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                تقدر تغيّر المظهر والثيم من الإعدادات
              </p>
            </div>
          </div>
          <Link
            to="/settings"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
          >
            فتح الإعدادات
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-error-50 dark:hover:bg-error-900/20 transition-all text-error-600 dark:text-error-400"
        >
          <div className="w-9 h-9 rounded-xl bg-error-100 dark:bg-error-900/30 flex items-center justify-center">
            <LogOut size={18} />
          </div>
          <span className="font-semibold">تسجيل الخروج</span>
        </button>
      </Card>
    </Layout>
  );
}
