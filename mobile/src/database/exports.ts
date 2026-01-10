// Database instance
export { database, Book, UserBook, ReadingSession, SyncMetadata } from '@/database/index';

// Provider and hooks
export {
  DatabaseProvider,
  useDatabase,
  useDatabaseReady,
  useSync,
} from '@/database/DatabaseProvider';

// Library hooks
export {
  useLibrary,
  useUserBook,
  useAddToLibrary,
  useRemoveFromLibrary,
  useUpdateUserBook,
  type LibraryBook,
} from '@/database/hooks/useLibrary';

// Session hooks
export {
  useReadingSessions,
  useLogSession,
  useDeleteSession,
  useSessionStats,
} from '@/database/hooks/useSessions';

// Cover hooks
export { useCustomCover } from '@/database/hooks/useCover';

// Sync utilities
export {
  syncWithServer,
  setupAutoSync,
  teardownAutoSync,
  scheduleSyncAfterMutation,
  pickAndSaveCover,
  deleteCover,
} from '@/database/sync';

export type { SyncResult } from '@/database/sync';
