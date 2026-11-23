import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  buildProgress, emptyProgress, fetchCatalogTotals, fetchListeningHistory, hostProgressFrom,
  PROGRESS_CHANGED_EVENT, type HistoryWithRelations, type HostProgress, type OverallProgress,
} from '@/lib/progress';

const CACHE_KEY = 'nammy:progress-cache';
// The catalog totals are effectively static (the imported catalog rarely changes).
// Reusing a fresh snapshot avoids a paged aggregate query on every cold start.
const TOTALS_FRESH_MS = 24 * 60 * 60 * 1000;

interface CachedProgress {
  userId: string;
  history: HistoryWithRelations[];
  totalsByHost: Record<string, number>;
  globalTotal: number;
  savedAt: number;
}

interface ProgressContextValue {
  progress: OverallProgress;
  refresh: () => Promise<void>;
  getHostProgress: (hostId: string, totalEpisodes?: number) => HostProgress;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(undefined);

function readCache(userId: string): CachedProgress | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedProgress;
    return parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryWithRelations[]>([]);
  const [totalsByHost, setTotalsByHost] = useState<Record<string, number>>({});
  const [globalTotal, setGlobalTotal] = useState(0);
  const timerRef = useRef<number | null>(null);
  const totalsRef = useRef(totalsByHost);
  const globalRef = useRef(globalTotal);
  const userIdRef = useRef<string | null>(null);

  const persistSnapshot = useCallback((rows: HistoryWithRelations[]) => {
    if (!user) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        userId: user.id,
        history: rows,
        totalsByHost: totalsRef.current,
        globalTotal: globalRef.current,
        savedAt: Date.now(),
      } satisfies CachedProgress));
    } catch {
      // Storage can be full or blocked — progress still works in memory.
    }
  }, [user]);

  const refresh = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setTotalsByHost({});
      setGlobalTotal(0);
      return;
    }
    try {
      const cached = readCache(user.id);
      const totalsFresh = cached && Date.now() - cached.savedAt < TOTALS_FRESH_MS
        && Object.keys(cached.totalsByHost || {}).length > 0;
      const [rows, totals] = await Promise.all([
        fetchListeningHistory(user.id),
        totalsFresh
          ? Promise.resolve({ byHost: cached!.totalsByHost, global: cached!.globalTotal })
          : fetchCatalogTotals(),
      ]);
      setHistory(rows);
      totalsRef.current = totals.byHost;
      globalRef.current = totals.global;
      setTotalsByHost(totals.byHost);
      setGlobalTotal(totals.global);
      persistSnapshot(rows);

      // A newly imported show must not wait for the cache to expire. Use the
      // fresh snapshot immediately, then reconcile the totals quietly so the
      // next cold start is already up to date.
      if (totalsFresh) {
        const userId = user.id;
        void fetchCatalogTotals()
          .then((latest) => {
            if (userIdRef.current !== userId) return;
            totalsRef.current = latest.byHost;
            globalRef.current = latest.global;
            setTotalsByHost(latest.byHost);
            setGlobalTotal(latest.global);
            persistSnapshot(rows);
          })
          .catch(() => undefined);
      }
    } catch {
      // Keep the last good snapshot when offline (cached state stays mounted).
    }
  }, [user, persistSnapshot]);

  // Listening position changes often; refresh only the history, not the whole
  // 740-row catalog count.
  const refreshHistory = useCallback(async () => {
    if (!user) return;
    try {
      const rows = await fetchListeningHistory(user.id);
      setHistory(rows);
      persistSnapshot(rows);
    } catch {
      // Offline: keep the cached snapshot.
    }
  }, [user, persistSnapshot]);

  // Show the saved snapshot immediately so progress is visible offline,
  // then quietly bring it up to date from Supabase.
  useEffect(() => {
    userIdRef.current = user?.id ?? null;
    if (!user) return;
    const cached = readCache(user.id);
    if (cached) {
      setHistory(cached.history);
      totalsRef.current = cached.totalsByHost;
      globalRef.current = cached.globalTotal;
      setTotalsByHost(cached.totalsByHost);
      setGlobalTotal(cached.globalTotal);
    } else {
      setHistory([]);
      totalsRef.current = {};
      globalRef.current = 0;
      setTotalsByHost({});
      setGlobalTotal(0);
    }
    // The deep history + catalog-totals query is background work: show the
    // saved snapshot first, then refresh once the app has settled.
    const timer = window.setTimeout(() => { void refresh(); }, 1500);
    return () => window.clearTimeout(timer);
  }, [user, refresh]);

  // The audio player fires this after every saved listening position.
  useEffect(() => {
    const onChange = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => void refreshHistory(), 700);
    };
    window.addEventListener(PROGRESS_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(PROGRESS_CHANGED_EVENT, onChange);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [refreshHistory]);

  const progress = useMemo(
    () => buildProgress(history, totalsByHost, globalTotal),
    [history, totalsByHost, globalTotal]
  );

  const getHostProgress = useCallback(
    (hostId: string, totalEpisodes?: number) =>
      hostProgressFrom(history, hostId, totalEpisodes ?? totalsByHost[hostId] ?? 0),
    [history, totalsByHost]
  );

  return (
    <ProgressContext.Provider value={{ progress: progress || emptyProgress, refresh, getHostProgress }}>
      {children}
    </ProgressContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
