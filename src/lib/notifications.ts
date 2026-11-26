import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
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

// Web Push + Android FCM helpers
const FCM_CHANNEL_ID = 'sada-notifications';
let nativePushInitialised = false;

export function isNativePush(): boolean {
  return Capacitor.isNativePlatform();
}

async function saveNativeToken(userId: string, token: string): Promise<boolean> {
  const { error } = await supabase
    .from('notification_settings')
    .update({
      push_enabled: true,
      push_platform: 'android',
      device_token: token,
      push_subscription: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) {
    console.error('Saving FCM token failed', error.message);
    return false;
  }
  return true;
}

async function openPushUrl(url: unknown): Promise<void> {
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) return;
  window.location.assign(url);
}

/** Wire token refresh and notification taps once, for the whole app session. */
export async function initializeNativePush(): Promise<void> {
  if (!isNativePush() || nativePushInitialised) return;
  nativePushInitialised = true;

  await PushNotifications.addListener('registration', async ({ value }) => {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await saveNativeToken(data.session.user.id, value);
  });
  await PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration failed', error.error);
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
    void openPushUrl(event.notification.data?.url ?? event.notification.link);
  });
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (isNativePush()) {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === 'granted') return 'granted';
    if (status.receive === 'denied') return 'denied';
    return 'default';
  }
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (isNativePush()) {
    const current = await PushNotifications.checkPermissions();
    if (current.receive === 'granted') return 'granted';
    const requested = await PushNotifications.requestPermissions();
    return requested.receive === 'granted' ? 'granted' : 'denied';
  }
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
}

async function subscribeNativePush(userId: string): Promise<boolean> {
  await initializeNativePush();
  const permission = await requestPushPermission();
  if (permission !== 'granted') return false;

  try {
    await PushNotifications.createChannel({
      id: FCM_CHANNEL_ID,
      name: 'سدى',
      description: 'النصائح والتذكيرات وإنجازات سدى',
      importance: 4,
      visibility: 1,
      sound: 'default',
      vibration: true,
    });
  } catch {
    // The channel already exists with the same settings — harmless.
  }

  const handles: {
    registration?: PluginListenerHandle;
    error?: PluginListenerHandle;
  } = {};
  try {
    const token = await new Promise<string>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        fn();
      };
      const timer = window.setTimeout(() => finish(() => reject(new Error('Push registration timed out'))), 20000);

      PushNotifications.addListener('registration', ({ value }) => {
        void handles.registration?.remove();
        void handles.error?.remove();
        finish(() => resolve(value));
      }).then((handle) => { handles.registration = handle; }).catch(reject);
      PushNotifications.addListener('registrationError', (error) => {
        void handles.registration?.remove();
        void handles.error?.remove();
        finish(() => reject(new Error(error.error)));
      }).then((handle) => { handles.error = handle; }).catch(reject);
      PushNotifications.register().catch(reject);
    });
    return await saveNativeToken(userId, token);
  } catch (error) {
    console.error('Native push subscription failed', error);
    void handles.registration?.remove();
    void handles.error?.remove();
    return false;
  }
}

async function subscribeWebPush(userId: string): Promise<boolean> {
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
      device_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) {
    console.error('Saving push subscription failed', error.message);
    return false;
  }

  return true;
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  return isNativePush() ? subscribeNativePush(userId) : subscribeWebPush(userId);
}

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (isNativePush()) {
    await PushNotifications.unregister();
  } else if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe();
  }

  await supabase
    .from('notification_settings')
    .update({
      push_enabled: false,
      push_platform: null,
      push_subscription: null,
      device_token: null,
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
