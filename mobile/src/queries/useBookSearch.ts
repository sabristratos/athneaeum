import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import type { SearchFilters, SearchResponse, SearchResult } from '@/types';
import type { SearchSource } from '@/types/auth';

const PAGE_SIZE = 20;

interface UseBookSearchQueryOptions {
  enabled?: boolean;
  source?: SearchSource;
}

export function useBookSearchQuery(
  query: string,
  filters?: SearchFilters,
  options?: UseBookSearchQueryOptions
) {
  return useQuery({
    queryKey: queryKeys.books.search(query, filters, options?.source),
    queryFn: () => booksApi.search(query, PAGE_SIZE, 0, filters, options?.source),
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
    queryKey: queryKeys.books.searchInfinite(query, filters, options?.source),
    queryFn: ({ pageParam = 0 }) =>
      booksApi.search(query, PAGE_SIZE, pageParam, filters, options?.source),
    enabled: (options?.enabled ?? true) && query.trim().length > 0,
    staleTime: 1000 * 60 * 10,
    initialPageParam: 0,
    getNextPageParam: (lastPage: SearchResponse | undefined) => {
      if (!lastPage || typeof lastPage.has_more !== 'boolean') {
        return undefined;
      }
      if (!lastPage.has_more) {
        return undefined;
      }
      const currentIndex =
        typeof lastPage.start_index === 'number' ? lastPage.start_index : 0;
      const itemCount = Array.isArray(lastPage.items) ? lastPage.items.length : 0;
      return currentIndex + itemCount;
    },
    select: (data) => {
      const pages = data?.pages ?? [];
      const validPages = pages.filter(
        (page): page is SearchResponse => page != null && Array.isArray(page.items)
      );
      const lastPage = validPages.length > 0 ? validPages[validPages.length - 1] : null;
      return {
        results: validPages.flatMap((page) => page.items),
        meta: lastPage
          ? {
              total: lastPage.total ?? 0,
              has_more: lastPage.has_more ?? false,
              provider: lastPage.provider ?? '',
              start_index: lastPage.start_index ?? 0,
            }
          : undefined,
      };
    },
  });
}

export function useBookEditionsQuery(
  title: string,
  author: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.books.editions(title, author),
    queryFn: async (): Promise<SearchResult[]> => {
      const response = await booksApi.getEditions(title, author);
      return response.items;
    },
    enabled: (options?.enabled ?? true) && title.length > 0 && author.length > 0,
    staleTime: 1000 * 60 * 15,
  });
}
