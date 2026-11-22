import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award, Bell, BookHeart, Check, CircleDot, Download, Heart, LogOut,
  RefreshCw, Route, Settings2, ShieldCheck, Trophy, UserRound,
} from 'lucide-react';
import { Layout } from '@/components/layout';
import { Badge, Button, Card, CardHeader } from '@/components/ui';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import { ProfileProgressCard } from '@/components/profile/ProfileProgressCard';
import { UserPathsCard } from '@/components/profile/UserPathsCard';
import { AppearanceCard } from '@/components/settings/AppearanceCard';
import { UpdateCard } from '@/components/updates/UpdateCard';
import { useAuth } from '@/context/AuthContext';
import { interestLabels, interestOptions } from '@/lib/interests';

const shortcuts = [
  { icon: Download, label: 'التنزيلات والتقدّم', to: '/downloads' },
  { icon: Award, label: 'إنجازاتي وأوسمتي', to: '/achievements' },
  { icon: BookHeart, label: 'مذكراتي اليومية', to: '/journal' },
  { icon: CircleDot, label: 'عجلة الحياة', to: '/life-wheel' },
  { icon: Route, label: 'مسارات التعلّم', to: '/learning-paths' },
  { icon: Trophy, label: 'لوحة المتصدّرين', to: '/leaderboard' },
  { icon: Bell, label: 'إعدادات الإشعارات', to: '/notifications/settings' },
  { icon: RefreshCw, label: 'تحديثات التطبيق', to: '/updates' },
  { icon: UserRound, label: 'ملفي الشخصي', to: '/profile' },
];

export default function SettingsPage() {
  const { profile, signOut, updateProfile, refreshProfile } = useAuth();
  const [goal, setGoal] = useState(profile?.daily_goal_minutes || 15);
  const [reminder, setReminder] = useState(profile?.reminder_time || '08:00');
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setGoal(profile?.daily_goal_minutes || 15);
    setReminder(profile?.reminder_time || '08:00');
    setInterests(profile?.interests || []);
  }, [profile]);

  const toggleInterest = (id: string) => {
    setInterests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setStatus(null);
  };

  const savePreferences = async () => {
    setSaving(true);
    setStatus(null);
    const { error } = await updateProfile({
      daily_goal_minutes: Math.min(240, Math.max(5, Number(goal) || 15)),
      reminder_time: reminder || '08:00',
      interests,
    });
    setSaving(false);
    if (error) {
      setStatus({ text: error, ok: false });
      return;
    }
    setStatus({ text: 'تم حفظ تفضيلاتك', ok: true });
    await refreshProfile();
  };

  return (
    <Layout title="الإعدادات">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <Settings2 size={22} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-900 dark:text-white">الإعدادات</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            كل إعدادات حسابك وتقدّمك في مكان واحد
          </p>
        </div>
      </div>

      {/* Account / identity */}
      <div className="mb-6">
        <h2 className="text-base font-extrabold text-neutral-900 dark:text-white mb-3 px-1">الحساب</h2>
        <ProfileIdentityCard compact />
      </div>

      {/* Appearance */}
      <AppearanceCard />

      {/* App updates */}
      <UpdateCard />

      {/* Preferences */}
      <Card className="mb-6">
        <CardHeader title="تفضيلات التعلّم" subtitle="الهدف اليومي ووقت التذكير ومجالات اهتمامك" />

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label htmlFor="daily-goal" className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
              الهدف اليومي (دقيقة)
            </label>
            <input
              id="daily-goal"
              type="number"
              min={5}
              max={240}
              value={goal}
              onChange={(e) => { setGoal(Number(e.target.value)); setStatus(null); }}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div>
            <label htmlFor="reminder-time" className="block text-xs font-bold text-neutral-500 dark:text-neutral-400 mb-1.5">
              وقت التذكير
            </label>
            <input
              id="reminder-time"
              type="time"
              dir="ltr"
              value={reminder}
              onChange={(e) => { setReminder(e.target.value); setStatus(null); }}
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3.5 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Heart size={16} className="text-primary-600" />
          <span className="text-sm font-bold text-neutral-700 dark:text-neutral-300">مجالات الاهتمام</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {interestOptions.map((id) => {
            const selected = interests.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleInterest(id)}
                aria-pressed={selected}
                className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-all ${
                  selected
                    ? 'border-primary-500 bg-primary-600 text-white'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-primary-400'
                }`}
              >
                {interestLabels[id]}
              </button>
            );
          })}
        </div>

        {status && (
          <p className={`mb-3 text-xs font-semibold ${status.ok ? 'text-success-600' : 'text-error-600'}`}>
            {status.text}
          </p>
        )}

        <Button size="sm" onClick={savePreferences} disabled={saving} leftIcon={<Check size={15} />}>
          {saving ? 'جارٍ الحفظ...' : 'حفظ التفضيلات'}
        </Button>
      </Card>

      {/* Progress & paths */}
      <ProfileProgressCard />
      <UserPathsCard />

      {/* Shortcuts */}
      <Card className="mb-6">
        <CardHeader title="وصول سريع" subtitle="كل أقسام حسابك" />
        <div className="grid sm:grid-cols-2 gap-2">
          {shortcuts.map(({ icon: Icon, label, to }) => (
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

      {/* Security */}
      <Card>
        <CardHeader title="الخصوصية والحساب" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-success-100 dark:bg-success-900/30 text-success-600 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">بياناتك على جهازك</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              التنزيلات والثيمات بتتخزين محلياً، والتقدّم متزامن مع حسابك
            </p>
          </div>
        </div>
        <Button variant="ghost" onClick={() => void signOut()} leftIcon={<LogOut size={17} />} className="!text-error-600 hover:!bg-error-50 dark:hover:!bg-error-900/20">
          تسجيل الخروج
        </Button>
        <Badge variant="neutral" className="mr-2">Sada</Badge>
      </Card>
    </Layout>
  );
}
