import { useState, useEffect, useCallback, useRef } from 'react';
import { calculateLocalStats } from '@/services/LocalStatsService';
import { useSync } from '@/database/DatabaseProvider';
import type { ReadingStats } from '@/types';

interface UseLocalStatsReturn {
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  isLocalOnly: boolean;
  lastCalculatedAt: number | null;
  refresh: () => Promise<void>;
}

export function useLocalStats(): UseLocalStatsReturn {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCalculatedAt, setLastCalculatedAt] = useState<number | null>(null);
  const { isOnline, lastSyncAt } = useSync();
  const initialLoadDone = useRef(false);

  const doCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const localStats = await calculateLocalStats();
      setStats(localStats);
      setLastCalculatedAt(Date.now());
    } catch (e) {
      console.warn('[LocalStats] Calculation failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to calculate stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      doCalculate();
    }
  }, [doCalculate]);

  useEffect(() => {
    if (lastSyncAt && initialLoadDone.current) {
      doCalculate();
    }
  }, [lastSyncAt, doCalculate]);

  const refresh = useCallback(async () => {
    await doCalculate();
  }, [doCalculate]);

  return {
    stats,
    loading,
    error,
    isLocalOnly: !isOnline,
    lastCalculatedAt,
    refresh,
  };
}
