import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { apiClient } from '@/api/client';
import type { Book } from '@/database/models/Book';
import type { UserBook } from '@/database/models/UserBook';
import type { ReadThrough } from '@/database/models/ReadThrough';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { Series } from '@/database/models/Series';
import type { Tag } from '@/database/models/Tag';
import type { UserBookTag } from '@/database/models/UserBookTag';
import type { UserPreference } from '@/database/models/UserPreference';
import type { ReadingGoal } from '@/database/models/ReadingGoal';
import type { SyncMetadata } from '@/database/models/SyncMetadata';
import type {
  PullResponse,
  ServerBook,
  ServerUserBook,
  ServerReadThrough,
  ServerSession,
  ServerSeries,
  ServerTag,
  ServerPreference,
  ServerGoal,
} from '@/database/sync/types';
import type { BookStatus } from '@/types/book';
import type { GoalType, GoalPeriod } from '@/database/models/ReadingGoal';
import type { PreferenceCategory, PreferenceType } from '@/database/models/UserPreference';

export async function pullChanges(lastPulledAt: number): Promise<number> {
  const response = await apiClient<PullResponse>(
    `/sync/pull?last_pulled_at=${lastPulledAt}`
  );

  await database.write(async () => {
    const seriesCollection = database.get<Series>('series');
    const booksCollection = database.get<Book>('books');
    const userBooksCollection = database.get<UserBook>('user_books');
    const readThroughsCollection = database.get<ReadThrough>('read_throughs');
    const sessionsCollection = database.get<ReadingSession>('reading_sessions');
    const tagsCollection = database.get<Tag>('tags');
    const preferencesCollection = database.get<UserPreference>('user_preferences');
    const goalsCollection = database.get<ReadingGoal>('reading_goals');

    for (const serverSeries of response.changes.series?.created ?? []) {
      await createOrUpdateSeries(seriesCollection, serverSeries);
    }

    for (const serverSeries of response.changes.series?.updated ?? []) {
      await createOrUpdateSeries(seriesCollection, serverSeries);
    }

    for (const serverId of response.changes.series?.deleted ?? []) {
      const existing = await seriesCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverBook of response.changes.books.created) {
      await createOrUpdateBook(booksCollection, seriesCollection, serverBook);
    }

    for (const serverBook of response.changes.books.updated) {
      await createOrUpdateBook(booksCollection, seriesCollection, serverBook);
    }

    const userBookTagsCollection = database.get<UserBookTag>('user_book_tags');

    for (const serverUserBook of response.changes.user_books.created) {
      await createOrUpdateUserBook(
        userBooksCollection,
        booksCollection,
        tagsCollection,
        userBookTagsCollection,
        serverUserBook
      );
    }

    for (const serverUserBook of response.changes.user_books.updated) {
      await createOrUpdateUserBook(
        userBooksCollection,
        booksCollection,
        tagsCollection,
        userBookTagsCollection,
        serverUserBook
      );
    }

    for (const serverId of response.changes.user_books.deleted) {
      const existing = await userBooksCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverReadThrough of response.changes.read_throughs?.created ?? []) {
      await createOrUpdateReadThrough(
        readThroughsCollection,
        userBooksCollection,
        serverReadThrough
      );
    }

    for (const serverReadThrough of response.changes.read_throughs?.updated ?? []) {
      await createOrUpdateReadThrough(
        readThroughsCollection,
        userBooksCollection,
        serverReadThrough
      );
    }

    for (const serverId of response.changes.read_throughs?.deleted ?? []) {
      const existing = await readThroughsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverSession of response.changes.reading_sessions.created) {
      await createOrUpdateSession(
        sessionsCollection,
        userBooksCollection,
        readThroughsCollection,
        serverSession
      );
    }

    for (const serverSession of response.changes.reading_sessions.updated) {
      await createOrUpdateSession(
        sessionsCollection,
        userBooksCollection,
        readThroughsCollection,
        serverSession
      );
    }

    for (const serverId of response.changes.reading_sessions.deleted) {
      const existing = await sessionsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverTag of response.changes.tags?.created ?? []) {
      await createOrUpdateTag(tagsCollection, serverTag);
    }

    for (const serverTag of response.changes.tags?.updated ?? []) {
      await createOrUpdateTag(tagsCollection, serverTag);
    }

    for (const serverId of response.changes.tags?.deleted ?? []) {
      const existing = await tagsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverPref of response.changes.user_preferences?.created ?? []) {
      await createOrUpdatePreference(preferencesCollection, serverPref);
    }

    for (const serverPref of response.changes.user_preferences?.updated ?? []) {
      await createOrUpdatePreference(preferencesCollection, serverPref);
    }

    for (const serverId of response.changes.user_preferences?.deleted ?? []) {
      const existing = await preferencesCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    for (const serverGoal of response.changes.reading_goals?.created ?? []) {
      await createOrUpdateGoal(goalsCollection, serverGoal);
    }

    for (const serverGoal of response.changes.reading_goals?.updated ?? []) {
      await createOrUpdateGoal(goalsCollection, serverGoal);
    }

    for (const serverId of response.changes.reading_goals?.deleted ?? []) {
      const existing = await goalsCollection
        .query(Q.where('server_id', serverId))
        .fetch();
      if (existing[0]) {
        await existing[0].destroyPermanently();
      }
    }

    await updateSyncMetadata(response.timestamp);
  });

  return response.timestamp;
}

async function createOrUpdateSeries(
  collection: ReturnType<typeof database.get<Series>>,
  serverSeries: ServerSeries
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverSeries.id))
    .fetch();

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.title = serverSeries.title;
      record.author = serverSeries.author;
      record.externalId = serverSeries.external_id;
      record.externalProvider = serverSeries.external_provider;
      record.totalVolumes = serverSeries.total_volumes;
      record.isComplete = serverSeries.is_complete;
      record.description = serverSeries.description;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverSeries.id;
      record.title = serverSeries.title;
      record.author = serverSeries.author;
      record.externalId = serverSeries.external_id;
      record.externalProvider = serverSeries.external_provider;
      record.totalVolumes = serverSeries.total_volumes;
      record.isComplete = serverSeries.is_complete;
      record.description = serverSeries.description;
      record.isPendingSync = false;
      record.isDeleted = false;
    });
  }
}

