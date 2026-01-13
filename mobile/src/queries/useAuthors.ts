import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authorsApi } from '@/api/authors';
import { preferencesApi } from '@/api/preferences';
import { queryKeys } from '@/lib/queryKeys';
import type {
  LibraryAuthor,
  LibraryAuthorFilter,
  LibraryAuthorSort,
  LibraryAuthorSortOrder,
  OpenLibraryAuthorDetail,
  PreferenceType,
} from '@/types';

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

export function useToggleAuthorPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authorName,
      currentState,
      newState,
    }: {
      authorName: string;
      currentState: 'none' | 'favorite' | 'excluded';
      newState: 'none' | 'favorite' | 'excluded';
    }) => {
      if (currentState === 'favorite') {
        const list = await preferencesApi.getList();
        const pref = list.find(
          (p) =>
            p.category === 'author' &&
            p.type === 'favorite' &&
            p.value.toLowerCase() === authorName.toLowerCase()
        );
        if (pref) await preferencesApi.remove(pref.id);
      } else if (currentState === 'excluded') {
        const list = await preferencesApi.getList();
        const pref = list.find(
          (p) =>
            p.category === 'author' &&
            p.type === 'exclude' &&
            p.value.toLowerCase() === authorName.toLowerCase()
        );
        if (pref) await preferencesApi.remove(pref.id);
      }

      if (newState === 'favorite') {
        await preferencesApi.add({
          category: 'author',
          type: 'favorite',
          value: authorName,
        });
      } else if (newState === 'excluded') {
        await preferencesApi.add({
          category: 'author',
          type: 'exclude',
          value: authorName,
        });
      }
    },
    onMutate: async ({ authorName, newState }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.authors.all });

      const previousLibrary = queryClient.getQueryData<LibraryAuthor[]>(
        queryKeys.authors.library('all')
      );

      if (previousLibrary) {
        queryClient.setQueryData<LibraryAuthor[]>(
          queryKeys.authors.library('all'),
          previousLibrary.map((author) =>
            author.name.toLowerCase() === authorName.toLowerCase()
              ? {
                  ...author,
                  is_favorite: newState === 'favorite',
                  is_excluded: newState === 'excluded',
                }
              : author
          )
        );
      }

      return { previousLibrary };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousLibrary) {
        queryClient.setQueryData(
          queryKeys.authors.library('all'),
          context.previousLibrary
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useSetAuthorFavoriteMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authorName,
      isFavorite,
    }: {
      authorName: string;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await preferencesApi.add({
          category: 'author',
          type: 'favorite',
          value: authorName,
        });
      } else {
        const list = await preferencesApi.getList();
        const pref = list.find(
          (p) =>
            p.category === 'author' &&
            p.type === 'favorite' &&
            p.value.toLowerCase() === authorName.toLowerCase()
        );
        if (pref) await preferencesApi.remove(pref.id);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useSetAuthorExcludedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authorName,
      isExcluded,
    }: {
      authorName: string;
      isExcluded: boolean;
    }) => {
      if (isExcluded) {
        await preferencesApi.add({
          category: 'author',
          type: 'exclude',
          value: authorName,
        });
      } else {
        const list = await preferencesApi.getList();
        const pref = list.find(
          (p) =>
            p.category === 'author' &&
            p.type === 'exclude' &&
            p.value.toLowerCase() === authorName.toLowerCase()
        );
        if (pref) await preferencesApi.remove(pref.id);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.authors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useLibraryAuthor(authorName: string): LibraryAuthor | undefined {
  const { data } = useLibraryAuthorsQuery('all');
  return data?.find(
    (a) => a.name.toLowerCase() === authorName.toLowerCase()
  );
}
