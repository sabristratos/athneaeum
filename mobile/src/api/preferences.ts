import { apiClient } from '@/api/client';
import type {
  BatchDeleteResult,
  BatchPreferenceResult,
  GenreCategory,
  GroupedPreferences,
  MessageResponse,
  PreferenceInput,
  PreferenceOptions,
  UserPreference,
} from '@/types';

export const preferencesApi = {
  getGrouped: (): Promise<GroupedPreferences> => apiClient('/preferences'),

  getList: (): Promise<UserPreference[]> => apiClient('/preferences/list'),

  getOptions: (): Promise<PreferenceOptions> => apiClient('/preferences/options'),

  add: (input: PreferenceInput): Promise<UserPreference> =>
    apiClient('/preferences', {
      method: 'POST',
      body: input,
    }),

  remove: (id: number): Promise<MessageResponse> =>
    apiClient(`/preferences/${id}`, {
      method: 'DELETE',
    }),

  batchAdd: (preferences: PreferenceInput[]): Promise<BatchPreferenceResult> =>
    apiClient('/preferences/batch', {
      method: 'POST',
      body: { preferences },
    }),

  batchRemove: (preferences: PreferenceInput[]): Promise<BatchDeleteResult> =>
    apiClient('/preferences/batch', {
      method: 'DELETE',
      body: { preferences },
    }),

  getGenres: (): Promise<GenreCategory[]> => apiClient('/preferences/genres'),
};