async function createOrUpdateBook(
  collection: ReturnType<typeof database.get<Book>>,
  seriesCollection: ReturnType<typeof database.get<Series>>,
  serverBook: ServerBook
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverBook.id))
    .fetch();

  let localSeriesId: string | null = null;
  if (serverBook.series_id) {
    const series = await seriesCollection
      .query(Q.where('server_id', serverBook.series_id))
      .fetch();
    localSeriesId = series[0]?.id ?? null;
  }

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.title = serverBook.title;
      record.author = serverBook.author;
      record.coverUrl = serverBook.cover_url;
      record.pageCount = serverBook.page_count;
      record.heightCm = serverBook.height_cm;
      record.widthCm = serverBook.width_cm;
      record.thicknessCm = serverBook.thickness_cm;
      record.isbn = serverBook.isbn;
      record.description = serverBook.description;
      record.genresJson = JSON.stringify(serverBook.genres || []);
      record.publishedDate = serverBook.published_date;
      record.seriesId = localSeriesId;
      record.serverSeriesId = serverBook.series_id;
      record.volumeNumber = serverBook.volume_number;
      record.volumeTitle = serverBook.volume_title;
      record.audience = serverBook.audience;
      record.intensity = serverBook.intensity;
      record.moodsJson = JSON.stringify(serverBook.moods || []);
      record.isClassified = serverBook.is_classified ?? false;
      record.classificationConfidence = serverBook.classification_confidence;
    });
  } else {
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
        record.heightCm = serverBook.height_cm;
        record.widthCm = serverBook.width_cm;
        record.thicknessCm = serverBook.thickness_cm;
        record.isbn = serverBook.isbn;
        record.description = serverBook.description;
        record.genresJson = JSON.stringify(serverBook.genres || []);
        record.publishedDate = serverBook.published_date;
        record.seriesId = localSeriesId;
        record.serverSeriesId = serverBook.series_id;
        record.volumeNumber = serverBook.volume_number;
        record.volumeTitle = serverBook.volume_title;
        record.audience = serverBook.audience;
        record.intensity = serverBook.intensity;
        record.moodsJson = JSON.stringify(serverBook.moods || []);
        record.isClassified = serverBook.is_classified ?? false;
        record.classificationConfidence = serverBook.classification_confidence;
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
        record.heightCm = serverBook.height_cm;
        record.widthCm = serverBook.width_cm;
        record.thicknessCm = serverBook.thickness_cm;
        record.isbn = serverBook.isbn;
        record.description = serverBook.description;
        record.genresJson = JSON.stringify(serverBook.genres || []);
        record.publishedDate = serverBook.published_date;
        record.seriesId = localSeriesId;
        record.serverSeriesId = serverBook.series_id;
        record.volumeNumber = serverBook.volume_number;
        record.volumeTitle = serverBook.volume_title;
        record.audience = serverBook.audience;
        record.intensity = serverBook.intensity;
        record.moodsJson = JSON.stringify(serverBook.moods || []);
        record.isClassified = serverBook.is_classified ?? false;
        record.classificationConfidence = serverBook.classification_confidence;
        record.isPendingSync = false;
        record.isDeleted = false;
      });
    }
  }
}

