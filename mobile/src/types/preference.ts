import type { ComponentType } from 'react';

export const PREFERENCE_CATEGORIES = ['author', 'genre', 'series', 'format'] as const;
export type PreferenceCategory = (typeof PREFERENCE_CATEGORIES)[number];

export const PREFERENCE_TYPES = ['favorite', 'exclude'] as const;
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];

export type PreferenceState = 'none' | 'favorite' | 'excluded';

export interface PreferenceCategoryConfig {
  category: PreferenceCategory;
  label: string;
  pluralLabel: string;
  supportsExclude: boolean;
  searchable: boolean;
}

export const PREFERENCE_CATEGORY_CONFIG: Record<PreferenceCategory, PreferenceCategoryConfig> = {
  author: {
    category: 'author',
    label: 'Author',
    pluralLabel: 'Authors',
    supportsExclude: true,
    searchable: true,
  },
  genre: {
    category: 'genre',
    label: 'Genre',
    pluralLabel: 'Genres',
    supportsExclude: true,
    searchable: false,
  },
  series: {
    category: 'series',
    label: 'Series',
    pluralLabel: 'Series',
    supportsExclude: true,
    searchable: true,
  },
  format: {
    category: 'format',
    label: 'Format',
    pluralLabel: 'Formats',
    supportsExclude: false,
    searchable: false,
  },
};

export interface UserPreference {
  id: number;
  category: PreferenceCategory;
  type: PreferenceType;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface GroupedPreferences {
  favorites: {
    authors: string[];
    genres: string[];
    series: string[];
    formats: string[];
  };
  excludes: {
    authors: string[];
    genres: string[];
    series: string[];
  };
}

export interface PreferenceInput {
  category: PreferenceCategory;
  type: PreferenceType;
  value: string;
}

export interface BatchPreferenceResult {
  created: UserPreference[];
  created_count: number;
  skipped_count: number;
}

export interface BatchDeleteResult {
  deleted_count: number;
}

export interface PreferenceOptions {
  categories: Array<{ value: PreferenceCategory; label: string }>;
  types: Array<{ value: PreferenceType; label: string }>;
}

export interface GenreOption {
  value: string;
  label: string;
  is_favorite: boolean;
  is_excluded: boolean;
}

export interface GenreCategory {
  key: string;
  label: string;
  genres: GenreOption[];
}
