export {
  syncWithServer,
  setupAutoSync,
  teardownAutoSync,
  scheduleSyncAfterMutation,
  addSyncListener,
  isSyncInProgress,
} from '@/database/sync/syncAdapter';

export { pushChanges } from '@/database/sync/pushChanges';
export { pullChanges, getLastPulledAt } from '@/database/sync/pullChanges';
export {
  pickAndSaveCover,
  uploadPendingCovers,
  deleteCover,
  ensureCoverDirectory,
} from '@/database/sync/coverSync';

export type {
  SyncResult,
  SyncCounts,
  PushPayload,
  PushResponse,
  PullResponse,
} from '@/database/sync/types';
