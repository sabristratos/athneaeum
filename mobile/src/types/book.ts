import type { Tag } from './tag';
import type { BookFormat } from './stats';

export type BookStatus = 'want_to_read' | 'reading' | 'read' | 'dnf';

export type Audience = 'adult' | 'young_adult' | 'middle_grade' | 'children';
export type Intensity = 'light' | 'moderate' | 'dark' | 'intense';
export type Mood =
  | 'adventurous'
  | 'romantic'
  | 'suspenseful'
  | 'humorous'
  | 'melancholic'
  | 'inspirational'
  | 'mysterious'
  | 'cozy'
  | 'tense'
  | 'thought_provoking';

// Search filter types
export type MinRating = 0 | 3 | 4 | 4.5;

export interface SearchFilters {
  language?: string;
  genres?: string[];
  minRating?: MinRating;
  yearFrom?: number;
  yearTo?: number;
}

export type SearchResultSource = 'google_books' | 'opds' | 'local';

export interface SearchResult {
  external_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number | null;
  height_cm: number | null;
  width_cm: number | null;
  thickness_cm: number | null;
  isbn: string | null;
  description: string | null;
  genres: string[];
  published_date: string | null;
  average_rating: number | null;
  ratings_count: number | null;
  edition_count?: number;
  series_name?: string | null;
  volume_number?: number | null;
  _source?: SearchResultSource;
}

export interface SearchResponse {
  items: SearchResult[];
  total: number;
  start_index: number;
  has_more: boolean;
  provider: string;
}

export interface SearchMeta {
  total: number;
  start_index: number;
  has_more: boolean;
  provider: string;
}

// Filter option arrays for UI
export const GENRE_OPTIONS: { value: string; label: string }[] = [
  { value: 'fiction', label: 'Fiction' },
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'romance', label: 'Romance' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'science fiction', label: 'Sci-Fi' },
  { value: 'biography', label: 'Biography' },
  { value: 'history', label: 'History' },
  { value: 'self-help', label: 'Self-Help' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'horror', label: 'Horror' },
  { value: 'young adult', label: 'Young Adult' },
  { value: 'nonfiction', label: 'Non-Fiction' },
];

export const MIN_RATING_OPTIONS: { value: MinRating; label: string }[] = [
  { value: 0, label: 'Any' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 4.5, label: '4.5+' },
];

export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'English (Default)' },
  { value: 'all', label: 'All Languages' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
];

export interface Genre {
  id: number;
  name: string;
  slug: string;
}

export interface ClassificationOptions {
  audiences: { value: Audience; label: string }[];
  intensities: { value: Intensity; label: string }[];
  moods: { value: Mood; label: string }[];
}

export interface Series {
  id: number;
  title: string;
  author: string;
  external_id: string | null;
  external_provider: string | null;
  total_volumes: number | null;
  is_complete: boolean;
  description: string | null;
  book_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: number;
  external_id: string | null;
  external_provider: string | null;
  series_id: number | null;
  volume_number: number | null;
  volume_title: string | null;
  series?: Series | null;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number | null;
  height_cm: number | null;
  width_cm: number | null;
  thickness_cm: number | null;
  isbn: string | null;
  description: string | null;
  genres: Genre[] | null;
  published_date: string | null;
  audience: Audience | null;
  audience_label: string | null;
  intensity: Intensity | null;
  intensity_label: string | null;
  moods: Mood[] | null;
  is_classified: boolean;
  classification_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserBook {
  id: number;
  local_id?: string;
  user_id?: number;
  book_id: number;
  book: Book;
  status: BookStatus;
  status_label: string;
  format: BookFormat | null;
  format_label: string | null;
  rating: number | null;
  price: number | null;
  current_page: number;
  progress_percentage: number | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  is_pinned: boolean;
  queue_position: number | null;
  review: string | null;
  started_at: string | null;
  finished_at: string | null;
  reading_sessions?: ReadingSession[];
  read_throughs?: ReadThrough[];
  read_count?: number;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: number;
  local_id?: string;
  user_book_id: number;
  read_through_id: number | null;
  date: string;
  pages_read: number;
  start_page: number;
  end_page: number;
  duration_seconds: number | null;
  formatted_duration: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadThrough {
  id: number;
  local_id?: string;
  user_book_id: number;
  read_number: number;
  status: BookStatus;
  status_label: string;
  rating: number | null;
  review: string | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  total_pages_read?: number;
  total_reading_seconds?: number;
  reading_sessions?: ReadingSession[];
  created_at: string;
  updated_at: string;
}

export type LibraryResponse = UserBook[];

export interface LibraryExternalIdEntry {
  status: BookStatus;
  user_book_id: number;
}

export type LibraryExternalIdsMap = Record<string, LibraryExternalIdEntry>;

export interface AddToLibraryData {
  external_id?: string;
  external_provider?: string;
  title: string;
  author: string;
  cover_url?: string | null;
  page_count?: number | null;
  height_cm?: number | null;
  width_cm?: number | null;
  thickness_cm?: number | null;
  isbn?: string | null;
  description?: string | null;
  genres?: string[];
  published_date?: string | null;
  status: BookStatus;
}

export interface UpdateUserBookData {
  status?: BookStatus;
  format?: BookFormat | null;
  rating?: number | null;
  price?: number | null;
  current_page?: number;
  is_dnf?: boolean;
  dnf_reason?: string | null;
  review?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface LogSessionData {
  user_book_id: number;
  read_through_id?: number | null;
  date: string;
  start_page: number;
  end_page: number;
  duration_seconds?: number | null;
  notes?: string | null;
}

export interface LogSessionResponse {
  session: ReadingSession;
  user_book: UserBook;
}

export const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'Did Not Finish' },
];

export const DNF_REASONS: { value: string; label: string }[] = [
  { value: 'not_for_me', label: 'Not for me right now' },
  { value: 'boring', label: 'Boring / Too slow' },
  { value: 'writing', label: 'Dislike the writing style' },
  { value: 'content', label: 'Problematic content' },
  { value: 'other', label: 'Other reason' },
];

export interface PeriodStats {
  pages_read: number;
  sessions: number;
  reading_time_seconds: number;
  reading_time_formatted: string | null;
}

export interface RecentSession {
  id: number;
  date: string;
  pages_read: number;
  start_page: number;
  end_page: number;
  duration_seconds: number | null;
  formatted_duration: string | null;
  notes: string | null;
  book: {
    id: number;
    title: string;
    author: string;
    cover_url: string | null;
  };
}

export interface ReadingStats {
  total_pages_read: number;
  total_sessions: number;
  total_reading_time_seconds: number;
  total_reading_time_formatted: string | null;
  books_completed: number;
  books_in_progress: number;
  current_streak_days: number;
  longest_streak_days: number;
  avg_pages_per_session: number;
  avg_session_duration_seconds: number;
  avg_session_duration_formatted: string | null;
  this_week: PeriodStats;
  this_month: PeriodStats;
  recent_sessions: RecentSession[];
}

