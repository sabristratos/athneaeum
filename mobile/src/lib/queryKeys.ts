import type { SearchFilters } from '@/types';
import type { SearchSource } from '@/types/auth';

export const queryKeys = {
  all: ['athenaeum'] as const,

  books: {
    all: ['books'] as const,
    search: (query: string, filters?: SearchFilters, source?: SearchSource) =>
      ['books', 'search', query, filters, source] as const,
    searchInfinite: (query: string, filters?: SearchFilters, source?: SearchSource) =>
      ['books', 'search', 'infinite', query, filters, source] as const,
    editions: (title: string, author: string) =>
      ['books', 'editions', title, author] as const,
  },

  library: {
    all: ['library'] as const,
    externalIds: () => ['library', 'external-ids'] as const,
  },

  stats: {
    all: ['stats'] as const,
    reading: () => ['stats', 'reading'] as const,
    heatmap: () => ['stats', 'heatmap'] as const,
    formatVelocity: () => ['stats', 'format-velocity'] as const,
    moodRing: () => ['stats', 'mood-ring'] as const,
    dnfAnalytics: () => ['stats', 'dnf-analytics'] as const,
    pageEconomy: () => ['stats', 'page-economy'] as const,
    calendar: (year: number, month?: number) =>
      ['stats', 'calendar', year, month] as const,
  },

  user: {
    all: ['user'] as const,
    current: () => ['user', 'current'] as const,
  },

  goals: {
    all: ['goals'] as const,
    detail: (id: number) => ['goals', id] as const,
    types: () => ['goals', 'types'] as const,
    periods: () => ['goals', 'periods'] as const,
  },

  series: {
    all: ['series'] as const,
    list: (search?: string) => ['series', 'list', search] as const,
    detail: (id: number) => ['series', id] as const,
  },

  preferences: {
    all: ['preferences'] as const,
    grouped: ['preferences', 'grouped'] as const,
    list: ['preferences', 'list'] as const,
    options: ['preferences', 'options'] as const,
    genres: ['preferences', 'genres'] as const,
  },

  authors: {
    all: ['authors'] as const,
    library: (filter?: string) => ['authors', 'library', filter] as const,
    search: (query: string) => ['authors', 'search', query] as const,
    detail: (key: string) => ['authors', key] as const,
    works: (key: string) => ['authors', key, 'works'] as const,
  },
} as const;
