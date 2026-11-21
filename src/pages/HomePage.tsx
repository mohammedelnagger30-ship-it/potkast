import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, ProgressBar } from '@/components/ui';
import { Sparkles, Mic, Target, TrendingUp, ArrowLeft, Zap, CheckCircle2, Flame, Lightbulb, BookOpen, Quote, ScrollText, Brain, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { levelFromXp, xpProgressInLevel } from '@/lib/gamification';
import { getDailyTip, type Tip } from '@/lib/notifications';
import { DailyWheel } from '@/components/DailyWheel';
import { FeaturedHosts } from '@/components/FeaturedHosts';
import type { UserMission } from '@/types/mission';
import { Route, BookHeart, CircleDot, Trophy } from 'lucide-react';

const tipTypeMeta: Record<string, { icon: typeof Lightbulb; label: string; color: string }> = {
  advice: { icon: Lightbulb, label: 'نصيحة', color: 'text-accent-500 bg-accent-100 dark:bg-accent-900/30' },
  quote: { icon: Quote, label: 'اقتباس', color: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30' },
  verse: { icon: ScrollText, label: 'آية', color: 'text-success-600 bg-success-100 dark:bg-success-900/30' },
  hadith: { icon: ScrollText, label: 'حديث', color: 'text-primary-600 bg-primary-100 dark:bg-primary-900/30' },
  fact: { icon: Brain, label: 'معلومة', color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    episodesListened: 0,
    missionsCompleted: 0,
    xp: 0,
    streak: 0,
  });
  const [todayMissions, setTodayMissions] = useState<UserMission[]>([]);
  const [dailyTip, setDailyTip] = useState<Tip | null>(null);
  const [tipLoading, setTipLoading] = useState(true);

  const loadHomeData = useCallback(async () => {
    if (!user) return;

    // Fetch completed missions count
    const { data: completedMissions } = await supabase
      .from('user_missions')
      .select('id, completed_at, assigned_date, status, mission:missions(*)')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const completedCount = completedMissions?.length || 0;

    // Fetch listened episodes count
    const { data: listened } = await supabase
      .from('listening_history')
      .select('id')
      .eq('user_id', user.id);

    const listenedCount = listened?.length || 0;

    // Calculate streak
    const allCompleted = (completedMissions || [])
      .filter((um) => um.completed_at)
      .map((um) => new Date(um.completed_at!).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(allCompleted)].sort().reverse();
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

    // Fetch today's missions
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
      .from('user_missions')
      .select('*, mission:missions(*)')
      .eq('user_id', user.id)
      .eq('assigned_date', today)
      .order('created_at', { ascending: true });

    setTodayMissions((todayData as UserMission[]) || []);

    const xp = profile?.xp || 0;
    setStats({
      episodesListened: listenedCount,
      missionsCompleted: completedCount,
      xp,
      streak: currentStreak,
    });

    // Load daily tip
    const tip = await getDailyTip(user, profile?.interests || []);
    setDailyTip(tip);
    setTipLoading(false);
  }, [user, profile]);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const displayName = profile?.name || 'صديقنا';
  const level = levelFromXp(stats.xp);
  const xpProgress = xpProgressInLevel(stats.xp);
  const todayCompleted = todayMissions.filter((m) => m.status === 'completed').length;
  const todayProgressPct = todayMissions.length > 0 ? (todayCompleted / todayMissions.length) * 100 : 0;
  const nextMission = todayMissions.find((m) => m.status !== 'completed');

  return (
    <Layout title="الرئيسية">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 p-8 lg:p-10 mb-6 animate-fade-in-up">
        <div className="absolute -top-8 -left-8 w-40 h-40 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-12 -right-4 w-52 h-52 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="relative">
          <Badge variant="accent" size="sm" className="mb-3">
            <Sparkles size={14} className="ml-1" />
            أهلاً بك يا {displayName}
          </Badge>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white mb-2 leading-tight">
            {stats.missionsCompleted === 0
              ? 'رحلتك نحو نسخة أفضل منك تبدأ هنا'
              : `أكملت ${stats.missionsCompleted} مهمة — واصل التقدّم!`}
          </h1>
          <p className="text-primary-100 text-base lg:text-lg mb-5 max-w-lg">
            بودكاست ملهم، مهام عملية، وتتبّع لتقدّمك — كل ما تحتاجه لتطوير ذاتك في مكان واحد.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to="/missions">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-bold text-sm transition-all active:scale-95">
                ابدأ الآن
                <ArrowLeft size={18} />
              </span>
            </Link>
            <Link to="/podcasts">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/15 text-white hover:bg-white/25 font-bold text-sm transition-all active:scale-95">
                تصفّح البودكاست
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Daily Tip */}
      <Card className="mb-6 animate-fade-in-up overflow-hidden relative">
        {tipLoading ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
              <RefreshCw size={18} className="text-neutral-400 animate-spin" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
              <div className="h-3 w-full bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            </div>
          </div>
        ) : dailyTip ? (
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${(tipTypeMeta[dailyTip.type] || tipTypeMeta.advice).color}`}>
              {(() => { const Icon = (tipTypeMeta[dailyTip.type] || tipTypeMeta.advice).icon; return <Icon size={20} />; })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-neutral-400">
                  {(tipTypeMeta[dailyTip.type] || tipTypeMeta.advice).label}
                </span>
                <span className="text-xs text-neutral-300">•</span>
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">نصيحة اليوم</span>
              </div>
              <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-relaxed mb-2">
                {dailyTip.text_ar}
              </p>
              {dailyTip.author_or_source && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  — {dailyTip.author_or_source}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Mic, label: 'حلقات استمعت لها', value: stats.episodesListened.toString(), color: 'text-primary-600' },
          { icon: Target, label: 'مهام مكتملة', value: stats.missionsCompleted.toString(), color: 'text-accent-500' },
          { icon: Flame, label: 'أيام متتالية', value: stats.streak.toString(), color: 'text-success-500' },
          { icon: Zap, label: 'نقاط الخبرة', value: stats.xp.toLocaleString('ar-EG'), color: 'text-primary-600' },
        ].map((stat, i) => (
          <Card key={i} className="animate-fade-in-up">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-11 h-11 rounded-xl bg-neutral-100 dark:bg-neutral-800 ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Level progress */}
      <Card className="mb-6 animate-fade-in-up">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-extrabold text-lg">
              {level}
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">المستوى {level}</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {xpProgress.needed - xpProgress.current} نقطة للمستوى التالي
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-accent-600 dark:text-accent-400">
            {stats.xp.toLocaleString('ar-EG')} نقطة
          </span>
        </div>
        <ProgressBar value={xpProgress.percent} showLabel variant="accent" size="md" />
      </Card>

      {/* Today's missions */}
      {todayMissions.length > 0 ? (
        <Card className="mb-6 animate-fade-in-up">
          <CardHeader
            title="مهام اليوم"
            subtitle={nextMission ? 'ابدأ بها الآن واكسب نقاط الخبرة' : 'أكملت كل مهام اليوم! أحسنت'}
            action={<Badge variant="accent">{todayCompleted}/{todayMissions.length}</Badge>}
          />
          <div className="mb-3">
            <ProgressBar value={todayProgressPct} variant="accent" size="sm" />
          </div>
          <div className="space-y-2">
            {todayMissions.slice(0, 3).map((um) => (
              <Link key={um.id} to="/missions">
                <div className={`flex items-center gap-3 p-3 rounded-xl transition-all hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                  um.status === 'completed' ? 'opacity-60' : ''
                }`}>
                  <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                    um.status === 'completed'
                      ? 'bg-success-500 text-white'
                      : 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  }`}>
                    {um.status === 'completed' ? <CheckCircle2 size={18} /> : <Target size={18} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm text-neutral-900 dark:text-neutral-100 truncate ${
                      um.status === 'completed' ? 'line-through' : ''
                    }`}>
                      {um.mission?.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="flex items-center gap-0.5 text-xs text-accent-600 dark:text-accent-400 font-semibold">
                        <Zap size={11} />
                        {um.mission?.xp_reward}
                      </span>
                    </div>
                  </div>
                  {um.status !== 'completed' && (
                    <ArrowLeft size={16} className="text-neutral-400" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-6 animate-fade-in-up">
          <CardHeader
            title="مهام اليوم"
            subtitle="ستظهر مهامك اليومية تلقائياً"
          />
          <Link to="/missions">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all">
              <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center">
                <Target size={18} />
              </div>
              <p className="font-semibold text-sm text-primary-700 dark:text-primary-300">
                اذهب لصفحة المهام لبدء رحلتك
              </p>
              <ArrowLeft size={16} className="text-primary-400 mr-auto" />
            </div>
          </Link>
        </Card>
      )}

      {/* Daily Wheel */}
      <DailyWheel />

      {/* Featured Hosts */}
      <FeaturedHosts />

      {/* Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card hover>
          <Link to="/podcasts" className="block">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <Mic size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">استمع للبودكاست</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">حلقات ملهمة في تطوير الذات</p>
              </div>
            </div>
          </Link>
        </Card>
        <Card hover>
          <Link to="/progress" className="block">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-success-600 dark:text-success-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">تابع تقدّمك</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">إحصائيات وإنجازات شخصية</p>
              </div>
            </div>
          </Link>
        </Card>
      </div>

      {/* Discover features */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link to="/journal">
          <Card hover className="text-center">
            <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 text-pink-600 flex items-center justify-center mx-auto mb-2">
              <BookHeart size={18} />
            </div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">مذكراتي</p>
          </Card>
        </Link>
        <Link to="/life-wheel">
          <Card hover className="text-center">
            <div className="w-10 h-10 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 flex items-center justify-center mx-auto mb-2">
              <CircleDot size={18} />
            </div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">عجلة الحياة</p>
          </Card>
        </Link>
        <Link to="/learning-paths">
          <Card hover className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center mx-auto mb-2">
              <Route size={18} />
            </div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">مسارات التعلّم</p>
          </Card>
        </Link>
        <Link to="/leaderboard">
          <Card hover className="text-center">
            <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 flex items-center justify-center mx-auto mb-2">
              <Trophy size={18} />
            </div>
            <p className="text-sm font-bold text-neutral-700 dark:text-neutral-300">المتصدّرون</p>
          </Card>
        </Link>
      </div>
    </Layout>
  );
}
