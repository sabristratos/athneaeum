export interface LibraryAuthor {
  name: string;
  normalized: string;
  book_count: number;
  avg_rating: number | null;
  total_pages: number;
  is_favorite: boolean;
  is_excluded: boolean;
}

export interface OpenLibraryAuthor {
  key: string;
  name: string;
  alternate_names: string[];
  birth_date: string | null;
  death_date: string | null;
  top_work: string | null;
  work_count: number;
  top_subjects: string[];
  photo_url: string | null;
  is_cached?: boolean;
}

export interface OpenLibraryAuthorDetail {
  key: string;
  name: string;
  alternate_names: string[];
  birth_date: string | null;
  death_date: string | null;
  bio: string | null;
  photo_url: string | null;
  wikipedia_url: string | null;
  links: Array<{ title: string; url: string }>;
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  first_publish_year: number | null;
  edition_count: number;
  cover_id: number | null;
  subjects: string[];
}

export interface AuthorSearchResponse {
  items: OpenLibraryAuthor[];
  totalItems: number;
  hasMore: boolean;
}

export interface AuthorWorksResponse {
  items: OpenLibraryWork[];
  totalItems: number;
  hasMore: boolean;
}

export type LibraryAuthorFilter = 'all' | 'favorites' | 'excluded';
export type LibraryAuthorSort = 'books' | 'name' | 'rating' | 'pages';
export type LibraryAuthorSortOrder = 'asc' | 'desc';
