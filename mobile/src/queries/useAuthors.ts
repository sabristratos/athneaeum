import { useQuery } from '@tanstack/react-query';

import { authorsApi } from '@/api/authors';
import { queryKeys } from '@/lib/queryKeys';
import type {
  LibraryAuthor,
  LibraryAuthorFilter,
  LibraryAuthorSort,
  LibraryAuthorSortOrder,
} from '@/types';

/**
 * Author Query Hooks - READ-ONLY external API queries.
 *
 * These hooks fetch author data from external APIs (Open Library):
 * - Author search
 * - Author details
 * - Author works
 * - Library authors (aggregated from user's library)
 *
 * For author preference CRUD (favorite/exclude), use WatermelonDB hooks:
 * - usePreferenceActions().addPreference('author', 'favorite', authorName)
 * - usePreferenceActions().removePreferenceByValue('author', 'favorite', authorName)
 * - useFavoriteAuthors(), useExcludedAuthors()
 *
 * Local operations sync to backend via /sync/push.
 */

interface LibraryAuthorsOptions {
  filter?: LibraryAuthorFilter;
  sort?: LibraryAuthorSort;
  order?: LibraryAuthorSortOrder;
}

export function useLibraryAuthorsQuery(
  filterOrOptions: LibraryAuthorFilter | LibraryAuthorsOptions = 'all'
) {
  const options: LibraryAuthorsOptions =
    typeof filterOrOptions === 'string'
      ? { filter: filterOrOptions }
      : filterOrOptions;
  const { filter = 'all', sort = 'books', order = 'desc' } = options;

  return useQuery({
    queryKey: [...queryKeys.authors.library(filter), sort, order],
    queryFn: () => authorsApi.getLibrary({ filter, sort, order }),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAuthorSearchQuery(query: string) {
  return useQuery({
    queryKey: queryKeys.authors.search(query),
    queryFn: () => authorsApi.search(query),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 15,
  });
}

export function useAuthorDetailQuery(key: string) {
  return useQuery({
    queryKey: queryKeys.authors.detail(key),
    queryFn: () => authorsApi.getDetails(key),
    enabled: !!key,
    staleTime: 1000 * 60 * 30,
  });
}

export function useAuthorWorksQuery(key: string, limit = 20, offset = 0) {
  return useQuery({
    queryKey: queryKeys.authors.works(key),
    queryFn: () => authorsApi.getWorks(key, limit, offset),
    enabled: !!key,
    staleTime: 1000 * 60 * 30,
  });
}

export function useLibraryAuthor(authorName: string): LibraryAuthor | undefined {
  const { data } = useLibraryAuthorsQuery('all');
  return data?.find(
    (a) => a.name.toLowerCase() === authorName.toLowerCase()
  );
}
