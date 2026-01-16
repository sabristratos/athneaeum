import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discoveryApi } from '@/api/discovery';
import { queryKeys } from '@/lib/queryKeys';
import type { SignalBatch } from '@/types/discovery';

/**
 * Query hook for fetching the personalized discovery feed.
 *
 * Returns multiple sections: personalized, genre-based, trending.
 * Cached for 5 minutes to balance freshness with API calls.
 */
export function useDiscoveryFeedQuery() {
  return useQuery({
    queryKey: queryKeys.discovery.feed(),
    queryFn: async () => {
      console.log('[useDiscoveryFeedQuery] Fetching feed...');
      const result = await discoveryApi.getFeed();
      console.log('[useDiscoveryFeedQuery] Feed fetched', {
        sectionCount: result.sections?.length ?? 0,
      });
      return result;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Query hook for fetching books similar to a given book.
 */
export function useSimilarBooksQuery(catalogBookId: number) {
  return useQuery({
    queryKey: queryKeys.discovery.similar(catalogBookId),
    queryFn: async () => {
      console.log('[useSimilarBooksQuery] Fetching similar books', {
        catalogBookId,
      });
      try {
        const result = await discoveryApi.getSimilar(catalogBookId);
        console.log('[useSimilarBooksQuery] Similar books fetched', {
          catalogBookId,
          count: result.data?.length ?? 0,
          hasError: 'error' in result,
          error: (result as { error?: string }).error,
        });
        return result;
      } catch (error) {
        console.error('[useSimilarBooksQuery] Error fetching similar books', {
          catalogBookId,
          error,
        });
        throw error;
      }
    },
    enabled: catalogBookId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

export type SearchMode = 'keyword' | 'semantic';

/**
 * Query hook for searching the discovery catalog.
 *
 * @param query - Search query (min 2 characters)
 * @param mode - 'keyword' for SQL search, 'semantic' for AI-powered vector search
 */
export function useDiscoverySearchQuery(
  query: string,
  mode: SearchMode = 'keyword'
) {
  return useQuery({
    queryKey: [...queryKeys.discovery.search(query), mode],
    queryFn: () => discoveryApi.search(query, { mode }),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Query hook for fetching a single catalog book.
 */
export function useCatalogBookQuery(catalogBookId: number) {
  return useQuery({
    queryKey: queryKeys.discovery.book(catalogBookId),
    queryFn: () => discoveryApi.getBook(catalogBookId),
    enabled: catalogBookId > 0,
    staleTime: 1000 * 60 * 10,
  });
}

/**
 * Mutation hook for recording user interaction signals.
 *
 * Called periodically to batch-send user interactions
 * (views, clicks, adds to library, dismissals).
 *
 * Note: Does not invalidate the feed since signals are only
 * factored into recommendations during profile refresh.
 */
export function useRecordSignalsMutation() {
  return useMutation({
    mutationFn: (signals: SignalBatch) => discoveryApi.recordSignals(signals),
  });
}

/**
 * Mutation hook for refreshing the user's recommendation profile.
 *
 * Call after significant reading activity (e.g., finishing a book)
 * to update the recommendation algorithm.
 */
export function useRefreshProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => discoveryApi.refreshProfile(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
    },
  });
}
