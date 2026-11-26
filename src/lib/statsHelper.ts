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

const LISTEN_REMAINDER_KEY = 'nammy:listen-remainder';

/** Keep the sub-minute remainder locally so category minutes add up to whole
 * minutes instead of dropping every 5-second save or rounding each one up. */
function readRemainder(key: string): number {
  try {
    const raw = localStorage.getItem(LISTEN_REMAINDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return Number(parsed[key] || 0);
  } catch {
    return 0;
  }
}

function writeRemainder(key: string, value: number) {
  try {
    const raw = localStorage.getItem(LISTEN_REMAINDER_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    if (value > 0) parsed[key] = value;
    else delete parsed[key];
    localStorage.setItem(LISTEN_REMAINDER_KEY, JSON.stringify(parsed));
  } catch {
    // A blocked storage API must never break listening stats.
  }
}

/**
 * `secondsListened` is the DELTA since the previous save, not the absolute
 * playback position. Passing the absolute position here used to add the same
 * 7 minutes again every 5 seconds, which inflated both admin totals and
 * category minutes.
 */
export async function updateStatsOnListen(
  userId: string,
  episodeId: string,
  secondsListened: number,
  _completed: boolean
) {
  const delta = Math.max(0, Math.floor(secondsListened));
  if (delta === 0) return;
  await ensureUserStats(userId);

  // Fetch the episode with its podcast category
  const { data: episode } = await supabase
    .from('episodes')
    .select('id, podcast_id, podcast:podcasts(category_id)')
    .eq('id', episodeId)
    .maybeSingle();

  const categoryId = (episode as any)?.podcast?.category_id || null;

  // Update total listening seconds by the actual time listened.
  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_listening_seconds')
    .eq('user_id', userId)
    .maybeSingle();

  if (stats) {
    await supabase
      .from('user_stats')
      .update({
        total_listening_seconds: stats.total_listening_seconds + delta,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  // Update category_progress for listening with whole minutes only.
  if (categoryId) {
    const remainderKey = `${userId}:${categoryId}`;
    const accumulated = readRemainder(remainderKey) + delta;
    const minutesToAdd = Math.floor(accumulated / 60);
    writeRemainder(remainderKey, accumulated % 60);

    if (minutesToAdd > 0) {
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
            minutes_listened: catProg.minutes_listened + minutesToAdd,
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
            minutes_listened: minutesToAdd,
          });
      }
    }
  }
}
