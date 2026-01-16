import { useState, useCallback, useRef } from 'react';
import { booksApi } from '@/api/books';
import { calculateLocalStats } from '@/services/LocalStatsService';
import type {
  SearchResult,
  SearchFilters,
  SearchMeta,
  ReadingStats,
} from '@/types';

/**
 * Hook for basic book search.
 * This is an API-based hook for external book search.
 */
export function useBookSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await booksApi.search(query);
      setResults(response.items ?? []);
      setProvider(response.provider ?? '');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Search failed');
      }
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, provider, search, clearResults };
}

const PAGE_SIZE = 20;

/**
 * Hook for infinite scroll book search.
 * This is an API-based hook for external book search with pagination.
 */
export function useInfiniteBookSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<SearchFilters>({});

  const currentQueryRef = useRef<string>('');

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setMeta(null);
      setError(null);
      currentQueryRef.current = '';
      return;
    }

    currentQueryRef.current = query;
    setLoading(true);
    setError(null);

    try {
      const response = await booksApi.search(query, PAGE_SIZE, 0, filters);
      setResults(response.items ?? []);
      setMeta({
        total: response.total,
        has_more: response.has_more,
        provider: response.provider,
        start_index: response.start_index,
      });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Search failed');
      }
      setResults([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (!meta?.has_more || loadingMore || loading || !currentQueryRef.current) {
      return;
    }

    const nextIndex = meta.start_index + PAGE_SIZE;
    setLoadingMore(true);

    try {
      const response = await booksApi.search(
        currentQueryRef.current,
        PAGE_SIZE,
        nextIndex,
        filters
      );
      setResults((prev) => {
        const existingIds = new Set(prev.map((item) => item.external_id));
        const newItems = (response.items ?? []).filter(
          (item) => !existingIds.has(item.external_id)
        );
        return [...prev, ...newItems];
      });
      setMeta({
        total: response.total,
        has_more: response.has_more,
        provider: response.provider,
        start_index: response.start_index,
      });
    } catch {
      // Silent fail for load more - don't clear existing results
    } finally {
      setLoadingMore(false);
    }
  }, [meta, loadingMore, loading, filters]);

  const refresh = useCallback(async () => {
    if (currentQueryRef.current) {
      await search(currentQueryRef.current);
    }
  }, [search]);

  const clearResults = useCallback(() => {
    setResults([]);
    setMeta(null);
    setError(null);
    currentQueryRef.current = '';
  }, []);

  const setFilters = useCallback((newFilters: SearchFilters) => {
    setFiltersState(newFilters);
  }, []);

  return {
    results,
    meta,
    loading,
    loadingMore,
    error,
    filters,
    search,
    loadMore,
    setFilters,
    clearResults,
    refresh,
  };
}

/**
 * Hook for fetching reading stats from the backend.
 * Falls back to local calculation when offline.
 *
 * @deprecated Use useReadingStatsQuery from @/queries instead for TanStack Query caching.
 */
export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const apiStats = await booksApi.getStats();
      setStats(apiStats);
    } catch (err) {
      try {
        const localStats = await calculateLocalStats();
        setStats(localStats);
        setIsOffline(true);
      } catch (localErr) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to load reading stats');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, isOffline, fetchStats };
}
