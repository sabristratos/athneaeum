export type BookFormat = 'physical' | 'ebook' | 'audiobook';

export type ReadingRhythm =
  | 'weekend_warrior'
  | 'weekday_devotee'
  | 'night_owl'
  | 'early_bird'
  | 'marathon_reader'
  | 'daily_reader'
  | 'balanced';

export interface HeatmapDay {
  date: string;
  pages_read: number;
  intensity: 0 | 1 | 2 | 3 | 4;
}

export interface HeatmapData {
  days: HeatmapDay[];
  longest_streak: number;
  current_streak: number;
  reading_rhythm: ReadingRhythm;
  rhythm_label: string;
  total_active_days: number;
  total_pages_read: number;
  total_pages_from_sessions: number;
  total_books_completed: number;
}

export interface FormatVelocityItem {
  format: BookFormat;
  label: string;
  pages_per_hour: number;
  total_pages: number;
  total_hours: number;
}

export interface FormatVelocityData {
  formats: FormatVelocityItem[];
  fastest_format: BookFormat | null;
  average_velocity: number;
}

export type MoodKey =
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

export type IntensityKey = 'light' | 'moderate' | 'dark' | 'intense';

export type AudienceKey = 'adult' | 'young_adult' | 'middle_grade' | 'children';

export interface MoodItem {
  mood: string;
  mood_key: MoodKey;
  count: number;
  percentage: number;
}

export interface IntensityItem {
  intensity: string;
  intensity_key: IntensityKey;
  description: string;
  count: number;
  percentage: number;
}

export interface AudienceItem {
  audience: string;
  audience_key: AudienceKey;
  count: number;
  percentage: number;
}

export interface MoodTagItem {
  tag_id: number;
  name: string;
  color: string;
  count: number;
  percentage: number;
}

export interface MoodGenreItem {
  genre: string;
  genre_key: string;
  count: number;
  percentage: number;
}

export interface ClassificationCoverage {
  classified: number;
  total: number;
  percentage: number;
}

export interface SeasonalPattern {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  label: string;
  top_mood: string;
  top_mood_key: MoodKey;
  percentage: number;
}

export interface MoodRingData {
  by_moods: MoodItem[];
  by_intensity: IntensityItem[];
  by_audience: AudienceItem[];
  by_genres: MoodGenreItem[];
  by_tags: MoodTagItem[];
  seasonal_patterns: SeasonalPattern[];
  classification_coverage: ClassificationCoverage;
}

export interface DnfPattern {
  pattern: 'long_books' | 'genre' | 'author' | 'month';
  label: string;
  threshold?: number;
  genre?: string;
  genre_key?: string;
  rate: number;
}

export interface AbandonmentPoint {
  range: string;
  count: number;
}

export interface DnfReason {
  reason: string;
  label: string;
  count: number;
}

export interface DnfAnalyticsData {
  total_dnf: number;
  total_books: number;
  dnf_rate: number;
  patterns: DnfPattern[];
  abandonment_points: AbandonmentPoint[];
  top_dnf_reasons: DnfReason[];
}

export interface BookValueItem {
  title: string;
  cost_per_hour: number;
  price: number;
  hours: number;
  is_estimated?: boolean;
}

export interface PageEconomyData {
  total_spent: number;
  total_hours: number;
  tracked_hours: number;
  estimated_hours: number;
  cost_per_hour: number;
  comparison: {
    netflix: number;
    movie_theater: number;
    books: number;
  };
  books_with_price: number;
  books_with_tracked_time: number;
  books_with_estimated_time: number;
  best_value_books: BookValueItem[];
}

export interface CalendarSession {
  id: number;
  user_book_id: number;
  book_title: string;
  book_author: string;
  cover_url: string | null;
  pages_read: number;
  duration_seconds: number | null;
  notes: string | null;
}

export interface CalendarBook {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
}

export interface CalendarDay {
  date: string;
  local_date_string: string;
  pages_read: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  sessions: CalendarSession[];
  books_completed: CalendarBook[];
}

export interface MonthlySummary {
  month: number;
  year: number;
  label: string;
  books_completed: number;
  pages_read: number;
  sessions_count: number;
  top_book_cover: string | null;
}

export interface CalendarData {
  days: CalendarDay[];
  monthly_summaries: MonthlySummary[];
}
