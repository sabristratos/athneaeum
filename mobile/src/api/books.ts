import { apiClient } from '@/api/client';
import type {
  SearchResponse,
  SearchResult,
  SearchFilters,
  LibraryExternalIdsMap,
  UserBook,
  ReadingSession,
  ReadThrough,
  ReadingStats,
  Series,
  Book,
  ClassificationOptions,
} from '@/types';
import type { SearchSource } from '@/types/auth';
import type {
  HeatmapData,
  FormatVelocityData,
  MoodRingData,
  DnfAnalyticsData,
  PageEconomyData,
  CalendarData,
} from '@/types/stats';

export const booksApi = {
  search: (
    query: string,
    limit: number = 20,
    startIndex: number = 0,
    filters?: SearchFilters,
    source?: SearchSource
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      query,
      limit: String(limit),
      start_index: String(startIndex),
    });

    if (source) {
      params.append('source', source);
    }
    if (filters?.language && filters.language !== 'all') {
      params.append('lang', filters.language);
    } else if (filters?.language === 'all') {
      params.append('lang', 'all');
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

  getLibrary: (status?: string): Promise<UserBook[]> => {
    const params = status ? `?status=${status}` : '';
    return apiClient(`/library${params}`);
  },

  getLibraryExternalIds: (): Promise<LibraryExternalIdsMap> =>
    apiClient('/library/external-ids'),

  getUserBook: (id: number): Promise<UserBook> => apiClient(`/library/${id}`),

  getSessions: (userBookId?: number): Promise<ReadingSession[]> => {
    const params = userBookId ? `?user_book_id=${userBookId}` : '';
    return apiClient(`/sessions${params}`);
  },

  getStats: (): Promise<ReadingStats> => apiClient('/stats'),

  getHeatmap: (): Promise<HeatmapData> => apiClient('/stats/heatmap'),

  getFormatVelocity: (): Promise<FormatVelocityData> =>
    apiClient('/stats/format-velocity'),

  getMoodRing: (): Promise<MoodRingData> => apiClient('/stats/mood-ring'),

  getDnfAnalytics: (): Promise<DnfAnalyticsData> =>
    apiClient('/stats/dnf-analytics'),

  getPageEconomy: (): Promise<PageEconomyData> =>
    apiClient('/stats/page-economy'),

  getEditions: (
    title: string,
    author: string
  ): Promise<{ items: SearchResult[]; total: number }> => {
    const params = new URLSearchParams({ title, author });
    return apiClient(`/books/editions?${params.toString()}`);
  },

  getCalendar: (year: number, month?: number): Promise<CalendarData> => {
    const params = new URLSearchParams({ year: String(year) });
    if (month !== undefined) {
      params.append('month', String(month));
    }
    return apiClient(`/stats/calendar?${params.toString()}`);
  },

  startReread: (
    userBookId: number
  ): Promise<{ read_through: ReadThrough; user_book: UserBook }> =>
    apiClient(`/library/${userBookId}/reread`, {
      method: 'POST',
    }),

  getReadingHistory: (
    userBookId: number
  ): Promise<{ read_count: number; read_throughs: ReadThrough[] }> =>
    apiClient(`/library/${userBookId}/history`),

  getSeries: (search?: string): Promise<Series[]> => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient(`/series${params}`);
  },

  getSeriesDetail: (seriesId: number): Promise<Series & { books: Book[] }> =>
    apiClient(`/series/${seriesId}`),

  createSeries: (data: {
    title: string;
    author: string;
    total_volumes?: number;
    is_complete?: boolean;
    description?: string;
  }): Promise<Series> =>
    apiClient('/series', {
      method: 'POST',
      body: data,
    }),

  updateSeries: (
    seriesId: number,
    data: {
      title?: string;
      author?: string;
      total_volumes?: number | null;
      is_complete?: boolean;
      description?: string | null;
    }
  ): Promise<Series> =>
    apiClient(`/series/${seriesId}`, {
      method: 'PATCH',
      body: data,
    }),

  deleteSeries: (seriesId: number): Promise<{ message: string }> =>
    apiClient(`/series/${seriesId}`, {
      method: 'DELETE',
    }),

  assignBookToSeries: (
    seriesId: number,
    bookId: number,
    volumeNumber: number,
    volumeTitle?: string
  ): Promise<{ success: boolean }> =>
    apiClient(`/series/${seriesId}/books`, {
      method: 'POST',
      body: {
        book_id: bookId,
        volume_number: volumeNumber,
        volume_title: volumeTitle,
      },
    }),

  removeBookFromSeries: (
    seriesId: number,
    bookId: number
  ): Promise<{ success: boolean }> =>
    apiClient(`/series/${seriesId}/books`, {
      method: 'DELETE',
      body: { book_id: bookId },
    }),

  classifyBook: (bookId: number): Promise<Book> =>
    apiClient(`/books/${bookId}/classify`, {
      method: 'POST',
    }),

  getClassificationOptions: (): Promise<ClassificationOptions> =>
    apiClient('/books/classification-options'),
};
