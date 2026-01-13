export type PreferenceCategory = 'author' | 'genre' | 'series';

export type PreferenceType = 'favorite' | 'exclude';

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