async function createOrUpdateUserBook(
  collection: ReturnType<typeof database.get<UserBook>>,
  booksCollection: ReturnType<typeof database.get<Book>>,
  tagsCollection: ReturnType<typeof database.get<Tag>>,
  userBookTagsCollection: ReturnType<typeof database.get<UserBookTag>>,
  serverUserBook: ServerUserBook
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverUserBook.id))
    .fetch();

  const book = await booksCollection
    .query(Q.where('server_id', serverUserBook.book_id))
    .fetch();

  if (!book[0]) {
    return;
  }

  let userBook: UserBook;

  if (existing[0]) {
    if (existing[0].isPendingSync) {
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
      record.format = serverUserBook.format;
      record.price = serverUserBook.price;
      record.isPinned = serverUserBook.is_pinned;
      record.queuePosition = serverUserBook.queue_position;
      record.review = serverUserBook.review;
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
    userBook = existing[0];
  } else {
    userBook = await collection.create((record) => {
      record.serverId = serverUserBook.id;
      record.bookId = book[0].id;
      record.serverBookId = serverUserBook.book_id;
      record.status = serverUserBook.status as BookStatus;
      record.rating = serverUserBook.rating;
      record.currentPage = serverUserBook.current_page;
      record.format = serverUserBook.format;
      record.price = serverUserBook.price;
      record.isPinned = serverUserBook.is_pinned;
      record.queuePosition = serverUserBook.queue_position;
      record.review = serverUserBook.review;
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

  if (serverUserBook.tag_ids && serverUserBook.tag_ids.length >= 0) {
    await syncUserBookTags(
      userBookTagsCollection,
      tagsCollection,
      userBook,
      serverUserBook.tag_ids
    );
  }
}

async function syncUserBookTags(
  userBookTagsCollection: ReturnType<typeof database.get<UserBookTag>>,
  tagsCollection: ReturnType<typeof database.get<Tag>>,
  userBook: UserBook,
  serverTagIds: number[]
): Promise<void> {
  const existingTags = await userBookTagsCollection
    .query(Q.where('user_book_id', userBook.id))
    .fetch();

  const existingServerTagIds = existingTags
    .map((t) => t.serverTagId)
    .filter((id): id is number => id !== null);

  const toAdd = serverTagIds.filter((id) => !existingServerTagIds.includes(id));
  const toRemove = existingTags.filter(
    (t) => t.serverTagId && !serverTagIds.includes(t.serverTagId)
  );

  for (const serverTagId of toAdd) {
    const tags = await tagsCollection
      .query(Q.where('server_id', serverTagId))
      .fetch();

    if (tags[0]) {
      await userBookTagsCollection.create((record) => {
        record.userBookId = userBook.id;
        record.tagId = tags[0].id;
        record.serverUserBookId = userBook.serverId;
        record.serverTagId = serverTagId;
      });
    }
  }

  for (const tagToRemove of toRemove) {
    await tagToRemove.destroyPermanently();
  }
}

async function createOrUpdateReadThrough(
  collection: ReturnType<typeof database.get<ReadThrough>>,
  userBooksCollection: ReturnType<typeof database.get<UserBook>>,
  serverReadThrough: ServerReadThrough
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverReadThrough.id))
    .fetch();

  const userBook = await userBooksCollection
    .query(Q.where('server_id', serverReadThrough.user_book_id))
    .fetch();

  if (!userBook[0]) {
    return;
  }

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.userBookId = userBook[0].id;
      record.serverUserBookId = serverReadThrough.user_book_id;
      record.readNumber = serverReadThrough.read_number;
      record.status = serverReadThrough.status as BookStatus;
      record.rating = serverReadThrough.rating;
      record.review = serverReadThrough.review;
      record.isDnf = serverReadThrough.is_dnf;
      record.dnfReason = serverReadThrough.dnf_reason;
      (record as any).startedAt = serverReadThrough.started_at
        ? new Date(serverReadThrough.started_at)
        : null;
      (record as any).finishedAt = serverReadThrough.finished_at
        ? new Date(serverReadThrough.finished_at)
        : null;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverReadThrough.id;
      record.userBookId = userBook[0].id;
      record.serverUserBookId = serverReadThrough.user_book_id;
      record.readNumber = serverReadThrough.read_number;
      record.status = serverReadThrough.status as BookStatus;
      record.rating = serverReadThrough.rating;
      record.review = serverReadThrough.review;
      record.isDnf = serverReadThrough.is_dnf;
      record.dnfReason = serverReadThrough.dnf_reason;
      (record as any).startedAt = serverReadThrough.started_at
        ? new Date(serverReadThrough.started_at)
        : null;
      (record as any).finishedAt = serverReadThrough.finished_at
        ? new Date(serverReadThrough.finished_at)
        : null;
      record.isPendingSync = false;
      record.isDeleted = false;
    });
  }
}

