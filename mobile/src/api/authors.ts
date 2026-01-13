import { apiClient } from '@/api/client';
import type {
  AuthorSearchResponse,
  AuthorWorksResponse,
  LibraryAuthor,
  LibraryAuthorFilter,
  LibraryAuthorSort,
  LibraryAuthorSortOrder,
  OpenLibraryAuthorDetail,
} from '@/types';

interface GetLibraryOptions {
  filter?: LibraryAuthorFilter;
  sort?: LibraryAuthorSort;
  order?: LibraryAuthorSortOrder;
}

export const authorsApi = {
  getLibrary: (options: GetLibraryOptions = {}): Promise<LibraryAuthor[]> => {
    const { filter = 'all', sort = 'books', order = 'desc' } = options;
    return apiClient('/authors/library', {
      params: { filter, sort, order },
    });
  },

  search: (query: string, limit = 20, offset = 0): Promise<AuthorSearchResponse> =>
    apiClient('/authors/search', {
      params: { q: query, limit, offset },
    }),

  getDetails: (key: string): Promise<OpenLibraryAuthorDetail> =>
    apiClient(`/authors/${encodeURIComponent(key)}`),

  getWorks: (key: string, limit = 20, offset = 0): Promise<AuthorWorksResponse> =>
    apiClient(`/authors/${encodeURIComponent(key)}/works`, {
      params: { limit, offset },
    }),
};
