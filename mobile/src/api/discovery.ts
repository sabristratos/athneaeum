import { apiClient } from '@/api/client';
import type {
  DiscoveryFeed,
  CatalogBook,
  SignalBatch,
  SignalResponse,
  SimilarBooksResponse,
  CatalogSearchResponse,
} from '@/types/discovery';

/**
 * Discovery API - Recommendation engine endpoints.
 *
 * All discovery operations are online-only. The discovery catalog
 * is separate from the user's library (which uses WatermelonDB).
 *
 * Recommendations are computed server-side using vector similarity
 * based on the user's reading history.
 */
export const discoveryApi = {
  /**
   * Get the personalized discovery feed with multiple sections.
   */
  getFeed: async (): Promise<DiscoveryFeed> => {
    console.log('[Discovery API] getFeed: Requesting personalized feed');
    try {
      const result = await apiClient<DiscoveryFeed>('/discovery/feed');
      console.log('[Discovery API] getFeed: Success', {
        sectionCount: result.sections?.length ?? 0,
        sections: result.sections?.map((s) => ({
          type: s.type,
          title: s.title,
          bookCount: s.data?.length ?? 0,
        })),
      });
      return result;
    } catch (error) {
      console.error('[Discovery API] getFeed: Error', error);
      throw error;
    }
  },

  /**
   * Record user interaction signals (views, clicks, adds).
   *
   * Signals are batched client-side and sent periodically
   * or when the app backgrounds.
   */
  recordSignals: async (signals: SignalBatch): Promise<SignalResponse> => {
    console.log('[Discovery API] recordSignals: Sending signals', {
      count: signals.length,
      signals,
    });
    try {
      const result = await apiClient<SignalResponse>('/discovery/signals', {
        method: 'POST',
        body: { signals },
      });
      console.log('[Discovery API] recordSignals: Success', result);
      return result;
    } catch (error) {
      console.error('[Discovery API] recordSignals: Error', error);
      throw error;
    }
  },

  /**
   * Get books similar to a given catalog book.
   */
  getSimilar: async (catalogBookId: number): Promise<SimilarBooksResponse> => {
    console.log('[Discovery API] getSimilar: Requesting similar books', {
      catalogBookId,
    });
    try {
      const result = await apiClient<SimilarBooksResponse>(
        `/discovery/${catalogBookId}/similar`
      );
      console.log('[Discovery API] getSimilar: Success', {
        catalogBookId,
        resultCount: result.data?.length ?? 0,
        hasError: 'error' in result,
        books: result.data?.slice(0, 3).map((b) => ({
          id: b.id,
          title: b.title,
          hasCover: !!b.cover_url,
        })),
      });
      return result;
    } catch (error) {
      console.error('[Discovery API] getSimilar: Error', {
        catalogBookId,
        error,
      });
      throw error;
    }
  },

  /**
   * Search the discovery catalog.
   *
   * @param query - Search query
   * @param options.limit - Maximum results (default 20)
   * @param options.mode - 'keyword' (default) or 'semantic' for AI-powered search
   */
  search: async (
    query: string,
    options: { limit?: number; mode?: 'keyword' | 'semantic' } = {}
  ): Promise<CatalogSearchResponse> => {
    const { limit = 20, mode = 'keyword' } = options;
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      mode,
    });
    console.log('[Discovery API] search: Searching catalog', {
      query,
      mode,
      limit,
    });
    try {
      const result = await apiClient<CatalogSearchResponse>(
        `/discovery/search?${params.toString()}`
      );
      console.log('[Discovery API] search: Success', {
        query,
        resultCount: result.data?.length ?? 0,
      });
      return result;
    } catch (error) {
      console.error('[Discovery API] search: Error', { query, error });
      throw error;
    }
  },

  /**
   * Get a single catalog book by ID.
   */
  getBook: async (catalogBookId: number): Promise<CatalogBook> => {
    console.log('[Discovery API] getBook: Fetching book', { catalogBookId });
    try {
      const result = await apiClient<CatalogBook>(
        `/discovery/${catalogBookId}`
      );
      console.log('[Discovery API] getBook: Success', {
        catalogBookId,
        title: result.title,
        hasEmbedding: result.has_embedding,
        genreCount: result.genres?.length ?? 0,
      });
      return result;
    } catch (error) {
      console.error('[Discovery API] getBook: Error', { catalogBookId, error });
      throw error;
    }
  },

  /**
   * Refresh the user's recommendation profile.
   *
   * Call this after significant reading activity changes
   * (e.g., finishing a book) to update recommendations.
   */
  refreshProfile: async (): Promise<{ success: boolean }> => {
    console.log('[Discovery API] refreshProfile: Refreshing user profile');
    try {
      const result = await apiClient<{ success: boolean }>(
        '/discovery/refresh-profile',
        { method: 'POST' }
      );
      console.log('[Discovery API] refreshProfile: Success', result);
      return result;
    } catch (error) {
      console.error('[Discovery API] refreshProfile: Error', error);
      throw error;
    }
  },
};
