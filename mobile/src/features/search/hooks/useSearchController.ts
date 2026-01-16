import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useInfiniteBookSearchQuery, useLibraryExternalIdsQuery } from '@/queries';
import { queryKeys } from '@/lib/queryKeys';
import { useAddToLibrary } from '@/database/hooks/useLibrary';
import { useToast } from '@/stores/toastStore';
import { useRecentSearchActions } from '@/stores/recentSearchesStore';
import type { SearchResult, BookStatus, SearchFilters, LibraryExternalIdEntry, UserBook } from '@/types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const DEBOUNCE_MS = 400;

interface PendingSeriesSuggestion {
  seriesName: string;
  volumeNumber: number;
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
}

interface UseSearchControllerOptions {
  onNavigateToBook?: (userBook: UserBook) => void;
}

interface UseSearchControllerReturn {
  query: string;
  setQuery: (query: string) => void;
  addingId: string | null;
  addedIds: Set<string>;
  libraryMap: Record<string, LibraryExternalIdEntry>;
  activeFilterCount: number;
  results: SearchResult[];
  meta: { total: number; has_more: boolean; provider: string; start_index: number } | undefined;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  handleAddToLibrary: (book: SearchResult, status: BookStatus) => Promise<void>;
  handleFiltersChange: (filters: SearchFilters) => void;
  handleEndReached: () => void;
  refresh: () => Promise<void>;
  pendingSeriesSuggestion: PendingSeriesSuggestion | null;
  clearSeriesSuggestion: () => void;
}

export function useSearchController(options: UseSearchControllerOptions = {}): UseSearchControllerReturn {
  const { onNavigateToBook } = options;
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [pendingSeriesSuggestion, setPendingSeriesSuggestion] = useState<PendingSeriesSuggestion | null>(null);

  const queryClient = useQueryClient();
  const toast = useToast();
  const { addSearch } = useRecentSearchActions();
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const lastSavedQueryRef = useRef<string | null>(null);

  const { data: libraryMap = {} } = useLibraryExternalIdsQuery();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteBookSearchQuery(debouncedQuery, filters);

  const { addBook } = useAddToLibrary();

  const results = data?.results ?? [];
  const meta = data?.meta;
  const loading = isLoading;
  const loadingMore = isFetchingNextPage;
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Search failed') : null;

  useEffect(() => {
    if (
      results.length > 0 &&
      debouncedQuery.trim().length >= 2 &&
      debouncedQuery !== lastSavedQueryRef.current
    ) {
      lastSavedQueryRef.current = debouncedQuery;
      addSearch(debouncedQuery);
    }
  }, [results.length, debouncedQuery, addSearch]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.language) count++;
    if (filters.genres && filters.genres.length > 0) count++;
    if (filters.minRating && filters.minRating > 0) count++;
    if (filters.yearFrom || filters.yearTo) count++;
    return count;
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const handleAddToLibrary = useCallback(
    async (book: SearchResult, status: BookStatus) => {
      setAddingId(book.external_id);
      try {
        const userBookId = await addBook(
          {
            externalId: book.external_id,
            externalProvider: 'google_books',
            title: book.title,
            author: book.author,
            coverUrl: book.cover_url ?? undefined,
            pageCount: book.page_count ?? undefined,
            isbn: book.isbn ?? undefined,
            description: book.description ?? undefined,
            genres: book.genres,
            publishedDate: book.published_date ?? undefined,
          },
          status
        );
        setAddedIds((prev) => new Set(prev).add(book.external_id));
        queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
        triggerHaptic('success');

        if (book.series_name && book.volume_number) {
          setPendingSeriesSuggestion({
            seriesName: book.series_name,
            volumeNumber: book.volume_number,
            bookId: 0,
            bookTitle: book.title,
            bookAuthor: book.author,
          });
        } else {
          toast.success('Added to library');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add book';
        triggerHaptic('error');
        toast.danger(message);
      } finally {
        setAddingId(null);
      }
    },
    [addBook, queryClient, toast]
  );

  const handleEndReached = useCallback(async () => {
    if (!isFetchingNextPage && hasNextPage) {
      try {
        const result = await fetchNextPage();
        if (result.isError) {
          toast.warning('Failed to load more results');
        }
      } catch {
        toast.warning('Failed to load more results');
      }
    }
  }, [fetchNextPage, isFetchingNextPage, hasNextPage, toast]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clearSeriesSuggestion = useCallback(() => {
    setPendingSeriesSuggestion(null);
  }, []);

  return {
    query,
    setQuery,
    addingId,
    addedIds,
    libraryMap,
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
    pendingSeriesSuggestion,
    clearSeriesSuggestion,
  };
}
