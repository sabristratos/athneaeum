export interface SyncResult {
  status: 'success' | 'already_syncing' | 'offline' | 'error';
  pushed?: SyncCounts;
  pulledAt?: number;
  error?: string;
}

export interface SyncCounts {
  books: number;
  user_books: number;
  reading_sessions: number;
}

export interface IdMapping {
  local_id: string;
  server_id: number;
  server_book_id?: number;
  server_user_book_id?: number;
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
  reading_sessions: {
    created: SessionPayload[];
    updated: SessionPayload[];
    deleted: number[];
  };
}

export interface PushResponse {
  status: string;
  id_mappings: {
    books: IdMapping[];
    user_books: IdMapping[];
    reading_sessions: IdMapping[];
  };
  counts: SyncCounts;
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
    reading_sessions: {
      created: ServerSession[];
      updated: ServerSession[];
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
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  custom_cover_url: string | null;
}

export interface SessionPayload {
  local_id: string;
  server_id?: number;
  user_book_local_id: string;
  server_user_book_id?: number;
  date: string;
  pages_read: number;
  start_page: number;
  end_page: number;
  duration_seconds: number | null;
  notes: string | null;
}

export interface ServerBook {
  id: number;
  external_id: string | null;
  external_provider: string | null;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number | null;
  isbn: string | null;
  description: string | null;
  genres: string[];
  published_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerUserBook {
  id: number;
  book_id: number;
  status: string;
  rating: number | null;
  current_page: number;
  is_dnf: boolean;
  dnf_reason: string | null;
  started_at: string | null;
  finished_at: string | null;
  custom_cover_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServerSession {
  id: number;
  user_book_id: number;
  date: string;
  pages_read: number;
  start_page: number;
  end_page: number;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
