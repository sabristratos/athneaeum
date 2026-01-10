import { useState, useCallback } from 'react';
import { useReadingStatsQuery } from '@/queries';
import type { ReadingStats, RecentSession } from '@/types';

interface UseReadingStatsControllerReturn {
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export function useReadingStatsController(): UseReadingStatsControllerReturn {
  const { data: stats, isLoading, error: queryError, refetch, isRefetching } = useReadingStatsQuery();
  const [refreshing, setRefreshing] = useState(false);

  const loading = isLoading;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load reading stats') : null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const fetchStats = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    stats: stats ?? null,
    loading,
    error,
    refreshing: refreshing || isRefetching,
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
    formattedDate: new Date(session.date).toLocaleDateString(),
    formattedDuration: session.formatted_duration,
  };
}
