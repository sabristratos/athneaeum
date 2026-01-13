import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
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

export { Book, Series, Tag, UserBook, UserBookTag, ReadThrough, ReadingSession, SyncMetadata, UserPreference, ReadingGoal };
