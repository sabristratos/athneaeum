import { apiClient } from '@/api/client';
import type {
  SearchResponse,
  SearchFilters,
  LibraryResponse,
  UserBook,
  ReadingSession,
  AddToLibraryData,
  UpdateUserBookData,
  LogSessionData,
  ReadingStatsResponse,
} from '@/types';

export const booksApi = {
  search: (
    query: string,
    limit: number = 20,
    startIndex: number = 0,
    filters?: SearchFilters
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      start_index: String(startIndex),
    });

    if (filters?.language) {
      params.append('lang', filters.language);
    }
    if (filters?.genres && filters.genres.length > 0) {
      params.append('genres', filters.genres.join(','));
    }
    if (filters?.minRating && filters.minRating > 0) {
      params.append('min_rating', String(filters.minRating));
    }
    if (filters?.yearFrom) {
      params.append('year_from', String(filters.yearFrom));
    }
    if (filters?.yearTo) {
      params.append('year_to', String(filters.yearTo));
    }

    return apiClient(`/books/search?${params.toString()}`);
  },

  getLibrary: (status?: string): Promise<LibraryResponse> => {
    const params = status ? `?status=${status}` : '';
    return apiClient(`/library${params}`);
  },

  addToLibrary: (data: AddToLibraryData): Promise<UserBook> =>
    apiClient('/library', {
      method: 'POST',
      body: data as unknown as Record<string, unknown>,
    }),

  updateUserBook: (id: number, data: UpdateUserBookData): Promise<UserBook> =>
    apiClient(`/library/${id}`, {
      method: 'PATCH',
      body: data as unknown as Record<string, unknown>,
    }),

  removeFromLibrary: (id: number): Promise<{ message: string }> =>
    apiClient(`/library/${id}`, {
      method: 'DELETE',
    }),

  getSessions: (userBookId?: number): Promise<{ data: ReadingSession[] }> => {
    const params = userBookId ? `?user_book_id=${userBookId}` : '';
    return apiClient(`/sessions${params}`);
  },

  logSession: (data: LogSessionData): Promise<ReadingSession> =>
    apiClient('/sessions', {
      method: 'POST',
      body: data as unknown as Record<string, unknown>,
    }),

  updateSession: (
    id: number,
    data: {
      date?: string;
      start_page?: number;
      end_page?: number;
      duration_seconds?: number | null;
      notes?: string | null;
    }
  ): Promise<ReadingSession> =>
    apiClient(`/sessions/${id}`, {
      method: 'PATCH',
      body: data as unknown as Record<string, unknown>,
    }),

  deleteSession: (id: number): Promise<{ message: string }> =>
    apiClient(`/sessions/${id}`, {
      method: 'DELETE',
    }),

  getStats: (): Promise<ReadingStatsResponse> => apiClient('/stats'),
};
