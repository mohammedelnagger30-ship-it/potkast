import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/layout';
import { Card, ProgressBar } from '@/components/ui';
import { MissionCard } from '@/components/MissionCard';
import { ConfettiLoader, fireConfetti } from '@/components/Confetti';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Target, Flame, CheckCircle2, Zap, RefreshCw, Plus, Clock } from 'lucide-react';
import { Badge, Button } from '@/components/ui';
import { updateStatsOnMissionComplete } from '@/lib/statsHelper';
import {
  type Mission,
  type UserMission,
  type MissionType,
  type UserMissionStatus,
  difficultyLabels,
  difficultyBadgeVariant,
  formatDurationShort,
  interestToCategoryMap,
} from '@/types/mission';

type TabKey = 'daily' | 'weekly' | 'challenges' | 'completed';

interface TabConfig {
  key: TabKey;
  label: string;
  icon: typeof Target;
}

const tabs: TabConfig[] = [
  { key: 'daily', label: 'يومية', icon: Target },
  { key: 'weekly', label: 'أسبوعية', icon: CheckCircle2 },
  { key: 'challenges', label: 'تحديات', icon: Flame },
  { key: 'completed', label: 'مكتملة', icon: CheckCircle2 },
];

export default function MissionsPage() {
  const { user, profile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('daily');
  const [userMissions, setUserMissions] = useState<UserMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [todayStats, setTodayStats] = useState({ total: 0, completed: 0, xpEarned: 0 });
  const [streak, setStreak] = useState(0);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [showAvailable, setShowAvailable] = useState(false);

  // Auto-assign 3 daily missions based on user interests
  const autoAssignDailyMissions = useCallback(async (): Promise<UserMission[]> => {
    if (!user || !profile) return [];

    const today = new Date().toISOString().split('T')[0];

    // Check if we already have missions assigned today
    const { data: existing } = await supabase
      .from('user_missions')
      .select('id')
      .eq('user_id', user.id)
      .eq('assigned_date', today);

    if (existing && existing.length > 0) {
      return [];
    }

    setAutoAssigning(true);

    // Get user's interest category IDs
    const interestCategoryNames = (profile.interests || []).map(
      (interest) => interestToCategoryMap[interest]
    ).filter(Boolean);

    // Fetch all daily missions
    const { data: allDailyMissions } = await supabase
      .from('missions')
      .select('*, category:categories(*)')
      .eq('type', 'daily');

    if (!allDailyMissions || allDailyMissions.length === 0) {
      setAutoAssigning(false);
      return [];
    }

    // Filter by user interests if available
    let candidates = allDailyMissions as Mission[];
    if (interestCategoryNames.length > 0) {
      const interestMatches = candidates.filter(
        (m) => m.category && interestCategoryNames.includes(m.category.name_ar)
      );
      // If we have enough interest matches, use them; otherwise mix with general
      if (interestMatches.length >= 3) {
        candidates = interestMatches;
      } else {
        // Add some non-interest missions to fill up
        const others = candidates.filter(
          (m) => !m.category || !interestCategoryNames.includes(m.category.name_ar)
        );
        candidates = [...interestMatches, ...others];
      }
    }

    // Pick 3 random missions (deterministic-ish: shuffle and take first 3)
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);

    // Insert them as user_missions
    const inserts = selected.map((m) => ({
      user_id: user.id,
      mission_id: m.id,
      status: 'pending' as UserMissionStatus,
      assigned_date: today,
    }));

    const { data: inserted, error } = await supabase
      .from('user_missions')
      .insert(inserts)
      .select('*, mission:missions(*, category:categories(*), linked_episode:episodes(*))');

    setAutoAssigning(false);

    if (error || !inserted) return [];
    return inserted as UserMission[];
  }, [user, profile]);

  // Load user missions
  const loadUserMissions = useCallback(async () => {
    if (!user) return;

    setLoading(true);

    // Auto-assign daily missions for today
    const newMissions = await autoAssignDailyMissions();

    // Fetch all user missions with mission details
    const { data, error } = await supabase
      .from('user_missions')
      .select('*, mission:missions(*, category:categories(*), linked_episode:episodes(*))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setLoading(false);
      return;
    }

    const allMissions = [...newMissions, ...(data as UserMission[])] as UserMission[];
    // Deduplicate by id
    const seen = new Set<string>();
    const deduped = allMissions.filter((um) => {
      if (seen.has(um.id)) return false;
      seen.add(um.id);
      return true;
    });
    setUserMissions(deduped);

    // Calculate today's stats
    const today = new Date().toISOString().split('T')[0];
    const todays = deduped.filter((um) => um.assigned_date === today);
    const todaysCompleted = todays.filter((um) => um.status === 'completed');
    const xpEarned = todaysCompleted.reduce((sum, um) => sum + (um.mission?.xp_reward || 0), 0);
    setTodayStats({
      total: todays.length,
      completed: todaysCompleted.length,
      xpEarned,
    });

    // Calculate streak (consecutive days with at least one completed mission)
    const allCompleted = deduped
      .filter((um) => um.status === 'completed' && um.completed_at)
      .map((um) => new Date(um.completed_at!).toISOString().split('T')[0]);
    const uniqueDates = [...new Set(allCompleted)].sort().reverse();

    let currentStreak = 0;
    if (uniqueDates.length > 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Start from today or yesterday
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

    setLoading(false);
  }, [user, autoAssignDailyMissions]);

  useEffect(() => {
    loadUserMissions();
  }, [loadUserMissions]);

  const handleStart = async (userMissionId: string) => {
    setSaving(true);
    await supabase
      .from('user_missions')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', userMissionId);

    setUserMissions((prev) =>
      prev.map((um) =>
        um.id === userMissionId
          ? { ...um, status: 'in_progress', started_at: new Date().toISOString() }
          : um
      )
    );
    setSaving(false);
  };

  const handleComplete = async (userMissionId: string, notes: string) => {
    setSaving(true);
    const now = new Date().toISOString();
    const { data: umData } = await supabase
      .from('user_missions')
      .select('*, mission:missions(*)')
      .eq('id', userMissionId)
      .maybeSingle();

    await supabase
      .from('user_missions')
      .update({ status: 'completed', completed_at: now, notes: notes || null })
      .eq('id', userMissionId);

    // Award XP to profile
    const xpReward = umData?.mission?.xp_reward || 0;
    if (xpReward > 0 && user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('xp')
        .eq('id', user.id)
        .maybeSingle();
      const currentXp = prof?.xp || 0;
      await supabase
        .from('profiles')
        .update({ xp: currentXp + xpReward, updated_at: now })
        .eq('id', user.id);
      refreshProfile();
    }

    // Update user_stats and category_progress
    const missionCategoryId = (umData as any)?.mission?.category_id || null;
    if (user) {
      await updateStatsOnMissionComplete(user.id, xpReward, missionCategoryId);
    }

    setUserMissions((prev) => {
      const updated = prev.map((um) =>
        um.id === userMissionId
          ? { ...um, status: 'completed' as UserMissionStatus, completed_at: now, notes: notes || null }
          : um
      );

      // Update today's stats
      const today = new Date().toISOString().split('T')[0];
      const completedUm = updated.find((um) => um.id === userMissionId);
      if (completedUm && completedUm.assigned_date === today) {
        const todays = updated.filter((um) => um.assigned_date === today);
        const todaysCompleted = todays.filter((um) => um.status === 'completed');
        const xpEarned = todaysCompleted.reduce((sum, um) => sum + (um.mission?.xp_reward || 0), 0);
        setTodayStats({
          total: todays.length,
          completed: todaysCompleted.length,
          xpEarned,
        });
      }

      return updated;
    });

    setSaving(false);
    fireConfetti();
  };

  // Filter missions by active tab
  const getFilteredMissions = (): UserMission[] => {
    if (activeTab === 'completed') {
      return userMissions.filter((um) => um.status === 'completed');
    }

    const typeMap: Record<TabKey, MissionType> = {
      daily: 'daily',
      weekly: 'weekly',
      challenges: 'challenge',
      completed: 'daily',
    };

    const targetType = typeMap[activeTab];
    const today = new Date().toISOString().split('T')[0];

    return userMissions.filter((um) => {
      if (um.mission?.type !== targetType) return false;
      if (activeTab === 'daily') return um.assigned_date === today;
      return true;
    });
  };

  const filteredMissions = getFilteredMissions();
  const todayProgress = todayStats.total > 0 ? (todayStats.completed / todayStats.total) * 100 : 0;

  // Fetch available missions to accept (for weekly/challenge tabs)
  const fetchAvailableMissions = useCallback(async (type: MissionType) => {
    if (!user) return;
    // Get mission IDs the user already has assigned
    const assignedIds = userMissions.map((um) => um.mission_id);
    const { data } = await supabase
      .from('missions')
      .select('*, category:categories(*)')
      .eq('type', type);
    if (data) {
      const available = (data as Mission[]).filter((m) => !assignedIds.includes(m.id));
      setAvailableMissions(available);
    }
  }, [user, userMissions]);

  // Accept a mission (assign to user)
  const handleAcceptMission = async (missionId: string) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_missions')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        status: 'pending' as UserMissionStatus,
        assigned_date: today,
      })
      .select('*, mission:missions(*, category:categories(*), linked_episode:episodes(*))')
      .maybeSingle();

    if (!error && data) {
      const newUm = data as UserMission;
      setUserMissions((prev) => [newUm, ...prev]);
      setAvailableMissions((prev) => prev.filter((m) => m.id !== missionId));
    }
  };

  return (
    <Layout title="المهام">
      <ConfettiLoader />

      {/* Stats bar */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mx-auto mb-1">
            <Target size={18} />
          </div>
          <p className="text-xl font-extrabold text-neutral-900 dark:text-white">{todayStats.total}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">مهام اليوم</p>
        </Card>
        <Card className="text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400 mx-auto mb-1">
            <CheckCircle2 size={18} />
          </div>
          <p className="text-xl font-extrabold text-neutral-900 dark:text-white">{todayStats.completed}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">مكتملة</p>
        </Card>
        <Card className="text-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 mx-auto mb-1">
            <Flame size={18} />
          </div>
          <p className="text-xl font-extrabold text-neutral-900 dark:text-white">{streak}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">أيام متتالية</p>
        </Card>
      </div>

      {/* Today's progress */}
      {todayStats.total > 0 && (
        <div className="mb-6">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={18} className="text-accent-500" />
                <span className="font-bold text-neutral-900 dark:text-white">تقدّم اليوم</span>
              </div>
              <span className="text-sm font-bold text-accent-600 dark:text-accent-400">
                +{todayStats.xpEarned} نقطة
              </span>
            </div>
            <ProgressBar
              value={todayProgress}
              showLabel
              variant="accent"
              size="md"
            />
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50">
        {tabs.map((tab) => {
          const count =
            tab.key === 'completed'
              ? userMissions.filter((um) => um.status === 'completed').length
              : tab.key === 'daily'
              ? userMissions.filter((um) => um.mission?.type === (tab.key === 'challenges' ? 'challenge' : tab.key) && um.assigned_date === new Date().toISOString().split('T')[0]).length
              : userMissions.filter((um) => um.mission?.type === (tab.key === 'challenges' ? 'challenge' : tab.key)).length;

          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setShowAvailable(false);
                if (tab.key === 'weekly' || tab.key === 'challenges') {
                  const type: MissionType = tab.key === 'challenges' ? 'challenge' : 'weekly';
                  fetchAvailableMissions(type);
                }
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                activeTab === tab.key
                  ? 'bg-white dark:bg-neutral-900 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-500'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading || autoAssigning ? (
        <div className="flex flex-col items-center justify-center py-20">
          {autoAssigning ? (
            <>
              <RefreshCw size={24} className="text-primary-600 animate-spin mb-3" />
              <p className="text-sm text-neutral-500 dark:text-neutral-400 font-semibold">
                جارٍ إعداد مهام اليوم...
              </p>
            </>
          ) : (
            <div className="w-10 h-10 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
          )}
        </div>
      ) : (
        <>
          {/* Assigned missions */}
          {filteredMissions.length > 0 && (
            <div className="space-y-3 mb-6">
              {filteredMissions.map((um) => (
                <MissionCard
                  key={um.id}
                  userMission={um}
                  onComplete={handleComplete}
                  onStart={handleStart}
                  saving={saving}
                />
              ))}
            </div>
          )}

          {/* Available missions to accept (weekly/challenge tabs) */}
          {(activeTab === 'weekly' || activeTab === 'challenges') && availableMissions.length > 0 && (
            <div>
              <button
                onClick={() => setShowAvailable(!showAvailable)}
                className="flex items-center gap-2 mb-4 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                <Plus size={18} />
                {showAvailable ? 'إخفاء المهام المتاحة' : `تصفّح المهام المتاحة (${availableMissions.length})`}
              </button>
              {showAvailable && (
                <div className="space-y-3 animate-fade-in">
                  {availableMissions.map((m) => (
                    <AvailableMissionCard
                      key={m.id}
                      mission={m}
                      onAccept={() => handleAcceptMission(m.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {filteredMissions.length === 0 && !((activeTab === 'weekly' || activeTab === 'challenges') && availableMissions.length > 0) && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                <Target size={28} />
              </div>
              <p className="text-neutral-500 dark:text-neutral-400 font-semibold mb-1">
                {activeTab === 'completed'
                  ? 'لم تكمل أي مهمة بعد'
                  : activeTab === 'daily'
                  ? 'لا توجد مهام يومية اليوم'
                  : activeTab === 'weekly'
                  ? 'لا توجد مهام أسبوعية حالياً'
                  : 'لا توجد تحديات حالياً'}
              </p>
              <p className="text-sm text-neutral-400">
                {activeTab === 'daily'
                  ? 'ستظهر مهامك اليومية تلقائياً عند تسجيل الدخول'
                  : 'تصفّح المهام المتاحة وابدأ رحلتك'}
              </p>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}

function AvailableMissionCard({ mission, onAccept }: { mission: Mission; onAccept: () => void }) {
  return (
    <div className="card-base p-4 flex items-center gap-3 animate-fade-in-up border-2 border-dashed border-neutral-200 dark:border-neutral-700">
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-neutral-900 dark:text-neutral-100">{mission.title}</h3>
        {mission.description && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">{mission.description}</p>
        )}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <Badge variant={difficultyBadgeVariant[mission.difficulty]} size="sm">
            {difficultyLabels[mission.difficulty]}
          </Badge>
          <span className="flex items-center gap-0.5 text-xs text-accent-600 dark:text-accent-400 font-semibold">
            <Zap size={12} />
            {mission.xp_reward} نقطة
          </span>
          {mission.duration_minutes > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-neutral-400">
              <Clock size={12} />
              {formatDurationShort(mission.duration_minutes)}
            </span>
          )}
        </div>
      </div>
      <Button size="sm" variant="outline" onClick={onAccept}>
        <Plus size={16} />
        قبول
      </Button>
    </div>
  );
}