async function createOrUpdateSession(
  collection: ReturnType<typeof database.get<ReadingSession>>,
  userBooksCollection: ReturnType<typeof database.get<UserBook>>,
  readThroughsCollection: ReturnType<typeof database.get<ReadThrough>>,
  serverSession: ServerSession
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverSession.id))
    .fetch();

  const userBook = await userBooksCollection
    .query(Q.where('server_id', serverSession.user_book_id))
    .fetch();

  if (!userBook[0]) {
    return;
  }

  let readThrough: ReadThrough | null = null;
  if (serverSession.read_through_id) {
    const readThroughs = await readThroughsCollection
      .query(Q.where('server_id', serverSession.read_through_id))
      .fetch();
    readThrough = readThroughs[0] ?? null;
  }

  if (existing[0]) {
    return;
  }

  await collection.create((record) => {
    record.serverId = serverSession.id;
    record.userBookId = userBook[0].id;
    record.serverUserBookId = serverSession.user_book_id;
    record.readThroughId = readThrough?.id ?? null;
    record.serverReadThroughId = serverSession.read_through_id;
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

async function createOrUpdateTag(
  collection: ReturnType<typeof database.get<Tag>>,
  serverTag: ServerTag
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverTag.id))
    .fetch();

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.name = serverTag.name;
      record.slug = serverTag.slug;
      record.color = serverTag.color;
      record.isSystem = serverTag.is_system;
      record.sortOrder = serverTag.sort_order;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverTag.id;
      record.name = serverTag.name;
      record.slug = serverTag.slug;
      record.color = serverTag.color;
      record.isSystem = serverTag.is_system;
      record.sortOrder = serverTag.sort_order;
      record.isPendingSync = false;
      record.isDeleted = false;
    });
  }
}

async function createOrUpdatePreference(
  collection: ReturnType<typeof database.get<UserPreference>>,
  serverPref: ServerPreference
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverPref.id))
    .fetch();

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.category = serverPref.category as PreferenceCategory;
      record.type = serverPref.type as PreferenceType;
      record.value = serverPref.value;
      record.normalized = serverPref.normalized;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverPref.id;
      record.category = serverPref.category as PreferenceCategory;
      record.type = serverPref.type as PreferenceType;
      record.value = serverPref.value;
      record.normalized = serverPref.normalized;
      record.isPendingSync = false;
      record.isDeleted = false;
    });
  }
}

async function createOrUpdateGoal(
  collection: ReturnType<typeof database.get<ReadingGoal>>,
  serverGoal: ServerGoal
): Promise<void> {
  const existing = await collection
    .query(Q.where('server_id', serverGoal.id))
    .fetch();

  if (existing[0]) {
    if (existing[0].isPendingSync) {
      return;
    }

    await existing[0].update((record) => {
      record.type = serverGoal.type as GoalType;
      record.period = serverGoal.period as GoalPeriod;
      record.target = serverGoal.target;
      record.year = serverGoal.year;
      record.month = serverGoal.month;
      record.week = serverGoal.week;
      record.isActive = serverGoal.is_active;
      (record as any).completedAt = serverGoal.completed_at
        ? new Date(serverGoal.completed_at)
        : null;
    });
  } else {
    await collection.create((record) => {
      record.serverId = serverGoal.id;
      record.type = serverGoal.type as GoalType;
      record.period = serverGoal.period as GoalPeriod;
      record.target = serverGoal.target;
      record.year = serverGoal.year;
      record.month = serverGoal.month;
      record.week = serverGoal.week;
      record.isActive = serverGoal.is_active;
      (record as any).completedAt = serverGoal.completed_at
        ? new Date(serverGoal.completed_at)
        : null;
      record.isPendingSync = false;
      record.isDeleted = false;
    });
  }
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
