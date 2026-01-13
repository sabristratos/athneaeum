import { useState, useCallback } from 'react';
import { useLocalStats } from '@/hooks';
import { formatDateFromString } from '@/utils/dateUtils';
import type { ReadingStats, RecentSession } from '@/types';

interface UseReadingStatsControllerReturn {
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  isLocalOnly: boolean;
  onRefresh: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export function useReadingStatsController(): UseReadingStatsControllerReturn {
  const { stats, loading, error, isLocalOnly, refresh } = useLocalStats();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const fetchStats = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return {
    stats,
    loading,
    error,
    refreshing,
    isLocalOnly,
    onRefresh,
    fetchStats,
  };
}

interface StatBoxProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

export function formatStatBox(label: string, value: string | number, accent?: boolean): StatBoxProps {
  return { label, value, accent };
}

interface FormattedRecentSession {
  id: number;
  bookTitle: string;
  bookAuthor: string;
  coverUrl: string | null;
  startPage: number;
  endPage: number;
  pagesRead: number;
  formattedDate: string;
  formattedDuration: string | null;
}

export function formatRecentSession(session: RecentSession): FormattedRecentSession {
  return {
    id: session.id,
    bookTitle: session.book.title,
    bookAuthor: session.book.author,
    coverUrl: session.book.cover_url,
    startPage: session.start_page,
    endPage: session.end_page,
    pagesRead: session.pages_read,
    formattedDate: formatDateFromString(session.date),
    formattedDuration: session.formatted_duration,
  };
}
