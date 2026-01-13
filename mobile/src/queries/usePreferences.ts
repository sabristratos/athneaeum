import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { preferencesApi } from '@/api/preferences';
import { queryKeys } from '@/lib/queryKeys';
import type {
  GenreCategory,
  GroupedPreferences,
  PreferenceCategory,
  PreferenceInput,
  PreferenceType,
  UserPreference,
} from '@/types';

export function usePreferencesQuery() {
  return useQuery({
    queryKey: queryKeys.preferences.grouped,
    queryFn: preferencesApi.getGrouped,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePreferencesListQuery() {
  return useQuery({
    queryKey: queryKeys.preferences.list,
    queryFn: preferencesApi.getList,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePreferenceOptionsQuery() {
  return useQuery({
    queryKey: queryKeys.preferences.options,
    queryFn: preferencesApi.getOptions,
    staleTime: 1000 * 60 * 30,
  });
}

export function useGenresQuery() {
  return useQuery({
    queryKey: queryKeys.preferences.genres,
    queryFn: preferencesApi.getGenres,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddPreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.add,
    onMutate: async (newPref: PreferenceInput) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.preferences.grouped });

      const previousGrouped = queryClient.getQueryData<GroupedPreferences>(
        queryKeys.preferences.grouped
      );

      if (previousGrouped) {
        const typeKey = newPref.type === 'favorite' ? 'favorites' : 'excludes';
        const categoryKey = `${newPref.category}s` as 'authors' | 'genres' | 'series';

        queryClient.setQueryData<GroupedPreferences>(queryKeys.preferences.grouped, {
          ...previousGrouped,
          [typeKey]: {
            ...previousGrouped[typeKey],
            [categoryKey]: [...previousGrouped[typeKey][categoryKey], newPref.value],
          },
        });
      }

      return { previousGrouped };
    },
    onError: (_err, _newPref, context) => {
      if (context?.previousGrouped) {
        queryClient.setQueryData(queryKeys.preferences.grouped, context.previousGrouped);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useRemovePreferenceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.remove,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useRemovePreferenceByValueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      category,
      type,
      value,
    }: {
      category: PreferenceCategory;
      type: PreferenceType;
      value: string;
    }) => {
      const list = await preferencesApi.getList();
      const pref = list.find(
        (p) =>
          p.category === category &&
          p.type === type &&
          p.value.toLowerCase() === value.toLowerCase()
      );
      if (pref) {
        await preferencesApi.remove(pref.id);
      }
    },
    onMutate: async ({ category, type, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.preferences.grouped });

      const previousGrouped = queryClient.getQueryData<GroupedPreferences>(
        queryKeys.preferences.grouped
      );

      if (previousGrouped) {
        const typeKey = type === 'favorite' ? 'favorites' : 'excludes';
        const categoryKey = `${category}s` as 'authors' | 'genres' | 'series';

        queryClient.setQueryData<GroupedPreferences>(queryKeys.preferences.grouped, {
          ...previousGrouped,
          [typeKey]: {
            ...previousGrouped[typeKey],
            [categoryKey]: previousGrouped[typeKey][categoryKey].filter(
              (v) => v.toLowerCase() !== value.toLowerCase()
            ),
          },
        });
      }

      return { previousGrouped };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousGrouped) {
        queryClient.setQueryData(queryKeys.preferences.grouped, context.previousGrouped);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useBatchAddPreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.batchAdd,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useBatchRemovePreferencesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesApi.batchRemove,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences.all });
    },
  });
}

export function useFavoriteAuthors(): string[] {
  const { data } = usePreferencesQuery();
  return data?.favorites.authors ?? [];
}

export function useExcludedAuthors(): string[] {
  const { data } = usePreferencesQuery();
  return data?.excludes.authors ?? [];
}

export function useFavoriteGenres(): string[] {
  const { data } = usePreferencesQuery();
  return data?.favorites.genres ?? [];
}

export function useExcludedGenres(): string[] {
  const { data } = usePreferencesQuery();
  return data?.excludes.genres ?? [];
}

export function useFavoriteSeries(): string[] {
  const { data } = usePreferencesQuery();
  return data?.favorites.series ?? [];
}

export function useExcludedSeries(): string[] {
  const { data } = usePreferencesQuery();
  return data?.excludes.series ?? [];
}

export function useIsAuthorFavorite(author: string): boolean {
  const favorites = useFavoriteAuthors();
  return favorites.some((a) => a.toLowerCase() === author.toLowerCase());
}

export function useIsAuthorExcluded(author: string): boolean {
  const excludes = useExcludedAuthors();
  return excludes.some((a) => a.toLowerCase() === author.toLowerCase());
}

export function useIsGenreFavorite(genre: string): boolean {
  const favorites = useFavoriteGenres();
  return favorites.some((g) => g.toLowerCase() === genre.toLowerCase());
}

export function useIsGenreExcluded(genre: string): boolean {
  const excludes = useExcludedGenres();
  return excludes.some((g) => g.toLowerCase() === genre.toLowerCase());
}
