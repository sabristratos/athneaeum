import type { Audience, Intensity, Mood } from './book';

/**
 * Types for the Discovery recommendation engine.
 *
 * Discovery is an online-only feature that provides personalized
 * book recommendations based on reading history and user signals.
 */

/**
 * A book from the discovery catalog (separate from user library).
 */
export interface CatalogBook {
  id: number;
  title: string;
  author: string | null;
  cover_url: string | null;
  description?: string;
  genres: string[];
  page_count: number | null;
  published_date: string | null;
  average_rating: number | null;
  popularity_score: number;
  isbn: string | null;
  isbn13: string | null;
  external_id: string | null;
  external_provider: string | null;
  similarity?: number;
  has_embedding?: boolean;

  audience: Audience | null;
  audience_label: string | null;
  intensity: Intensity | null;
  intensity_label: string | null;
  moods: Mood[] | null;
  is_classified: boolean;
  classification_confidence: number | null;

  recommendation_reason?: string;
}

/**
 * A section in the discovery feed.
 */
export interface DiscoverySection {
  type: 'personalized' | 'author' | 'series' | 'genre' | 'trending' | 'similar';
  title: string;
  data: CatalogBook[];
}

/**
 * The full discovery feed response.
 */
export interface DiscoveryFeed {
  sections: DiscoverySection[];
}

/**
 * Types of user interaction signals.
 */
export type SignalType = 'view' | 'click' | 'add_to_library' | 'dismiss';

/**
 * A single user interaction signal.
 */
export interface Signal {
  book_id: number;
  type: SignalType;
  timestamp: number;
}

/**
 * Batch of signals to send to the server.
 */
export type SignalBatch = Signal[];

/**
 * Response from the signals endpoint.
 */
export interface SignalResponse {
  success: boolean;
}

/**
 * Similar books response.
 */
export interface SimilarBooksResponse {
  data: CatalogBook[];
}

/**
 * Catalog search response.
 */
export interface CatalogSearchResponse {
  data: CatalogBook[];
}
