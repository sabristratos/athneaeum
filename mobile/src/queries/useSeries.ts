import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import type { Series, Book } from '@/types';

/**
 * Series Hooks - TanStack Query for GLOBAL CATALOG data.
 *
 * Series is GLOBAL data (shared across all users), NOT user-specific data.
 * Unlike user data (library, sessions, tags, preferences, goals), Series:
 * - Is owned by the backend (the catalog)
 * - Requires online connectivity for CRUD operations
 * - Is synced DOWN to mobile via /sync/pull for display purposes
 *
 * TanStack Query is appropriate here because:
 * 1. Creating/updating Series modifies the global catalog
 * 2. Changes need to be immediately visible to all users
 * 3. Offline creation would cause conflicts (multiple users creating same series)
 *
 * User-specific data should use WatermelonDB hooks instead:
 * - useLibrary(), useTags(), useGoals(), usePreferences()
 */

export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for',
  'is', 'it', 'by', 'with', 'as', 'be', 'this', 'that', 'from',
]);

export function normalizeSeriesName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^the\s+/i, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[:\-,]+$/, '')
    .trim();
}

export function getSignificantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[b.length][a.length];
}

export function calculateSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(a, b);
  return (maxLen - distance) / maxLen;
}

export function calculateWordSimilarity(search: string, target: string): number {
  const searchWords = getSignificantWords(search);
  const targetWords = getSignificantWords(target);

  if (searchWords.length === 0 || targetWords.length === 0) {
    return 0;
  }

  const targetSet = new Set(targetWords);
  const matchingWords = searchWords.filter((w) => targetSet.has(w));
  const coverage = matchingWords.length / Math.min(searchWords.length, targetWords.length);

  return coverage;
}

export function useSeriesQuery(search?: string) {
  return useQuery({
    queryKey: queryKeys.series.list(search),
    queryFn: () => booksApi.getSeries(search),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSeriesDetailQuery(seriesId: number, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.series.detail(seriesId),
    queryFn: () => booksApi.getSeriesDetail(seriesId),
    enabled: options?.enabled ?? true,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      author: string;
      total_volumes?: number;
      is_complete?: boolean;
      description?: string;
    }) => booksApi.createSeries(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
    },
  });
}

export function useUpdateSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      data,
    }: {
      seriesId: number;
      data: {
        title?: string;
        author?: string;
        total_volumes?: number | null;
        is_complete?: boolean;
        description?: string | null;
      };
    }) => booksApi.updateSeries(seriesId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.series.detail(variables.seriesId) });
    },
  });
}

export function useDeleteSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seriesId: number) => booksApi.deleteSeries(seriesId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
    },
  });
}

export function useAssignBookToSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      seriesId,
      bookId,
      volumeNumber,
      volumeTitle,
    }: {
      seriesId: number;
      bookId: number;
      volumeNumber: number;
      volumeTitle?: string;
    }) => booksApi.assignBookToSeries(seriesId, bookId, volumeNumber, volumeTitle),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.detail(variables.seriesId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}

export function useRemoveBookFromSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seriesId, bookId }: { seriesId: number; bookId: number }) =>
      booksApi.removeBookFromSeries(seriesId, bookId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.series.detail(variables.seriesId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
    },
  });
}

export interface SeriesMatch {
  series: Series;
  confidence: 'exact' | 'high' | 'medium' | 'low';
  matchReason?: string;
}

export function useFindMatchingSeries(
  seriesName: string | null | undefined,
  options?: { maxResults?: number }
) {
  const { data: allSeries, isLoading } = useSeriesQuery();
  const maxResults = options?.maxResults ?? 10;

  if (!seriesName || !allSeries) {
    return { matches: [], bestMatch: null, isLoading };
  }

  const normalizedSearch = normalizeSeriesName(seriesName);
  const matches: SeriesMatch[] = [];

  for (const series of allSeries) {
    const normalizedTitle = normalizeSeriesName(series.title);

    if (normalizedTitle === normalizedSearch) {
      matches.push({ series, confidence: 'exact', matchReason: 'Exact match' });
      continue;
    }

    const similarity = calculateSimilarity(normalizedTitle, normalizedSearch);
    if (similarity >= 0.9) {
      matches.push({ series, confidence: 'exact', matchReason: 'Near-exact match (typo tolerance)' });
      continue;
    }

    const minSubstringLength = 4;
    if (
      (normalizedTitle.includes(normalizedSearch) && normalizedSearch.length >= minSubstringLength) ||
      (normalizedSearch.includes(normalizedTitle) && normalizedTitle.length >= minSubstringLength)
    ) {
      matches.push({ series, confidence: 'high', matchReason: 'Substring match' });
      continue;
    }

    const wordSimilarity = calculateWordSimilarity(normalizedSearch, normalizedTitle);

    if (wordSimilarity >= 0.8) {
      matches.push({ series, confidence: 'high', matchReason: 'High word overlap' });
      continue;
    }

    if (wordSimilarity >= 0.5 || similarity >= 0.85) {
      matches.push({
        series,
        confidence: 'medium',
        matchReason: wordSimilarity >= 0.5 ? 'Partial word match' : 'Similar spelling',
      });
      continue;
    }

    if (wordSimilarity >= 0.3 || similarity >= 0.75) {
      matches.push({
        series,
        confidence: 'low',
        matchReason: wordSimilarity >= 0.3 ? 'Some words match' : 'Possible typo',
      });
    }
  }

  matches.sort((a, b) => {
    const order = { exact: 0, high: 1, medium: 2, low: 3 };
    return order[a.confidence] - order[b.confidence];
  });

  const limitedMatches = matches.slice(0, maxResults);

  return {
    matches: limitedMatches,
    bestMatch: limitedMatches.length > 0 ? limitedMatches[0] : null,
    isLoading,
  };
}
