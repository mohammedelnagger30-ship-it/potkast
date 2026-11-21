import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, CardHeader, Badge, Button, ProgressBar } from '@/components/ui';
import { Trophy, Eye, EyeOff, Crown, Medal, Zap, Flame } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { levelFromXp } from '@/lib/gamification';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  xp: number;
  missions: number;
  streak: number;
  rank: number;
  is_me: boolean;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [optedOut, setOptedOut] = useState(false);
  const [timeframe, setTimeframe] = useState<'weekly' | 'alltime'>('weekly');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: optOut } = await supabase
      .from('leaderboard_opt_outs')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    setOptedOut(!!optOut);

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, xp, created_at');

    const { data: optOuts } = await supabase
      .from('leaderboard_opt_outs')
      .select('user_id');
    const optOutIds = new Set((optOuts || []).map((o: any) => o.user_id));

    const visibleProfiles = (profiles || []).filter((p: any) => !optOutIds.has(p.id));

    const allEntries: LeaderboardEntry[] = [];
    for (const p of visibleProfiles) {
      const { count: missionCount } = await supabase
        .from('user_missions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', p.id)
        .eq('status', 'completed');

      const { data: recentMissions } = await supabase
        .from('user_missions')
        .select('completed_at')
        .eq('user_id', p.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(50);

      const dates = [...new Set((recentMissions || [])
        .filter((m: any) => m.completed_at)
        .map((m: any) => new Date(m.completed_at).toISOString().split('T')[0]))]
        .sort().reverse();

      let streak = 0;
      if (dates.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (dates[0] === todayStr || dates[0] === yesterdayStr) {
          streak = 1;
          for (let i = 1; i < dates.length; i++) {
            const prev = new Date(dates[i - 1]);
            const curr = new Date(dates[i]);
            if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
            else break;
          }
        }
      }

      allEntries.push({
        user_id: p.id,
        name: p.name || 'مستخدم',
        xp: p.xp || 0,
        missions: missionCount || 0,
        streak,
        rank: 0,
        is_me: p.id === user.id,
      });
    }

    allEntries.sort((a, b) => b.xp - a.xp);
    allEntries.forEach((e, i) => { e.rank = i + 1; });

    setEntries(allEntries);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleOptOut = async () => {
    if (!user) return;
    if (optedOut) {
      await supabase.from('leaderboard_opt_outs').delete().eq('user_id', user.id);
      setOptedOut(false);
    } else {
      await supabase.from('leaderboard_opt_outs').insert({ user_id: user.id });
      setOptedOut(true);
    }
    loadData();
  };

  const myEntry = entries.find((e) => e.is_me);

  if (loading) {
    return (
      <Layout title="لوحة المتصدّرين">
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
        </div>
      </Layout>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={20} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={20} className="text-neutral-400" />;
    if (rank === 3) return <Medal size={20} className="text-orange-600" />;
    return <span className="text-sm font-bold text-neutral-400">{rank}</span>;
  };

  return (
    <Layout title="لوحة المتصدّرين">
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy size={28} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-extrabold">لوحة المتصدّرين</h2>
              <p className="text-yellow-100 text-sm mt-0.5">
                {optedOut ? 'أنت مخفي من اللوحة — يمكنك الظهور مجدداً' : 'تنافس مع الآخرين وحافظ على صدارتك'}
              </p>
            </div>
            <button
              onClick={toggleOptOut}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all"
            >
              {optedOut ? <Eye size={14} /> : <EyeOff size={14} />}
              {optedOut ? 'إظهار' : 'إخفاء'}
            </button>
          </div>
        </Card>
      </div>

      {myEntry && (
        <Card className="mb-6 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center font-extrabold">
              {myEntry.rank}
            </div>
            <div className="flex-1">
              <p className="font-bold text-neutral-900 dark:text-white">ترتيبك الحالي</p>
              <div className="flex gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-accent-600 font-semibold">
                  <Zap size={12} /> {myEntry.xp.toLocaleString('ar-EG')} نقطة
                </span>
                <span className="flex items-center gap-1 text-xs text-primary-600 font-semibold">
                  {myEntry.missions} مهمة
                </span>
                {myEntry.streak > 0 && (
                  <span className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                    <Flame size={12} /> {myEntry.streak} أيام
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.slice(0, 20).map((entry) => (
            <Card
              key={entry.user_id}
              className={`flex items-center gap-3 ${entry.is_me ? 'border-2 border-primary-300 dark:border-primary-700' : ''}`}
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
                {rankIcon(entry.rank)}
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {entry.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm truncate ${entry.is_me ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-900 dark:text-white'}`}>
                  {entry.name} {entry.is_me && '(أنت)'}
                </p>
                <div className="flex gap-3">
                  <span className="text-xs text-neutral-400 flex items-center gap-0.5">
                    <Zap size={10} /> {entry.xp.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-xs text-neutral-400">{entry.missions} مهمة</span>
                </div>
              </div>
              {entry.streak > 0 && (
                <div className="flex items-center gap-1 text-xs text-orange-500 font-bold flex-shrink-0">
                  <Flame size={12} />
                  {entry.streak}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
            <Trophy size={36} />
          </div>
          <h3 className="text-lg font-bold text-neutral-600 dark:text-neutral-300">لا يوجد متسابقون</h3>
          <p className="text-sm text-neutral-400 mt-1">اكمل مهاماً لتظهر في اللوحة</p>
        </div>
      )}
    </Layout>
  );
}
