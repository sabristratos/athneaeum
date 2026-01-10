import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { schema } from '@/database/schema';
import { migrations } from '@/database/migrations';
import { Book, UserBook, ReadingSession, SyncMetadata } from '@/database/models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  jsi: false, // JSI requires native compilation, not available in Expo Go
  onSetUpError: (error) => {
    if (__DEV__) {
      console.error('[Database] Setup error:', error);
    }
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Book, UserBook, ReadingSession, SyncMetadata],
});

export { Book, UserBook, ReadingSession, SyncMetadata };
