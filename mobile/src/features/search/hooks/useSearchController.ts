import { useState, useCallback, useEffect, useMemo } from 'react';
import { useInfiniteBookSearch, useLibrary } from '@/hooks/useBooks';
import type { SearchResult, BookStatus, SearchFilters } from '@/types';

const DEBOUNCE_MS = 400;

interface ErrorModalState {
  visible: boolean;
  message: string;
}

interface UseSearchControllerReturn {
  query: string;
  setQuery: (query: string) => void;
  addingId: string | null;
  addedIds: Set<string>;
  errorModal: ErrorModalState;
  closeErrorModal: () => void;
  activeFilterCount: number;
  results: SearchResult[];
  meta: ReturnType<typeof useInfiniteBookSearch>['meta'];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  handleAddToLibrary: (book: SearchResult, status: BookStatus) => Promise<void>;
  handleFiltersChange: (filters: SearchFilters) => void;
  handleEndReached: () => void;
  refresh: () => Promise<void>;
}

export function useSearchController(): UseSearchControllerReturn {
  const {
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
  } = useInfiniteBookSearch();
  const { addToLibrary } = useLibrary();

  const [query, setQuery] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [errorModal, setErrorModal] = useState<ErrorModalState>({
    visible: false,
    message: '',
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.language) count++;
    if (filters.genres && filters.genres.length > 0) count++;
    if (filters.minRating && filters.minRating > 0) count++;
    if (filters.yearFrom || filters.yearTo) count++;
    return count;
  }, [filters]);

  useEffect(() => {
    if (!query.trim()) {
      clearResults();
      return;
    }

    const timer = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, filters, search, clearResults]);

  const handleFiltersChange = useCallback(
    (newFilters: SearchFilters) => {
      setFilters(newFilters);
    },
    [setFilters]
  );

  const handleAddToLibrary = useCallback(
    async (book: SearchResult, status: BookStatus) => {
      setAddingId(book.external_id);
      try {
        await addToLibrary({
          external_id: book.external_id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          page_count: book.page_count,
          isbn: book.isbn,
          description: book.description,
          genres: book.genres,
          published_date: book.published_date,
          status,
        });
        setAddedIds((prev) => new Set(prev).add(book.external_id));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add book';
        setErrorModal({ visible: true, message });
      } finally {
        setAddingId(null);
      }
    },
    [addToLibrary]
  );

  const handleEndReached = useCallback(() => {
    if (!loadingMore && meta?.has_more) {
      loadMore();
    }
  }, [loadMore, loadingMore, meta]);

  const closeErrorModal = useCallback(() => {
    setErrorModal({ visible: false, message: '' });
  }, []);

  return {
    query,
    setQuery,
    addingId,
    addedIds,
    errorModal,
    closeErrorModal,
    activeFilterCount,
    results,
    meta,
    loading,
    loadingMore,
    error,
    filters,
    setFilters,
    handleAddToLibrary,
    handleFiltersChange,
    handleEndReached,
    refresh,
  };
}
