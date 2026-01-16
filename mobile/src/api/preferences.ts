import { apiClient } from '@/api/client';
import type { GenreCategory, PreferenceOptions } from '@/types';

/**
 * Preferences API - READ-ONLY endpoints.
 *
 * Preference CRUD operations should use the WatermelonDB hooks:
 * - usePreferences() - read preferences from local DB
 * - usePreferenceActions() - add/remove preferences locally
 *
 * These local operations sync to the backend via /sync/push.
 */
export const preferencesApi = {
  getOptions: (): Promise<PreferenceOptions> => apiClient('/preferences/options'),

  getGenres: (): Promise<GenreCategory[]> => apiClient('/preferences/genres'),
};
