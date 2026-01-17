export interface SyncResult {
  status: 'success' | 'already_syncing' | 'offline' | 'error';
  pushed?: SyncCounts;
  pulledAt?: number;
  error?: string;
}

export interface SyncCounts {
  books: number;
  user_books: number;
  read_throughs: number;
  reading_sessions: number;
  series: number;
  tags: number;
  user_preferences: number;
  reading_goals: number;
}

export interface IdMapping {
  local_id: string;
  server_id: number;
  server_book_id?: number;
  server_user_book_id?: number;
  server_read_through_id?: number;
}

export interface PushPayload {
  books: {
    created: BookPayload[];
    updated: BookPayload[];
    deleted: string[];
  };
  user_books: {
    created: UserBookPayload[];
    updated: UserBookPayload[];
    deleted: number[];
  };
  read_throughs: {
    created: ReadThroughPayload[];
    updated: ReadThroughPayload[];
    deleted: number[];
  };
  reading_sessions: {
    created: SessionPayload[];
    updated: SessionPayload[];
    deleted: number[];
  };
  series: {
    created: SeriesPayload[];
    updated: SeriesPayload[];
    deleted: number[];
  };
  tags: {
    created: TagPayload[];
    updated: TagPayload[];
    deleted: number[];
  };
  user_preferences: {
    created: PreferencePayload[];
    updated: PreferencePayload[];
    deleted: number[];
  };
  reading_goals: {
    created: GoalPayload[];
    updated: GoalPayload[];
    deleted: number[];
  };
}

export interface SkippedRecord {
  local_id: string | null;
  reason: 'book_not_found' | 'user_book_not_found' | 'read_through_not_found';
}

export interface SkippedRecords {
  user_books: SkippedRecord[];
  read_throughs: SkippedRecord[];
  reading_sessions: SkippedRecord[];
}

export interface PushResponse {
  status: string;
  id_mappings: {
    books: IdMapping[];
    user_books: IdMapping[];
    read_throughs: IdMapping[];
    reading_sessions: IdMapping[];
    series: IdMapping[];
    tags: IdMapping[];
    user_preferences: IdMapping[];
    reading_goals: IdMapping[];
  };
  counts: SyncCounts;
  skipped: SkippedRecords;
  timestamp: number;
}

export interface PullResponse {
  changes: {
    books: { created: ServerBook[]; updated: ServerBook[]; deleted: number[] };
    user_books: {
      created: ServerUserBook[];
      updated: ServerUserBook[];
      deleted: number[];
    };
    read_throughs: {
      created: ServerReadThrough[];
      updated: ServerReadThrough[];
      deleted: number[];
    };
    reading_sessions: {
      created: ServerSession[];
      updated: ServerSession[];
      deleted: number[];
    };
    series: {
      created: ServerSeries[];
      updated: ServerSeries[];
      deleted: number[];
    };
    tags: {
      created: ServerTag[];
      updated: ServerTag[];
      deleted: number[];
    };
    user_preferences: {
      created: ServerPreference[];
      updated: ServerPreference[];
      deleted: number[];
    };
    reading_goals: {
      created: ServerGoal[];
      updated: ServerGoal[];
      deleted: number[];
    };
  };
  timestamp: number;
}

export interface BookPayload {
  local_id: string;
  server_id?: number;
  external_id: string | null;
  external_provider: string | null;
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
}

export interface UserBookPayload {
  local_id: string;
  server_id?: number;
  book_local_id: string;
  server_book_id?: number;
  external_id?: string;
  status: string;
  rating: number | null;
  current_page: number;
  format: string | null;
  price: number | null;
  is_pinned: boolean;
  queue_position: number | null;
  review: string | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  custom_cover_url: string | null;
  tag_ids?: number[];
}

export interface ReadThroughPayload {
  local_id: string;
  server_id?: number;
  user_book_local_id: string;
  server_user_book_id?: number;
  read_number: number;
  status: string;
  rating: number | null;
  review: string | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface SessionPayload {
  local_id: string;
  server_id?: number;
  user_book_local_id: string;
  server_user_book_id?: number;
  read_through_local_id?: string;
  server_read_through_id?: number;
  date: string;
  pages_read: number;
  start_page: number;
  end_page: number;
  duration_seconds: number | null;
  notes: string | null;
}

export interface TagPayload {
  local_id: string;
  server_id?: number;
  name: string;
  slug: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}

export interface PreferencePayload {
  local_id: string;
  server_id?: number;
  category: string;
  type: string;
  value: string;
  normalized: string;
}

export interface GoalPayload {
  local_id: string;
  server_id?: number;
  type: string;
  period: string;
  target: number;
  year: number;
  month: number | null;
  week: number | null;
  is_active: boolean;
  completed_at: string | null;
}

export interface SeriesPayload {
  local_id: string;
  server_id?: number;
  title: string;
  author: string;
  external_id: string | null;
  external_provider: string | null;
  total_volumes: number | null;
  is_complete: boolean;
  description: string | null;
}

export interface ServerBook {
  id: number;
  external_id: string | null;
  external_provider: string | null;
  series_id: number | null;
  volume_number: number | null;
  volume_title: string | null;
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
  audience: string | null;
  intensity: string | null;
  moods: string[] | null;
  is_classified: boolean;
  classification_confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface ServerUserBook {
  id: number;
  book_id: number;
  status: string;
  rating: number | null;
  current_page: number;
  format: string | null;
  price: number | null;
  is_pinned: boolean;
  queue_position: number | null;
  review: string | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  custom_cover_url: string | null;
  tag_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface ServerReadThrough {
  id: number;
  user_book_id: number;
  read_number: number;
  status: string;
  rating: number | null;
  review: string | null;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerSession {
  id: number;
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

export interface ServerSeries {
  id: number;
  title: string;
  author: string;
  external_id: string | null;
  external_provider: string | null;
  total_volumes: number | null;
  is_complete: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerTag {
  id: number;
  name: string;
  slug: string;
  color: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServerPreference {
  id: number;
  category: string;
  type: string;
  value: string;
  normalized: string;
  created_at: string;
  updated_at: string;
}

export interface ServerGoal {
  id: number;
  type: string;
  period: string;
  target: number;
  year: number;
  month: number | null;
  week: number | null;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
