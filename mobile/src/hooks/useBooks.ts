import { useState, useCallback, useRef } from 'react';
import { booksApi } from '@/api/books';
import { ApiRequestError } from '@/api/client';
import type {
  SearchResult,
  SearchFilters,
  SearchMeta,
  UserBook,
  BookStatus,
  AddToLibraryData,
  UpdateUserBookData,
  LogSessionData,
  ReadingSession,
  ReadingStats,
} from '@/types';

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
      setResults(response.data ?? []);
      setProvider(response.meta?.provider ?? '');
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
      setResults(response.data ?? []);
      setMeta(response.meta ?? null);
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
        const newItems = (response.data ?? []).filter(
          (item) => !existingIds.has(item.external_id)
        );
        return [...prev, ...newItems];
      });
      setMeta(response.meta ?? null);
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

export function useLibrary() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLibrary = useCallback(async (status?: BookStatus) => {
    setLoading(true);
    setError(null);

    try {
      const response = await booksApi.getLibrary(status);
      const books = Array.isArray(response) ? response : (response.data ?? []);
      setBooks(books);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load library');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addToLibrary = useCallback(async (data: AddToLibraryData): Promise<UserBook | null> => {
    try {
      const userBook = await booksApi.addToLibrary(data);
      setBooks((prev) => [userBook, ...prev]);
      return userBook;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }
      throw new Error('Failed to add book');
    }
  }, []);

  const updateBook = useCallback(async (id: number, data: UpdateUserBookData): Promise<UserBook | null> => {
    try {
      const updated = await booksApi.updateUserBook(id, data);
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      return updated;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }
      throw new Error('Failed to update book');
    }
  }, []);

  const removeBook = useCallback(async (id: number): Promise<boolean> => {
    try {
      await booksApi.removeFromLibrary(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const moveToEndOfList = useCallback((id: number) => {
    setBooks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const book = prev[index];
      const newList = [...prev.slice(0, index), ...prev.slice(index + 1), book];
      return newList;
    });
  }, []);

  return {
    books,
    loading,
    error,
    fetchLibrary,
    addToLibrary,
    updateBook,
    removeBook,
    moveToEndOfList,
  };
}

export function useReadingSessions(userBookId?: number) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await booksApi.getSessions(userBookId);
      setSessions(response.data ?? []);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [userBookId]);

  const logSession = useCallback(async (data: LogSessionData): Promise<ReadingSession | null> => {
    try {
      const session = await booksApi.logSession(data);
      setSessions((prev) => [session, ...prev]);
      return session;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }
      throw new Error('Failed to log session');
    }
  }, []);

  const updateSession = useCallback(async (
    sessionId: number,
    data: {
      date?: string;
      start_page?: number;
      end_page?: number;
      duration_seconds?: number | null;
      notes?: string | null;
    }
  ): Promise<ReadingSession | null> => {
    try {
      const session = await booksApi.updateSession(sessionId, data);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? session : s))
      );
      return session;
    } catch (err) {
      if (err instanceof ApiRequestError) {
        throw err;
      }
      throw new Error('Failed to update session');
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: number): Promise<boolean> => {
    try {
      await booksApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { sessions, loading, error, fetchSessions, logSession, updateSession, deleteSession };
}

export function useReadingStats() {
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await booksApi.getStats();
      setStats(response.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to load reading stats');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
}
