import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  name: string;
  avatar: string | null;
  interests: string[];
  daily_goal_minutes: number;
  reminder_time: string;
  onboarded: boolean;
  xp: number;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_BACKUP_KEY = 'nammy:auth-session';
const MANUAL_SIGNOUT_KEY = 'nammy:manual-signout';
const PROFILE_CACHE_KEY = 'sada:profile-cache';
const MANUAL_SIGNOUT_WINDOW_MS = 15000;

function saveSessionBackup(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_BACKUP_KEY);
  } catch {
    // Storage may be blocked; the in-memory session still works.
  }
}

function readSessionBackup(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_BACKUP_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function readProfileCache(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function saveProfileCache(profile: Profile | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Storage may be blocked — the in-memory profile still works.
  }
}

function wasManualSignOut() {
  try {
    const at = Number(localStorage.getItem(MANUAL_SIGNOUT_KEY) || 0);
    return Date.now() - at < MANUAL_SIGNOUT_WINDOW_MS;
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(readProfileCache);
  const [loading, setLoading] = useState(true);
  const manualSignOutRef = useRef(false);

  const restoreSession = async (backup: Session) => {
    const { error } = await supabase.auth.setSession(backup);
    if (error) throw error;

    let active = backup;
    if (!backup.expires_at || backup.expires_at * 1000 < Date.now() + 60000) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshed.session) throw refreshError || new Error('refresh failed');
      active = refreshed.session;
    }
    saveSessionBackup(active);
    setSession(active);
    await fetchProfile(active.user.id);
    return active;
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    const next = data as Profile | null;
    setProfile(next);
    if (next) saveProfileCache(next);
    return next;
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const activeSession = data.session;
      if (activeSession) {
        const cached = readProfileCache();
        const hasUsableCache = cached?.id === activeSession.user.id;
        saveSessionBackup(activeSession);
        setSession(activeSession);

        // A cached profile lets the first screen paint immediately. The fresh
        // profile still syncs in the background so nothing stays stale.
        if (hasUsableCache) {
          setLoading(false);
          void fetchProfile(activeSession.user.id);
        } else {
          await fetchProfile(activeSession.user.id);
          setLoading(false);
        }
        return;
      }

      const backup = readSessionBackup();
      if (backup && !wasManualSignOut()) {
        setLoading(true);
        try {
          await restoreSession(backup);
        } catch {
          saveSessionBackup(null);
        }
      } else {
        saveProfileCache(null);
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Supabase clears its own storage on a hard SIGNED_OUT. That can happen
      // when a token refresh is rejected even though the user did not log out.
      // Keep a separate backup and restore it unless this was an explicit sign-out.
      if (event === 'SIGNED_OUT' && !manualSignOutRef.current && !wasManualSignOut()) {
        const backup = readSessionBackup();
        if (!backup) {
          setSession(null);
          setProfile(null);
          saveProfileCache(null);
          setLoading(false);
          return;
        }
        void (async () => {
          setLoading(true);
          try {
            await restoreSession(backup);
          } catch {
            saveSessionBackup(null);
            setSession(null);
            setProfile(null);
          } finally {
            setLoading(false);
          }
        })();
        return;
      }

      if (newSession) saveSessionBackup(newSession);
      setSession(newSession);
      if (newSession?.user) {
        void fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return { error: error.message, needsConfirmation: false };

    const needsConfirmation = !data.session;
    if (data.session) {
      // Supabase may fire the auth event after the caller has already navigated.
      // Publish the new session ourselves so ProtectedRoute never bounces back
      // to /auth on the first successful sign-up.
      saveSessionBackup(data.session);
      setLoading(true);
      if (data.user) await fetchProfile(data.user.id);
      setSession(data.session);
      setLoading(false);
    }
    return { error: null, needsConfirmation };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.session) {
      saveSessionBackup(data.session);
      setLoading(true);
      if (data.user) await fetchProfile(data.user.id);
      setSession(data.session);
      setLoading(false);
    }
    return { error: null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    manualSignOutRef.current = true;
    try {
      localStorage.setItem(MANUAL_SIGNOUT_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures — the ref below still covers this tab.
    }
    await supabase.auth.signOut();
    saveSessionBackup(null);
    saveProfileCache(null);
    setProfile(null);
    setSession(null);
    window.setTimeout(() => { manualSignOutRef.current = false; }, 1000);
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
  };

  const updateProfile = async (patch: Partial<Profile>) => {
    const id = session?.user?.id;
    if (!id) return { error: 'لازم تسجّل دخول أولاً' };

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message };
    if (data) setProfile(data as Profile);
    else await fetchProfile(id);
    return { error: null };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
