import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { apiClient } from '@/api/client';
import type { Book } from '@/database/models/Book';
import type { UserBook } from '@/database/models/UserBook';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { SyncMetadata } from '@/database/models/SyncMetadata';
import type { PullResponse, ServerBook, ServerUserBook, ServerSession } from '@/database/sync/types';
import type { BookStatus } from '@/types/book';

export async function pullChanges(lastPulledAt: number): Promise<number> {
  const response = await apiClient<PullResponse>(
    `/sync/pull?last_pulled_at=${lastPulledAt}`
  );

  await database.write(async () => {
    const booksCollection = database.get<Book>('books');
    const userBooksCollection = database.get<UserBook>('user_books');
    const sessionsCollection = database.get<ReadingSession>('reading_sessions');

    // Process created books
    for (const serverBook of response.changes.books.created) {
      await createOrUpdateBook(booksCollection, serverBook);
    }

    // Process updated books
    for (const serverBook of response.changes.books.updated) {
      await createOrUpdateBook(booksCollection, serverBook);
    }

    // Process created user_books
    for (const serverUserBook of response.changes.user_books.created) {
      await createOrUpdateUserBook(
        userBooksCollection,
        booksCollection,
        serverUserBook
      );
    }

    // Process updated user_books
    for (const serverUserBook of response.changes.user_books.updated) {
      await createOrUpdateUserBook(
        userBooksCollection,
        booksCollection,
        serverUserBook
      );
    }

    // Process deleted user_books
    for (const serverId of response.changes.user_books.deleted) {
      const existing = await userBooksCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    // Process created reading_sessions
    for (const serverSession of response.changes.reading_sessions.created) {
      await createOrUpdateSession(
        sessionsCollection,
        userBooksCollection,
        serverSession
      );
    }

    // Process updated reading_sessions
    for (const serverSession of response.changes.reading_sessions.updated) {
      await createOrUpdateSession(
        sessionsCollection,
        userBooksCollection,
        serverSession
      );
    }

    // Process deleted reading_sessions
    for (const serverId of response.changes.reading_sessions.deleted) {
      const existing = await sessionsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    // Update sync metadata
    await updateSyncMetadata(response.timestamp);
  });

  return response.timestamp;
}

async function createOrUpdateBook(
  collection: ReturnType<typeof database.get<Book>>,
  serverBook: ServerBook
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverBook.id))
    .fetch();

  if (existing[0]) {
    // Skip if local has pending changes
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.title = serverBook.title;
      record.author = serverBook.author;
      record.coverUrl = serverBook.cover_url;
      record.pageCount = serverBook.page_count;
      record.isbn = serverBook.isbn;
      record.description = serverBook.description;
      record.genresJson = JSON.stringify(serverBook.genres || []);
      record.publishedDate = serverBook.published_date;
    });
  } else {
    // Check if book exists by external_id
    const byExternalId = serverBook.external_id
      ? await collection
          .query(Q.where('external_id', serverBook.external_id))
          .fetch()
      : [];

    if (byExternalId[0]) {
      await byExternalId[0].update((record) => {
        record.serverId = serverBook.id;
        record.title = serverBook.title;
        record.author = serverBook.author;
        record.coverUrl = serverBook.cover_url;
        record.pageCount = serverBook.page_count;
        record.isbn = serverBook.isbn;
        record.description = serverBook.description;
        record.genresJson = JSON.stringify(serverBook.genres || []);
        record.publishedDate = serverBook.published_date;
        record.isPendingSync = false;
      });
    } else {
      await collection.create((record) => {
        record.serverId = serverBook.id;
        record.externalId = serverBook.external_id;
        record.externalProvider = serverBook.external_provider;
        record.title = serverBook.title;
        record.author = serverBook.author;
        record.coverUrl = serverBook.cover_url;
        record.pageCount = serverBook.page_count;
        record.isbn = serverBook.isbn;
        record.description = serverBook.description;
        record.genresJson = JSON.stringify(serverBook.genres || []);
        record.publishedDate = serverBook.published_date;
        record.isPendingSync = false;
        record.isDeleted = false;
      });
    }
  }
}

