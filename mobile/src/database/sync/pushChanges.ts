import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { apiClient } from '@/api/client';
import { toISODateString } from '@/utils/dateUtils';
import type { Book } from '@/database/models/Book';
import type { UserBook } from '@/database/models/UserBook';
import type { ReadThrough } from '@/database/models/ReadThrough';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type {
  PushPayload,
  PushResponse,
  BookPayload,
  UserBookPayload,
  ReadThroughPayload,
  SessionPayload,
} from '@/database/sync/types';

function transformBookForPush(book: Book): BookPayload {
  return {
    local_id: book.id,
    server_id: book.serverId ?? undefined,
    external_id: book.externalId,
    external_provider: book.externalProvider,
    title: book.title,
    author: book.author,
    cover_url: book.coverUrl,
    page_count: book.pageCount,
    height_cm: book.heightCm,
    width_cm: book.widthCm,
    thickness_cm: book.thicknessCm,
    isbn: book.isbn,
    description: book.description,
    genres: book.genres,
    published_date: book.publishedDate,
  };
}

function transformUserBookForPush(userBook: UserBook): UserBookPayload {
  return {
    local_id: userBook.id,
    server_id: userBook.serverId ?? undefined,
    book_local_id: userBook.bookId,
    server_book_id: userBook.serverBookId ?? undefined,
    status: userBook.status,
    rating: userBook.rating,
    current_page: userBook.currentPage,
    format: userBook.format,
    price: userBook.price,
    is_pinned: userBook.isPinned,
    queue_position: userBook.queuePosition,
    review: userBook.review,
    is_dnf: userBook.isDnf,
    dnf_reason: userBook.dnfReason,
    started_at: userBook.startedAt
      ? toISODateString(new Date(userBook.startedAt))
      : null,
    finished_at: userBook.finishedAt
      ? toISODateString(new Date(userBook.finishedAt))
      : null,
    custom_cover_url: userBook.customCoverUrl,
  };
}

function transformReadThroughForPush(readThrough: ReadThrough): ReadThroughPayload {
  return {
    local_id: readThrough.id,
    server_id: readThrough.serverId ?? undefined,
    user_book_local_id: readThrough.userBookId,
    server_user_book_id: readThrough.serverUserBookId ?? undefined,
    read_number: readThrough.readNumber,
    status: readThrough.status,
    rating: readThrough.rating,
    review: readThrough.review,
    is_dnf: readThrough.isDnf,
    dnf_reason: readThrough.dnfReason,
    started_at: readThrough.startedAt
      ? toISODateString(new Date(readThrough.startedAt))
      : null,
    finished_at: readThrough.finishedAt
      ? toISODateString(new Date(readThrough.finishedAt))
      : null,
  };
}

function transformSessionForPush(session: ReadingSession): SessionPayload {
  return {
    local_id: session.id,
    server_id: session.serverId ?? undefined,
    user_book_local_id: session.userBookId,
    server_user_book_id: session.serverUserBookId ?? undefined,
    read_through_local_id: session.readThroughId ?? undefined,
    server_read_through_id: session.serverReadThroughId ?? undefined,
    date: session.sessionDate,
    pages_read: session.pagesRead,
    start_page: session.startPage,
    end_page: session.endPage,
    duration_seconds: session.durationSeconds,
    notes: session.notes,
  };
}

