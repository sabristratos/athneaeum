import type { SearchFilters } from '@/types';

export const queryKeys = {
  all: ['athenaeum'] as const,

  books: {
    all: ['books'] as const,
    search: (query: string, filters?: SearchFilters) =>
      ['books', 'search', query, filters] as const,
    searchInfinite: (query: string, filters?: SearchFilters) =>
      ['books', 'search', 'infinite', query, filters] as const,
  },

  stats: {
    all: ['stats'] as const,
    reading: () => ['stats', 'reading'] as const,
  },

  user: {
    all: ['user'] as const,
    current: () => ['user', 'current'] as const,
  },
} as const;
