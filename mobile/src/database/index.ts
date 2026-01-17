import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Q } from '@nozbe/watermelondb';
import { schema } from '@/database/schema';
import { migrations } from '@/database/migrations';
import { Book, Series, Tag, UserBook, UserBookTag, ReadThrough, ReadingSession, SyncMetadata, UserPreference, ReadingGoal } from '@/database/models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false,
  onSetUpError: () => {
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Book, Series, Tag, UserBook, UserBookTag, ReadThrough, ReadingSession, SyncMetadata, UserPreference, ReadingGoal],
});

export async function resetDatabase(): Promise<void> {
  console.log('[Database] Starting database reset...');

  await database.write(async () => {
    const collections = [
      'reading_sessions',
      'read_throughs',
      'user_book_tags',
      'user_books',
      'books',
      'series',
      'tags',
      'user_preferences',
      'reading_goals',
      'sync_metadata',
    ];

    for (const collectionName of collections) {
      try {
        const collection = database.get(collectionName);
        const allRecords = await collection.query().fetch();
        console.log(`[Database] Deleting ${allRecords.length} records from ${collectionName}`);
        for (const record of allRecords) {
          await record.destroyPermanently();
        }
      } catch (err) {
        console.error(`[Database] Error clearing ${collectionName}:`, err);
      }
    }
  });

  console.log('[Database] Database has been reset');
}

export async function clearSyncTimestamp(): Promise<void> {
  await database.write(async () => {
    const syncMetaCollection = database.get<SyncMetadata>('sync_metadata');
    const existing = await syncMetaCollection.query(Q.where('key', 'last_sync')).fetch();
    if (existing[0]) {
      await existing[0].update((record) => {
        record.lastPulledAt = 0;
        record.lastPushedAt = 0;
      });
    }
  });
  console.log('[Database] Sync timestamp cleared - next sync will pull all data');
}

export async function getDatabaseStats(): Promise<{
  books: number;
  userBooks: number;
  sessions: number;
  tags: number;
  goals: number;
}> {
  const books = await database.get<Book>('books').query().fetchCount();
  const userBooks = await database.get<UserBook>('user_books').query().fetchCount();
  const sessions = await database.get<ReadingSession>('reading_sessions').query().fetchCount();
  const tags = await database.get<Tag>('tags').query().fetchCount();
  const goals = await database.get<ReadingGoal>('reading_goals').query().fetchCount();

  return { books, userBooks, sessions, tags, goals };
}

export { Book, Series, Tag, UserBook, UserBookTag, ReadThrough, ReadingSession, SyncMetadata, UserPreference, ReadingGoal };
