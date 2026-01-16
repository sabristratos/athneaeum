import type { LibraryBook } from '@/database/hooks';
import type { UserBook, BookFormat } from '@/types';

/**
 * Converts a WatermelonDB LibraryBook to an API UserBook format.
 */
export function convertToApiUserBook(lb: LibraryBook): UserBook {
  const { userBook: ub, book: b } = lb;
  const genres = b.genresJson ? JSON.parse(b.genresJson) : null;
  return {
    id: ub.serverId ?? 0,
    local_id: ub.id,
    book_id: b.serverId ?? 0,
    book: {
      id: b.serverId ?? 0,
      external_id: b.externalId,
      external_provider: b.externalProvider,
      series_id: b.serverSeriesId ?? null,
      volume_number: b.volumeNumber,
      volume_title: b.volumeTitle,
      title: b.title,
      author: b.author,
      cover_url: b.coverUrl,
      page_count: b.pageCount,
      height_cm: b.heightCm ?? null,
      width_cm: b.widthCm ?? null,
      thickness_cm: b.thicknessCm ?? null,
      isbn: b.isbn,
      description: b.description,
      genres: genres?.map((name: string, idx: number) => ({ id: idx, name, slug: name.toLowerCase().replace(/\s+/g, '-') })) ?? null,
      published_date: b.publishedDate,
      audience: null,
      audience_label: null,
      intensity: null,
      intensity_label: null,
      moods: null,
      is_classified: false,
      classification_confidence: null,
      created_at: '',
      updated_at: '',
    },
    status: ub.status,
    status_label: ub.status,
    format: ub.format as BookFormat | null,
    format_label: ub.format,
    rating: ub.rating,
    price: ub.price,
    current_page: ub.currentPage,
    progress_percentage: b.pageCount ? Math.round((ub.currentPage / b.pageCount) * 100) : null,
    is_dnf: ub.isDnf,
    dnf_reason: ub.dnfReason,
    is_pinned: ub.isPinned,
    queue_position: ub.queuePosition,
    review: ub.review,
    started_at: ub.startedAt?.toISOString() ?? null,
    finished_at: ub.finishedAt?.toISOString() ?? null,
    created_at: ub.createdAt?.toISOString() ?? '',
    updated_at: ub.updatedAt?.toISOString() ?? '',
  };
}
