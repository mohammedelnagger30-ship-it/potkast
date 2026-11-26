import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout';
import { Badge, Button, Card, ProgressBar } from '@/components/ui';
import {
  AlertCircle,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Medal,
  RefreshCw,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getLevelInfo, xpProgressInLevel } from '@/lib/gamification';

type Timeframe = 'alltime' | 'weekly';

interface ProfileRow {
  id: string;
  name: string | null;
  xp: number | null;
}

interface MissionRow {
  user_id: string;
  completed_at: string | null;
  // Supabase types this embedded relation as an array when the FK is not
  // declared; handle both shapes so the page works with either schema.
  mission: { xp_reward: number } | Array<{ xp_reward: number }> | null;
}

function missionXp(mission: MissionRow['mission']): number {
  if (!mission) return 0;
  const first = Array.isArray(mission) ? mission[0] : mission;
  return Number(first?.xp_reward || 0);
}

interface LeaderboardEntry {
  user_id: string;
  name: string;
  xp: number;
  totalXp: number;
  missions: number;
  streak: number;
  rank: number;
  is_me: boolean;
  level: number;
  levelTitle: string;
  levelPercent: number;
}

const WEEK_MS = 7 * 86400000;

function computeStreak(dates: string[]): number {
  const unique = [...new Set(dates)].sort().reverse();
  if (unique.length === 0) return 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (unique[0] !== today && unique[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const gap = Math.round(
      (new Date(unique[i - 1]).getTime() - new Date(unique[i]).getTime()) / 86400000
    );
    if (gap !== 1) break;
    streak++;
  }
  return streak;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={22} className="text-yellow-500" aria-label="المركز الأول" />;
  if (rank === 2) return <Medal size={22} className="text-slate-400" aria-label="المركز الثاني" />;
  if (rank === 3) return <Medal size={22} className="text-orange-600" aria-label="المركز الثالث" />;
  return <span className="text-sm font-extrabold text-neutral-500">{rank}</span>;
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors sm:p-4 ${
        entry.is_me
          ? 'border-primary-300 bg-primary-50/70 dark:border-primary-700 dark:bg-primary-900/20'
          : 'border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900'
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
        <RankBadge rank={entry.rank} />
      </div>
      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-extrabold flex-shrink-0">
        {entry.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={`truncate text-sm font-bold ${
              entry.is_me ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-900 dark:text-white'
            }`}
          >
            {entry.name} {entry.is_me && '(أنت)'}
          </p>
          <Badge variant="neutral" size="sm">L{entry.level} · {entry.levelTitle}</Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-0.5 font-bold text-accent-600 dark:text-accent-400">
            <Zap size={11} /> {entry.xp.toLocaleString('ar-EG')} نقطة
          </span>
          <span className="text-neutral-500">{entry.missions} مهمة</span>
          {entry.streak > 0 && (
            <span className="flex items-center gap-0.5 font-bold text-orange-500">
              <Flame size={11} /> {entry.streak} يوم
            </span>
          )}
        </div>
        <ProgressBar value={entry.levelPercent} size="sm" className="mt-2" />
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [optOutIds, setOptOutIds] = useState<Set<string>>(new Set());
  const [optedOut, setOptedOut] = useState(false);
  const [timeframe, setTimeframe] = useState<Timeframe>('alltime');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Three batched queries instead of one query per user.
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const [selfOptOut, profilesRes, optOutsRes, missionsRes] = await Promise.all([
      supabase.from('leaderboard_opt_outs').select('user_id').eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('id, name, xp'),
      supabase.from('leaderboard_opt_outs').select('user_id'),
      supabase
        .from('user_missions')
        .select('user_id, completed_at, mission:missions(xp_reward)')
        .eq('status', 'completed'),
    ]);

    const failed = selfOptOut.error || profilesRes.error || optOutsRes.error || missionsRes.error;
    if (failed) {
      setError(failed.message);
      setLoading(false);
      return;
    }

    setOptedOut(!!selfOptOut.data);
    setOptOutIds(new Set((optOutsRes.data || []).map((o: any) => o.user_id as string)));
    setProfiles((profilesRes.data || []) as ProfileRow[]);
    setMissions((missionsRes.data || []) as unknown as MissionRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const entries = useMemo(() => {
    const since = Date.now() - WEEK_MS;
    const byUser = new Map<string, { count: number; dates: string[]; weeklyXp: number }>();

    for (const row of missions) {
      if (!row.completed_at) continue;
      const stats = byUser.get(row.user_id) || { count: 0, dates: [], weeklyXp: 0 };
      const at = new Date(row.completed_at);
      stats.count++;
      stats.dates.push(at.toISOString().split('T')[0]);
      if (at.getTime() >= since) stats.weeklyXp += missionXp(row.mission);
      byUser.set(row.user_id, stats);
    }

    return profiles
      .filter((p) => !optOutIds.has(p.id))
      .map((p) => {
        const stats = byUser.get(p.id) || { count: 0, dates: [], weeklyXp: 0 };
        const totalXp = Number(p.xp || 0);
        const level = getLevelInfo(totalXp);
        return {
          user_id: p.id,
          name: p.name?.trim() || 'مستخدم',
          xp: timeframe === 'weekly' ? stats.weeklyXp : totalXp,
          totalXp,
          missions: stats.count,
          streak: computeStreak(stats.dates),
          rank: 0,
          is_me: p.id === user?.id,
          level: level.level,
          levelTitle: level.title,
          levelPercent: xpProgressInLevel(totalXp).percent,
        } satisfies LeaderboardEntry;
      })
      .sort((a, b) => b.xp - a.xp || b.missions - a.missions || b.streak - a.streak)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [profiles, missions, optOutIds, timeframe, user?.id]);

  const myEntry = entries.find((entry) => entry.is_me);

  const toggleOptOut = async () => {
    if (!user || busy) return;
    setBusy(true);
    const result = optedOut
      ? await supabase.from('leaderboard_opt_outs').delete().eq('user_id', user.id)
      : await supabase.from('leaderboard_opt_outs').insert({ user_id: user.id });
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    await loadData();
  };

  return (
    <Layout title="لوحة المتصدّرين">
      <div className="mb-6">
        <Card className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Trophy size={28} />
            </div>
            <div className="min-w-[200px] flex-1">
              <h2 className="text-xl font-extrabold">لوحة المتصدّرين</h2>
              <p className="text-yellow-50 text-sm mt-0.5">
                {optedOut
                  ? 'أنت مخفي من اللوحة — يمكنك الظهور مجدداً'
                  : 'تنافس مع الآخرين وحافظ على صدارتك'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="bg-white/15 text-white hover:bg-white/25 hover:text-white"
                leftIcon={<RefreshCw size={15} className={loading ? 'animate-spin' : ''} />}
                disabled={loading}
                onClick={() => void loadData()}
              >
                تحديث
              </Button>
              <button
                type="button"
                onClick={() => void toggleOptOut()}
                disabled={busy}
                aria-label={optedOut ? 'إظهار اسمي في اللوحة' : 'إخفاء اسمي من اللوحة'}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all disabled:opacity-60"
              >
                {optedOut ? <Eye size={14} /> : <EyeOff size={14} />}
                {busy ? '...' : optedOut ? 'إظهار' : 'إخفاء'}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Ranking mode */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
          {([
            ['alltime', 'إجمالي النقاط'],
            ['weekly', 'آخر ٧ أيام'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTimeframe(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                timeframe === key
                  ? 'bg-white dark:bg-neutral-900 text-primary-600 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400">
          {timeframe === 'weekly'
            ? 'نقاط المهام المكتملة خلال آخر ٧ أيام'
            : 'الترتيب حسب إجمالي نقاطك داخل التطبيق'}
        </p>
      </div>

      {error && (
        <Card className="mb-5 flex items-center gap-2 border-error-200 bg-error-50 text-error-700 dark:border-error-900 dark:bg-error-900/20 dark:text-error-300">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
          <Button size="sm" variant="ghost" className="mr-auto" onClick={() => void loadData()}>
            إعادة المحاولة
          </Button>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          <p className="text-sm text-neutral-400">جارٍ ترتيب المتصدّرين...</p>
        </div>
      ) : (
        <>
          {myEntry && (
            <Card className="mb-5 border border-primary-200 bg-primary-50/70 dark:border-primary-800 dark:bg-primary-900/20">
              <div className="flex flex-wrap items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center text-lg font-extrabold flex-shrink-0">
                  {myEntry.rank}
                </div>
                <div className="min-w-[180px] flex-1">
                  <p className="font-bold text-neutral-900 dark:text-white">ترتيبك الحالي</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
                    <span className="flex items-center gap-1 text-accent-600">
                      <Zap size={12} /> {myEntry.xp.toLocaleString('ar-EG')} نقطة
                    </span>
                    <span className="text-primary-600">{myEntry.missions} مهمة مكتملة</span>
                    {myEntry.streak > 0 && (
                      <span className="flex items-center gap-1 text-orange-600">
                        <Flame size={12} /> {myEntry.streak} يوم متتالي
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="primary" size="sm">L{myEntry.level} · {myEntry.levelTitle}</Badge>
              </div>
            </Card>
          )}

          {optedOut && (
            <p className="mb-4 flex items-center gap-2 text-xs text-neutral-500">
              <EyeOff size={14} /> اسمك مخفي عن باقي المستخدمين.
            </p>
          )}

          {entries.length > 0 ? (
            <>
              {entries.length >= 3 && (
                <div className="mb-5 grid gap-3 sm:grid-cols-3">
                  {entries.slice(0, 3).map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`rounded-2xl bg-gradient-to-br p-[1px] ${
                        entry.rank === 1
                          ? 'from-yellow-400 to-yellow-600'
                          : entry.rank === 2
                          ? 'from-slate-300 to-slate-500'
                          : 'from-orange-400 to-orange-600'
                      }`}
                    >
                      <Card className="h-full rounded-2xl p-3">
                        <div className="mb-2 flex items-center justify-center">
                          <RankBadge rank={entry.rank} />
                        </div>
                        <p className="text-center font-bold text-neutral-900 dark:text-white truncate">
                          {entry.name} {entry.is_me && '(أنت)'}
                        </p>
                        <p className="mt-1 text-center text-sm font-extrabold text-accent-600">
                          {entry.xp.toLocaleString('ar-EG')} نقطة
                        </p>
                      </Card>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                {entries.slice(entries.length >= 3 ? 3 : 0, 50).map((entry) => (
                  <LeaderboardRow key={entry.user_id} entry={entry} />
                ))}
              </div>
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                <Users size={13} /> {entries.length} مشارك في اللوحة
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                <Trophy size={36} />
              </div>
              <h3 className="text-lg font-bold text-neutral-700 dark:text-neutral-200">
                لا يوجد متسابقون بعد
              </h3>
              <p className="mt-1 text-sm text-neutral-400">أكمل مهاماً لتظهر في اللوحة</p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
