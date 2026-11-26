import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface AdminTotals {
  users: number;
  profiles: number;
  onboarded: number;
  admins: number;
  activeToday: number;
  activeWeek: number;
  listeningHours: number;
  missionsCompleted: number;
  episodesCompleted: number;
  totalXp: number;
  hosts: number;
  podcasts: number;
  episodes: number;
  categories: number;
  notifications: number;
  journalEntries: number;
  achievementsUnlocked: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  interests: string[];
  dailyGoalMinutes: number;
  reminderTime: string;
  onboarded: boolean;
  emailConfirmed: boolean;
  banned: boolean;
  isAdmin: boolean;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  listeningSeconds: number;
  episodesStarted: number;
  episodesCompleted: number;
  missionsCompleted: number;
  missionsPending: number;
  podcastFavorites: number;
  episodeFavorites: number;
  hostsFollowed: number;
  achievements: number;
  journalEntries: number;
  wheelSpins: number;
  pathsEnrolled: number;
  bookmarks: number;
  episodeNotes: number;
  notifications: number;
  createdAt: string;
  updatedAt: string;
  lastSignInAt: string | null;
  lastActiveAt: string | null;
}

export interface ListeningCategory {
  category: string;
  seconds: number;
}

/** Cumulative listening for one user, from the moment they first used the app. */
export interface ListeningSummary {
  userId: string;
  joinedAt: string;
  lifetimeSeconds: number;
  historySeconds: number;
  statsSeconds: number;
  firstListenAt: string | null;
  lastListenAt: string | null;
  episodesStarted: number;
  episodesCompleted: number;
  activeDays: number;
  byCategory: ListeningCategory[];
}

export interface ListeningEpisode {
  episodeId: string;
  title: string;
  podcastTitle: string;
  category: string;
  durationSeconds: number;
  progressSeconds: number;
  percent: number;
  completed: boolean;
  updatedAt: string | null;
}

export interface UserListeningReport {
  summary: ListeningSummary;
  episodes: ListeningEpisode[];
}

export interface ActivityDay {
  day: string;
  label: string;
  listens: number;
  missions: number;
  activeUsers: number;
}

export interface LevelCount {
  level: number;
  count: number;
}

export interface InterestCount {
  name: string;
  count: number;
}

export interface RecentEvent {
  type: string;
  label: string;
  item: string;
  name: string;
  email: string;
  at: string;
}

export interface TopPodcast {
  id: string;
  title: string;
  hostName: string;
  coverUrl: string;
  plays: number;
  episodes: number;
}

export interface TopHost {
  id: string;
  name: string;
  slug: string;
  photoUrl: string;
  specialty: string;
  followers: number;
}

export interface AdminEmail {
  email: string;
  label: string;
  active: boolean;
  createdAt: string;
}

export interface AdminDashboard {
  generatedAt: string;
  isAdmin: boolean;
  totals: AdminTotals;
  users: AdminUser[];
  /** Optional until the lifetime-listening migration is run. */
  listeningReport?: ListeningSummary[];
  activity: ActivityDay[];
  levels: LevelCount[];
  interests: InterestCount[];
  recentActivity: RecentEvent[];
  topPodcasts: TopPodcast[];
  topHosts: TopHost[];
  admins: AdminEmail[];
}

async function callRpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// Remember once if the new RPC is not deployed so we don't spam 404s on every load.
let listeningRpcAvailable: boolean | null = null;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  if (listeningRpcAvailable !== false) {
    try {
      const result = await callRpc<AdminDashboard>('admin_get_dashboard_with_listening');
      listeningRpcAvailable = true;
      return result;
    } catch {
      // The app still works if the lifetime-listening migration has not been run.
      listeningRpcAvailable = false;
    }
  }
  return callRpc<AdminDashboard>('admin_get_dashboard');
}

async function checkAdminAccess() {
  const { data, error } = await supabase.rpc('admin_is_admin');
  if (error) throw new Error(error.message);
  return data === true;
}

export const adminActions = {
  getUserListening: (userId: string) =>
    callRpc<UserListeningReport>('admin_get_user_listening', { p_user_id: userId }),
  sendNotification: (userId: string, title: string, body: string, link?: string) =>
    callRpc<{ success: boolean }>('admin_send_notification', {
      p_user_id: userId,
      p_title: title,
      p_body: body,
      p_link: link || null,
    }),
  broadcast: (title: string, body: string, link?: string) =>
    callRpc<{ success: boolean; sent: number }>('admin_broadcast_notification', {
      p_title: title,
      p_body: body,
      p_link: link || null,
    }),
  setXp: (userId: string, xp: number) =>
    callRpc<{ success: boolean; xp: number; level: number }>('admin_set_user_xp', {
      p_user_id: userId,
      p_xp: xp,
    }),
  resetUser: (userId: string) =>
    callRpc<{ success: boolean }>('admin_reset_user', { p_user_id: userId }),
  setBan: (userId: string, banned: boolean) =>
    callRpc<{ success: boolean }>('admin_set_user_ban', { p_user_id: userId, p_banned: banned }),
  deleteUser: async (userId: string) => {
    const result = await callRpc<{ success: boolean; error?: string }>('admin_delete_user', {
      p_user_id: userId,
    });
    if (!result?.success) throw new Error(result?.error || 'تعذّر حذف المستخدم');
    return result;
  },
  setAdminEmail: (email: string, active: boolean) =>
    callRpc<{ success: boolean }>('admin_set_admin_email', { p_email: email, p_active: active }),
};

// Access results are cached per user so Header, Sidebar and the route guard
// don't each fire the same RPC on every navigation.
const accessCache = new Map<string, boolean>();

export function clearAdminAccessCache() {
  accessCache.clear();
}

export function useAdminStatus() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(() => (user ? accessCache.get(user.id) ?? false : false));
  const [loading, setLoading] = useState(() => !!user && !accessCache.has(user.id));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    if (accessCache.has(user.id)) {
      setIsAdmin(accessCache.get(user.id) ?? false);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    void checkAdminAccess()
      .then((allowed) => {
        if (!active) return;
        accessCache.set(user.id, allowed);
        setIsAdmin(allowed);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setIsAdmin(false);
        setError(err instanceof Error ? err.message : 'تعذّر التحقق من صلاحية الأدمن');
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  return { isAdmin, loading, error };
}
