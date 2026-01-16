import { useQuery } from '@tanstack/react-query';

import { preferencesApi } from '@/api/preferences';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Preferences Query Hooks - READ-ONLY metadata queries.
 *
 * These hooks fetch metadata/options from the backend:
 * - Available preference categories and types (enum values)
 * - Available genres for selection
 *
 * For actual preference CRUD operations, use WatermelonDB hooks:
 * - usePreferences() - read preferences from local DB
 * - useGroupedPreferences() - grouped by type/category
 * - usePreferenceActions() - add/remove preferences locally
 * - useFavoriteAuthors(), useExcludedAuthors(), etc.
 *
 * Local operations sync to backend via /sync/push.
 */

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