async function createOrUpdateUserBook(
  collection: ReturnType<typeof database.get<UserBook>>,
  booksCollection: ReturnType<typeof database.get<Book>>,
  serverUserBook: ServerUserBook
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverUserBook.id))
    .fetch();

  // Find the local book by server_id
  const book = await booksCollection
    .query(Q.where('server_id', serverUserBook.book_id))
    .fetch();

  if (!book[0]) {
    console.warn(
      `[Sync] Cannot find book with server_id ${serverUserBook.book_id}`
    );
    return;
  }

  if (existing[0]) {
    // Skip if local has pending changes, but merge page progress
    if (existing[0].isPendingSync) {
      // Still update page progress to keep higher value
      const serverPage = serverUserBook.current_page;
      const localPage = existing[0].currentPage;
      if (serverPage > localPage) {
        await existing[0].update((record) => {
          record.currentPage = serverPage;
        });
      }
      return;
    }

    await existing[0].update((record) => {
      record.bookId = book[0].id;
      record.serverBookId = serverUserBook.book_id;
      record.status = serverUserBook.status as BookStatus;
      record.rating = serverUserBook.rating;
      record.currentPage = serverUserBook.current_page;
      record.isDnf = serverUserBook.is_dnf;
      record.dnfReason = serverUserBook.dnf_reason;
      (record as any).startedAt = serverUserBook.started_at
        ? new Date(serverUserBook.started_at)
        : null;
      (record as any).finishedAt = serverUserBook.finished_at
        ? new Date(serverUserBook.finished_at)
        : null;
      record.customCoverUrl = serverUserBook.custom_cover_url;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverUserBook.id;
      record.bookId = book[0].id;
      record.serverBookId = serverUserBook.book_id;
      record.status = serverUserBook.status as BookStatus;
      record.rating = serverUserBook.rating;
      record.currentPage = serverUserBook.current_page;
      record.isDnf = serverUserBook.is_dnf;
      record.dnfReason = serverUserBook.dnf_reason;
      (record as any).startedAt = serverUserBook.started_at
        ? new Date(serverUserBook.started_at)
        : null;
      (record as any).finishedAt = serverUserBook.finished_at
        ? new Date(serverUserBook.finished_at)
        : null;
      record.customCoverUrl = serverUserBook.custom_cover_url;
      record.isPendingSync = false;
      record.pendingCoverUpload = false;
      record.isDeleted = false;
    });
  }
}

async function createOrUpdateSession(
  collection: ReturnType<typeof database.get<ReadingSession>>,
  userBooksCollection: ReturnType<typeof database.get<UserBook>>,
  serverSession: ServerSession
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverSession.id))
    .fetch();

  // Find the local user_book by server_id
  const userBook = await userBooksCollection
    .query(Q.where('server_id', serverSession.user_book_id))
    .fetch();

  if (!userBook[0]) {
    console.warn(
      `[Sync] Cannot find user_book with server_id ${serverSession.user_book_id}`
    );
    return;
  }

  if (existing[0]) {
    // Sessions are append-only, skip if exists
    return;
  }

  await collection.create((record) => {
    record.serverId = serverSession.id;
    record.userBookId = userBook[0].id;
    record.serverUserBookId = serverSession.user_book_id;
    record.sessionDate = serverSession.date;
    record.pagesRead = serverSession.pages_read;
    record.startPage = serverSession.start_page;
    record.endPage = serverSession.end_page;
    record.durationSeconds = serverSession.duration_seconds;
    record.notes = serverSession.notes;
    record.isPendingSync = false;
    record.isDeleted = false;
  });
}

async function updateSyncMetadata(timestamp: number): Promise<void> {
  const syncMetaCollection = database.get<SyncMetadata>('sync_metadata');
  const existing = await syncMetaCollection
    .query(Q.where('key', 'last_sync'))
    .fetch();

  if (existing[0]) {
    await existing[0].update((record) => {
      record.lastPulledAt = timestamp;
    });
  } else {
    await syncMetaCollection.create((record) => {
      record.key = 'last_sync';
      record.lastPulledAt = timestamp;
      record.lastPushedAt = 0;
    });
  }
}

export async function getLastPulledAt(): Promise<number> {
  const syncMetaCollection = database.get<SyncMetadata>('sync_metadata');
  const existing = await syncMetaCollection
    .query(Q.where('key', 'last_sync'))
    .fetch();

  return existing[0]?.lastPulledAt || 0;
}
