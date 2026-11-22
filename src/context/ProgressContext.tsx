import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  buildProgress, emptyProgress, fetchCatalogTotals, fetchListeningHistory, hostProgressFrom,
  PROGRESS_CHANGED_EVENT, type HistoryWithRelations, type HostProgress, type OverallProgress,
} from '@/lib/progress';

const CACHE_KEY = 'nammy:progress-cache';

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
      const [rows, totals] = await Promise.all([
        fetchListeningHistory(user.id),
        fetchCatalogTotals(),
      ]);
      setHistory(rows);
      totalsRef.current = totals.byHost;
      globalRef.current = totals.global;
      setTotalsByHost(totals.byHost);
      setGlobalTotal(totals.global);
      persistSnapshot(rows);
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
    void refresh();
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