export async function pushChanges(): Promise<PushResponse> {
  const booksCollection = database.get<Book>('books');
  const userBooksCollection = database.get<UserBook>('user_books');
  const readThroughsCollection = database.get<ReadThrough>('read_throughs');
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');

  // Gather pending records (not deleted)
  const pendingBooks = await booksCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingUserBooks = await userBooksCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingReadThroughs = await readThroughsCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingSessions = await sessionsCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  // Gather deleted records
  const deletedUserBooks = await userBooksCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedReadThroughs = await readThroughsCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedSessions = await sessionsCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const payload: PushPayload = {
    books: {
      created: pendingBooks
        .filter((b) => !b.serverId)
        .map(transformBookForPush),
      updated: pendingBooks.filter((b) => b.serverId).map(transformBookForPush),
      deleted: [],
    },
    user_books: {
      created: pendingUserBooks
        .filter((ub) => !ub.serverId)
        .map(transformUserBookForPush),
      updated: pendingUserBooks
        .filter((ub) => ub.serverId)
        .map(transformUserBookForPush),
      deleted: deletedUserBooks
        .filter((ub) => ub.serverId)
        .map((ub) => ub.serverId!),
    },
    read_throughs: {
      created: pendingReadThroughs
        .filter((rt) => !rt.serverId)
        .map(transformReadThroughForPush),
      updated: pendingReadThroughs
        .filter((rt) => rt.serverId)
        .map(transformReadThroughForPush),
      deleted: deletedReadThroughs
        .filter((rt) => rt.serverId)
        .map((rt) => rt.serverId!),
    },
    reading_sessions: {
      created: pendingSessions
        .filter((s) => !s.serverId)
        .map(transformSessionForPush),
      updated: pendingSessions
        .filter((s) => s.serverId)
        .map(transformSessionForPush),
      deleted: deletedSessions
        .filter((s) => s.serverId)
        .map((s) => s.serverId!),
    },
  };

  // Skip API call if nothing to push
  if (
    payload.books.created.length === 0 &&
    payload.books.updated.length === 0 &&
    payload.user_books.created.length === 0 &&
    payload.user_books.updated.length === 0 &&
    payload.user_books.deleted.length === 0 &&
    payload.read_throughs.created.length === 0 &&
    payload.read_throughs.updated.length === 0 &&
    payload.read_throughs.deleted.length === 0 &&
    payload.reading_sessions.created.length === 0 &&
    payload.reading_sessions.updated.length === 0 &&
    payload.reading_sessions.deleted.length === 0
  ) {
    return {
      status: 'success',
      id_mappings: { books: [], user_books: [], read_throughs: [], reading_sessions: [] },
      counts: { books: 0, user_books: 0, read_throughs: 0, reading_sessions: 0 },
      skipped: { user_books: [], read_throughs: [], reading_sessions: [] },
      timestamp: Date.now(),
    };
  }

  const response = await apiClient<PushResponse>('/sync/push', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });

  // Update local records with server IDs and clear pending flags
  await database.write(async () => {
    // Update books
    for (const mapping of response.id_mappings.books) {
      const book = pendingBooks.find((b) => b.id === mapping.local_id);
      if (book) {
        await book.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

    // Update user_books
    for (const mapping of response.id_mappings.user_books) {
      const userBook = pendingUserBooks.find(
        (ub) => ub.id === mapping.local_id
      );
      if (userBook) {
        await userBook.update((record) => {
          record.serverId = mapping.server_id;
          if (mapping.server_book_id) {
            record.serverBookId = mapping.server_book_id;
          }
          record.isPendingSync = false;
        });
      }
    }

    // Update read_throughs
    for (const mapping of response.id_mappings.read_throughs ?? []) {
      const readThrough = pendingReadThroughs.find(
        (rt) => rt.id === mapping.local_id
      );
      if (readThrough) {
        await readThrough.update((record) => {
          record.serverId = mapping.server_id;
          if (mapping.server_user_book_id) {
            record.serverUserBookId = mapping.server_user_book_id;
          }
          record.isPendingSync = false;
        });
      }
    }

    // Update reading_sessions
    for (const mapping of response.id_mappings.reading_sessions) {
      const session = pendingSessions.find((s) => s.id === mapping.local_id);
      if (session) {
        await session.update((record) => {
          record.serverId = mapping.server_id;
          if (mapping.server_user_book_id) {
            record.serverUserBookId = mapping.server_user_book_id;
          }
          if (mapping.server_read_through_id) {
            record.serverReadThroughId = mapping.server_read_through_id;
          }
          record.isPendingSync = false;
        });
      }
    }

    // Permanently delete soft-deleted records that were synced
    for (const ub of deletedUserBooks.filter((ub) => ub.serverId)) {
      await ub.destroyPermanently();
    }
    for (const rt of deletedReadThroughs.filter((rt) => rt.serverId)) {
      await rt.destroyPermanently();
    }
    for (const s of deletedSessions.filter((s) => s.serverId)) {
      await s.destroyPermanently();
    }
  });

  // Log warning if any records were skipped (they'll retry on next sync)
  const skippedCount =
    response.skipped.user_books.length +
    (response.skipped.read_throughs?.length ?? 0) +
    response.skipped.reading_sessions.length;
  if (skippedCount > 0) {
    console.warn(
      `[Sync] ${skippedCount} record(s) skipped due to missing dependencies:`,
      response.skipped
    );
  }

  return response;
}
