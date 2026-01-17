import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { apiClient } from '@/api/client';
import { toISODateString } from '@/utils/dateUtils';
import type { Book } from '@/database/models/Book';
import type { UserBook } from '@/database/models/UserBook';
import type { ReadThrough } from '@/database/models/ReadThrough';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { Series } from '@/database/models/Series';
import type { Tag } from '@/database/models/Tag';
import type { UserPreference } from '@/database/models/UserPreference';
import type { ReadingGoal } from '@/database/models/ReadingGoal';
import type { UserBookTag } from '@/database/models/UserBookTag';
import type {
  PushPayload,
  PushResponse,
  BookPayload,
  UserBookPayload,
  ReadThroughPayload,
  SessionPayload,
  SeriesPayload,
  TagPayload,
  PreferencePayload,
  GoalPayload,
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

function transformUserBookForPush(
  userBook: UserBook,
  tagIds?: number[]
): UserBookPayload {
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
    tag_ids: tagIds,
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

function transformTagForPush(tag: Tag): TagPayload {
  return {
    local_id: tag.id,
    server_id: tag.serverId ?? undefined,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    is_system: tag.isSystem,
    sort_order: tag.sortOrder,
  };
}

function transformPreferenceForPush(pref: UserPreference): PreferencePayload {
  return {
    local_id: pref.id,
    server_id: pref.serverId ?? undefined,
    category: pref.category,
    type: pref.type,
    value: pref.value,
    normalized: pref.normalized,
  };
}

function transformGoalForPush(goal: ReadingGoal): GoalPayload {
  return {
    local_id: goal.id,
    server_id: goal.serverId ?? undefined,
    type: goal.type,
    period: goal.period,
    target: goal.target,
    year: goal.year,
    month: goal.month,
    week: goal.week,
    is_active: goal.isActive,
    completed_at: goal.completedAt ? goal.completedAt.toISOString() : null,
  };
}

function transformSeriesForPush(series: Series): SeriesPayload {
  return {
    local_id: series.id,
    server_id: series.serverId ?? undefined,
    title: series.title,
    author: series.author,
    external_id: series.externalId,
    external_provider: series.externalProvider,
    total_volumes: series.totalVolumes,
    is_complete: series.isComplete,
    description: series.description,
  };
}

export async function pushChanges(): Promise<PushResponse> {
  const booksCollection = database.get<Book>('books');
  const userBooksCollection = database.get<UserBook>('user_books');
  const readThroughsCollection = database.get<ReadThrough>('read_throughs');
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');
  const seriesCollection = database.get<Series>('series');
  const tagsCollection = database.get<Tag>('tags');
  const preferencesCollection = database.get<UserPreference>('user_preferences');
  const goalsCollection = database.get<ReadingGoal>('reading_goals');

  const pendingBooks = await booksCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingUserBooks = await userBooksCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const userBookTagsCollection = database.get<UserBookTag>('user_book_tags');
  const userBookIds = pendingUserBooks.map((ub) => ub.id);
  const allUserBookTags =
    userBookIds.length > 0
      ? await userBookTagsCollection
          .query(Q.where('user_book_id', Q.oneOf(userBookIds)))
          .fetch()
      : [];

  const userBookTagsMap = new Map<string, number[]>();
  for (const ubt of allUserBookTags) {
    if (ubt.serverTagId) {
      const existing = userBookTagsMap.get(ubt.userBookId) || [];
      existing.push(ubt.serverTagId);
      userBookTagsMap.set(ubt.userBookId, existing);
    }
  }

  const pendingReadThroughs = await readThroughsCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingSessions = await sessionsCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingSeries = await seriesCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingTags = await tagsCollection
    .query(
      Q.where('is_pending_sync', true),
      Q.where('is_deleted', false),
      Q.where('is_system', false)
    )
    .fetch();

  const pendingPreferences = await preferencesCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const pendingGoals = await goalsCollection
    .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
    .fetch();

  const deletedUserBooks = await userBooksCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedReadThroughs = await readThroughsCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedSessions = await sessionsCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedSeries = await seriesCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedTags = await tagsCollection
    .query(
      Q.where('is_deleted', true),
      Q.where('is_pending_sync', true),
      Q.where('is_system', false)
    )
    .fetch();

  const deletedPreferences = await preferencesCollection
    .query(Q.where('is_deleted', true), Q.where('is_pending_sync', true))
    .fetch();

  const deletedGoals = await goalsCollection
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
        .map((ub) => transformUserBookForPush(ub, userBookTagsMap.get(ub.id))),
      updated: pendingUserBooks
        .filter((ub) => ub.serverId)
        .map((ub) => transformUserBookForPush(ub, userBookTagsMap.get(ub.id))),
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
    series: {
      created: pendingSeries
        .filter((s) => !s.serverId)
        .map(transformSeriesForPush),
      updated: pendingSeries
        .filter((s) => s.serverId)
        .map(transformSeriesForPush),
      deleted: deletedSeries
        .filter((s) => s.serverId)
        .map((s) => s.serverId!),
    },
    tags: {
      created: pendingTags
        .filter((t) => !t.serverId)
        .map(transformTagForPush),
      updated: pendingTags
        .filter((t) => t.serverId)
        .map(transformTagForPush),
      deleted: deletedTags
        .filter((t) => t.serverId)
        .map((t) => t.serverId!),
    },
    user_preferences: {
      created: pendingPreferences
        .filter((p) => !p.serverId)
        .map(transformPreferenceForPush),
      updated: pendingPreferences
        .filter((p) => p.serverId)
        .map(transformPreferenceForPush),
      deleted: deletedPreferences
        .filter((p) => p.serverId)
        .map((p) => p.serverId!),
    },
    reading_goals: {
      created: pendingGoals
        .filter((g) => !g.serverId)
        .map(transformGoalForPush),
      updated: pendingGoals
        .filter((g) => g.serverId)
        .map(transformGoalForPush),
      deleted: deletedGoals
        .filter((g) => g.serverId)
        .map((g) => g.serverId!),
    },
  };

  const hasChanges =
    payload.books.created.length > 0 ||
    payload.books.updated.length > 0 ||
    payload.user_books.created.length > 0 ||
    payload.user_books.updated.length > 0 ||
    payload.user_books.deleted.length > 0 ||
    payload.read_throughs.created.length > 0 ||
    payload.read_throughs.updated.length > 0 ||
    payload.read_throughs.deleted.length > 0 ||
    payload.reading_sessions.created.length > 0 ||
    payload.reading_sessions.updated.length > 0 ||
    payload.reading_sessions.deleted.length > 0 ||
    payload.series.created.length > 0 ||
    payload.series.updated.length > 0 ||
    payload.series.deleted.length > 0 ||
    payload.tags.created.length > 0 ||
    payload.tags.updated.length > 0 ||
    payload.tags.deleted.length > 0 ||
    payload.user_preferences.created.length > 0 ||
    payload.user_preferences.updated.length > 0 ||
    payload.user_preferences.deleted.length > 0 ||
    payload.reading_goals.created.length > 0 ||
    payload.reading_goals.updated.length > 0 ||
    payload.reading_goals.deleted.length > 0;

  if (!hasChanges) {
    return {
      status: 'success',
      id_mappings: {
        books: [],
        user_books: [],
        read_throughs: [],
        reading_sessions: [],
        series: [],
        tags: [],
        user_preferences: [],
        reading_goals: [],
      },
      counts: {
        books: 0,
        user_books: 0,
        read_throughs: 0,
        reading_sessions: 0,
        series: 0,
        tags: 0,
        user_preferences: 0,
        reading_goals: 0,
      },
      skipped: { user_books: [], read_throughs: [], reading_sessions: [] },
      timestamp: Date.now(),
    };
  }

  const response = await apiClient<PushResponse>('/sync/push', {
    method: 'POST',
    body: payload as unknown as Record<string, unknown>,
  });

  await database.write(async () => {
    for (const mapping of response.id_mappings.books) {
      const book = pendingBooks.find((b) => b.id === mapping.local_id);
      if (book) {
        await book.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

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

    for (const mapping of response.id_mappings.series ?? []) {
      const series = pendingSeries.find((s) => s.id === mapping.local_id);
      if (series) {
        await series.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

    for (const mapping of response.id_mappings.tags ?? []) {
      const tag = pendingTags.find((t) => t.id === mapping.local_id);
      if (tag) {
        await tag.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

    for (const mapping of response.id_mappings.user_preferences ?? []) {
      const pref = pendingPreferences.find((p) => p.id === mapping.local_id);
      if (pref) {
        await pref.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

    for (const mapping of response.id_mappings.reading_goals ?? []) {
      const goal = pendingGoals.find((g) => g.id === mapping.local_id);
      if (goal) {
        await goal.update((record) => {
          record.serverId = mapping.server_id;
          record.isPendingSync = false;
        });
      }
    }

    for (const ub of deletedUserBooks.filter((ub) => ub.serverId)) {
      await ub.destroyPermanently();
    }
    for (const rt of deletedReadThroughs.filter((rt) => rt.serverId)) {
      await rt.destroyPermanently();
    }
    for (const s of deletedSessions.filter((s) => s.serverId)) {
      await s.destroyPermanently();
    }
    for (const s of deletedSeries.filter((s) => s.serverId)) {
      await s.destroyPermanently();
    }
    for (const t of deletedTags.filter((t) => t.serverId)) {
      await t.destroyPermanently();
    }
    for (const p of deletedPreferences.filter((p) => p.serverId)) {
      await p.destroyPermanently();
    }
    for (const g of deletedGoals.filter((g) => g.serverId)) {
      await g.destroyPermanently();
    }
  });

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
