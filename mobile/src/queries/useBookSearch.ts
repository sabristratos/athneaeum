import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import type { SearchFilters, SearchResponse } from '@/types';

const PAGE_SIZE = 20;

interface UseBookSearchQueryOptions {
  enabled?: boolean;
}

export function useBookSearchQuery(
  query: string,
  filters?: SearchFilters,
  options?: UseBookSearchQueryOptions
) {
  return useQuery({
    queryKey: queryKeys.books.search(query, filters),
    queryFn: () => booksApi.search(query, PAGE_SIZE, 0, filters),
    enabled: (options?.enabled ?? true) && query.trim().length > 0,
    staleTime: 1000 * 60 * 10,
    placeholderData: keepPreviousData,
  });
}

export function useInfiniteBookSearchQuery(
  query: string,
  filters?: SearchFilters,
  options?: UseBookSearchQueryOptions
) {
  return useInfiniteQuery({
    queryKey: queryKeys.books.searchInfinite(query, filters),
    queryFn: ({ pageParam = 0 }) =>
      booksApi.search(query, PAGE_SIZE, pageParam, filters),
    enabled: (options?.enabled ?? true) && query.trim().length > 0,
    staleTime: 1000 * 60 * 10,
    initialPageParam: 0,
    getNextPageParam: (lastPage: SearchResponse) => {
      if (!lastPage.meta?.has_more) return undefined;
      return lastPage.meta.start_index + PAGE_SIZE;
    },
    select: (data) => ({
      results: data.pages.flatMap((page) => page.data ?? []),
      meta: data.pages[data.pages.length - 1]?.meta,
    }),
  });
}
