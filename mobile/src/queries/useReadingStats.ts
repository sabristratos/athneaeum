import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';

export function useReadingStatsQuery() {
  return useQuery({
    queryKey: queryKeys.stats.reading(),
    queryFn: () => booksApi.getStats(),
    staleTime: 1000 * 60 * 2,
  });
}
