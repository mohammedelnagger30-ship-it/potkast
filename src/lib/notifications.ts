import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface Tip {
  id: string;
  text_ar: string;
  author_or_source: string;
  category_id: string | null;
  type: 'advice' | 'quote' | 'verse' | 'hadith' | 'fact';
}

export const NOTIFICATION_TYPE_OPTIONS = [
  { key: 'tip', label: 'النصيحة اليومية' },
  { key: 'reminder', label: 'تذكير المهام' },
  { key: 'streak_lost', label: 'تذكير السلسلة' },
  { key: 'mission_assigned', label: 'مهام جديدة' },
  { key: 'mission_completed', label: 'إكمال المهام' },
  { key: 'achievement', label: 'الإنجازات' },
  { key: 'new_episode', label: 'حلقات جديدة' },
  { key: 'app_update', label: 'تحديثات التطبيق' },
  { key: 'admin', label: 'إشعارات سدى' },
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPE_OPTIONS)[number]['key'];

export interface NotificationSettings {
  user_id: string;
  daily_tip_enabled: boolean;
  reminder_enabled: boolean;
  reminder_time: string;
  categories: string[];
  push_enabled: boolean;
  types_enabled?: NotificationType[] | null;
  timezone?: string | null;
  device_token?: string | null;
  push_platform?: string | null;
}

const DAILY_TIP_CACHE_KEY = 'sada:daily-tip';
const VAPID_PUBLIC_KEY =
  'BGal4dQ87wB16f4-F7jpJGlCfkzpIeKfT5HIaIK3WIDsIeY0dbS0S-SjKtZWJoSubkcOj6QZd220iL04Htndn_Q';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function getDailyTip(user: User, interests: string[]): Promise<Tip | null> {
  // Use a deterministic seed based on the date so the tip is consistent for the day.
  const today = new Date().toISOString().split('T')[0];
  const dayHash = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
  const cacheKey = `${DAILY_TIP_CACHE_KEY}:${today}:${[...interests].sort().join(',')}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as Tip;
  } catch {
    // Cache is optional — fall through to the network.
  }

  const interestCategoryNames = interests.map((i) => interestToCategoryName(i)).filter(Boolean);

  // Categories and tips are independent. Fetch them together instead of making
  // three sequential round trips on every cold start.
  const [categoriesRes, tipsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id')
      .in('name_ar', interestCategoryNames.length > 0 ? interestCategoryNames : ['__none__']),
    supabase.from('tips').select('id, text_ar, author_or_source, category_id, type'),
  ]);

  const allTips = (tipsRes.data || []) as Tip[];
  if (allTips.length === 0) return null;

  const catIds = (categoriesRes.data || []).map((c) => c.id);
  const interestTips = catIds.length > 0
    ? allTips.filter((tip) => tip.category_id && catIds.includes(tip.category_id))
    : [];
  const pool = interestTips.length > 0 ? interestTips : allTips;
  const tip = pool[dayHash % pool.length];

  try {
    localStorage.setItem(cacheKey, JSON.stringify(tip));
  } catch {
    // Storage may be disabled — the tip still works for this session.
  }
  return tip;
}

function interestToCategoryName(interest: string): string | null {
  const map: Record<string, string> = {
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
  return map[interest] || null;
}

export async function getNotificationSettings(userId: string): Promise<NotificationSettings | null> {
  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as NotificationSettings | null;
}

export async function ensureNotificationSettings(userId: string): Promise<NotificationSettings> {
  const existing = await getNotificationSettings(userId);
  if (existing) return existing;

  await supabase.from('notification_settings').insert({ user_id: userId });
  const { data } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as NotificationSettings;
}

export async function updateNotificationSettings(
  userId: string,
  updates: Partial<NotificationSettings>
): Promise<void> {
  await supabase
    .from('notification_settings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_id', userId);
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link: string | null = null
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    link,
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

// Web Push helpers
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  const permission = await requestPushPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    try {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    } catch (error) {
      console.error('Push subscription failed', error);
      return false;
    }
  }

  const { error } = await supabase
    .from('notification_settings')
    .update({
      push_enabled: true,
      push_platform: 'web',
      push_subscription: subscription as any,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) {
    console.error('Saving push subscription failed', error.message);
    return false;
  }

  return true;
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (subscription) await subscription.unsubscribe();

  await supabase
    .from('notification_settings')
    .update({
      push_enabled: false,
      push_platform: null,
      push_subscription: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

export async function sendTestPush(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;
  const { error } = await supabase.functions.invoke('daily-digest', {
    body: { action: 'test' },
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) {
    console.error('Test push failed', error.message);
    return false;
  }
  return true;
}

export function showLocalNotification(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    });
  }
}
