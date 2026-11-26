import { supabase } from '@/lib/supabase';

/** Atomically award XP from any source (missions, wheel, learning paths).
 * The SECURITY DEFINER RPC updates profiles.xp and user_stats together, so
 * two fast awards can't overwrite each other with a stale read-modify-write. */
export async function awardXp(userId: string, amount: number) {
  const safeAmount = Math.max(0, Math.floor(amount || 0));
  if (safeAmount === 0) return null;
  const { data, error } = await supabase.rpc('add_xp', {
    p_user_id: userId,
    p_amount: safeAmount,
  });
  if (error) throw new Error(error.message);
  return data as { success: boolean; xp: number; level: number };
}

export async function ensureUserStats(userId: string) {
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    await supabase
      .from('user_stats')
      .insert({ user_id: userId });
  }
  return data;
}

export async function updateStatsOnMissionComplete(
  userId: string,
  xpReward: number,
  categoryId: string | null
) {
  await ensureUserStats(userId);

  // Fetch current stats
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!stats) return;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  let newStreak = stats.current_streak;
  if (stats.last_active_date === today) {
    // Already active today, streak unchanged
  } else if (stats.last_active_date === yesterday) {
    newStreak = stats.current_streak + 1;
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(stats.longest_streak, newStreak);
  const newMissionsCompleted = stats.missions_completed + 1;

  // XP is awarded atomically by add_xp(), which keeps profiles.xp and
  // user_stats.total_xp/level in sync. Don't add it a second time here.
  await supabase
    .from('user_stats')
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: today,
      missions_completed: newMissionsCompleted,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // Update category_progress
  if (categoryId) {
    const { data: catProg } = await supabase
      .from('category_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .maybeSingle();

    if (catProg) {
      await supabase
        .from('category_progress')
        .update({
          xp: catProg.xp + xpReward,
          missions_completed: catProg.missions_completed + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('category_id', categoryId);
    } else {
      await supabase
        .from('category_progress')
        .insert({
          user_id: userId,
          category_id: categoryId,
          xp: xpReward,
          missions_completed: 1,
          minutes_listened: 0,
        });
    }
  }
}

/**
 * All listening writes go through one atomic SECURITY DEFINER RPC.
 *
 * The old client read user_stats, added a delta in JavaScript, then wrote the
 * value back. Two saves overlapping (another tab, the phone media button, or
 * a quick reload) could overwrite each other and make listening time go
 * backwards. The RPC increments in the database and appends to an audit
 * ledger, so totals are monotonic and the admin report has one source of truth.
 *
 * `listenedSeconds` must be real playback time measured while audio was
 * playing — never the difference between two absolute player positions.
 */
export async function recordListeningProgress(
  userId: string,
  episodeId: string,
  positionSeconds: number,
  listenedSeconds: number,
  completed: boolean
) {
  const position = Math.max(0, Math.floor(positionSeconds || 0));
  const seconds = Math.max(0, Math.floor(listenedSeconds || 0));

  const { data, error } = await supabase.rpc('record_listening_progress', {
    p_episode_id: episodeId,
    p_position_seconds: position,
    p_listened_seconds: seconds,
    p_completed: completed,
  });

  if (!error) return data as { success: boolean; creditedSeconds: number } | null;

  const rpcMissing = error.code === 'PGRST202' || /could not find|not found|404/i.test(error.message);
  if (!rpcMissing) throw new Error(error.message);

  // Until the migration is applied, keep resume/completion working. Do NOT
  // credit seconds through the old path — that is exactly what corrupted the
  // totals in the first place.
  const { error: fallbackError } = await supabase
    .from('listening_history')
    .upsert({
      user_id: userId,
      episode_id: episodeId,
      progress_seconds: position,
      completed,
      updated_at: new Date().toISOString(),
    });

  if (fallbackError) throw new Error(fallbackError.message);
  return { success: false, creditedSeconds: 0 };
}
