import { useQuery } from '@tanstack/react-query';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import type { LibraryExternalIdsMap } from '@/types';

export function useLibraryExternalIdsQuery() {
  return useQuery({
    queryKey: queryKeys.library.externalIds(),
    queryFn: () => booksApi.getLibraryExternalIds(),
    staleTime: 1000 * 60 * 5,
    select: (data): LibraryExternalIdsMap => data ?? {},
  });
}
