import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Reading Stats Query Hooks - Backend-computed statistics.
 *
 * These hooks fetch pre-computed statistics from the backend.
 * Statistics are calculated server-side because they require:
 * - Aggregation across all user data
 * - Complex calculations (streaks, heatmaps, analytics)
 * - Historical data that may not be fully synced to mobile
 *
 * TanStack Query is appropriate here because:
 * 1. Data is computed on demand by the server
 * 2. Caching with short staleTime is sufficient
 * 3. Offline display of stats is acceptable with stale data
 */

export function useReadingStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.reading(),
    queryFn: () => booksApi.getStats(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useHeatmapQuery() {
  return useQuery({
    queryKey: queryKeys.stats.heatmap(),
    queryFn: () => booksApi.getHeatmap(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useFormatVelocityQuery() {
  return useQuery({
    queryKey: queryKeys.stats.formatVelocity(),
    queryFn: () => booksApi.getFormatVelocity(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useMoodRingQuery() {
  return useQuery({
    queryKey: queryKeys.stats.moodRing(),
    queryFn: () => booksApi.getMoodRing(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDnfAnalyticsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.dnfAnalytics(),
    queryFn: () => booksApi.getDnfAnalytics(),
    staleTime: 1000 * 60 * 10,
  });
}

export function usePageEconomyQuery() {
  return useQuery({
    queryKey: queryKeys.stats.pageEconomy(),
    queryFn: () => booksApi.getPageEconomy(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useCalendarQuery(year: number, month?: number) {
  return useQuery({
    queryKey: queryKeys.stats.calendar(year, month),
    queryFn: () => booksApi.getCalendar(year, month),
    staleTime: 1000 * 60 * 5,
  });
}
