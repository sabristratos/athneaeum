export type BookStatus = 'want_to_read' | 'reading' | 'read' | 'dnf';

// Search filter types
export type MinRating = 0 | 3 | 4 | 4.5;

export interface SearchFilters {
  language?: string;
  genres?: string[];
  minRating?: MinRating;
  yearFrom?: number;
  yearTo?: number;
}

export interface SearchResult {
  external_id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number | null;
  isbn: string | null;
  description: string | null;
  genres: string[];
  published_date: string | null;
  average_rating: number | null;
  ratings_count: number | null;
}

export interface SearchMeta {
  total: number;
  start_index: number;
  has_more: boolean;
  provider: string;
}

export interface SearchResponse {
  data: SearchResult[];
  meta: SearchMeta;
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
  { value: '', label: 'Any Language' },
  { value: 'en', label: 'English' },
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

export interface Book {
  id: number;
  external_id: string | null;
  external_provider: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number | null;
  isbn: string | null;
  description: string | null;
  genres: string[] | null;
  published_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserBook {
  id: number;
  user_id: number;
  book_id: number;
  book: Book;
  status: BookStatus;
  status_label: string;
  rating: number | null;
  current_page: number;
  progress_percentage: number | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  reading_sessions?: ReadingSession[];
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: number;
  user_book_id: number;
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

export interface LibraryResponse {
  data: UserBook[];
}

export interface AddToLibraryData {
  external_id?: string;
  external_provider?: string;
  title: string;
  author: string;
  cover_url?: string | null;
  page_count?: number | null;
  isbn?: string | null;
  description?: string | null;
  genres?: string[];
  published_date?: string | null;
  status: BookStatus;
}

export interface UpdateUserBookData {
  status?: BookStatus;
  rating?: number | null;
  current_page?: number;
  is_dnf?: boolean;
  dnf_reason?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface LogSessionData {
  user_book_id: number;
  date: string;
  start_page: number;
  end_page: number;
  duration_seconds?: number | null;
  notes?: string | null;
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

export interface ReadingStatsResponse {
  data: ReadingStats;
}
