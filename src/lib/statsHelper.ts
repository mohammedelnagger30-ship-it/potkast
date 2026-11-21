import { supabase } from '@/lib/supabase';
import { levelFromXp } from '@/lib/gamification';

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
  const newTotalXp = stats.total_xp + xpReward;
  const newLevel = levelFromXp(newTotalXp);
  const newMissionsCompleted = stats.missions_completed + 1;

  await supabase
    .from('user_stats')
    .update({
      total_xp: newTotalXp,
      level: newLevel,
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

export async function updateStatsOnListen(
  userId: string,
  episodeId: string,
  progressSeconds: number,
  completed: boolean
) {
  await ensureUserStats(userId);

  // Fetch the episode with its podcast category
  const { data: episode } = await supabase
    .from('episodes')
    .select('id, podcast_id, podcast:podcasts(category_id)')
    .eq('id', episodeId)
    .maybeSingle();

  const categoryId = (episode as any)?.podcast?.category_id || null;
  const minutesListened = Math.floor(progressSeconds / 60);

  // Update total listening seconds
  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_listening_seconds')
    .eq('user_id', userId)
    .maybeSingle();

  if (stats) {
    // Only add the difference if this is a progress update, or full duration if completed
    // For simplicity, we add the current progress seconds
    // (the upsert in listening_history already handles per-episode tracking)
    await supabase
      .from('user_stats')
      .update({
        total_listening_seconds: stats.total_listening_seconds + Math.floor(progressSeconds) - 0,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  // Update category_progress for listening
  if (categoryId && minutesListened > 0) {
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
          minutes_listened: catProg.minutes_listened + minutesListened,
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
          xp: 0,
          missions_completed: 0,
          minutes_listened: minutesListened,
        });
    }
  }
}
