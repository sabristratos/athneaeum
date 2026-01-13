import NetInfo from '@react-native-community/netinfo';
import { pushChanges } from '@/database/sync/pushChanges';
import { pullChanges, getLastPulledAt } from '@/database/sync/pullChanges';
import { uploadPendingCovers } from '@/database/sync/coverSync';
import { AuthenticationError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import type { SyncResult } from '@/database/sync/types';

let isSyncing = false;
let syncListeners: ((result: SyncResult) => void)[] = [];

export function addSyncListener(
  listener: (result: SyncResult) => void
): () => void {
  syncListeners.push(listener);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
}

function notifyListeners(result: SyncResult): void {
  syncListeners.forEach((listener) => listener(result));
}

export async function syncWithServer(): Promise<SyncResult> {
  if (isSyncing) {
    return { status: 'already_syncing' };
  }

  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    return { status: 'offline' };
  }

  isSyncing = true;

  try {
    // Phase 1: Upload any pending covers first
    await uploadPendingCovers();

    // Phase 2: Push local changes
    const pushResult = await pushChanges();

    // Phase 3: Pull server changes
    const lastPulledAt = await getLastPulledAt();
    const newTimestamp = await pullChanges(lastPulledAt);

    const result: SyncResult = {
      status: 'success',
      pushed: pushResult.counts,
      pulledAt: newTimestamp,
    };

    notifyListeners(result);
    return result;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      await useAuthStore.getState().clearAuth();
      const result: SyncResult = {
        status: 'error',
        error: 'Session expired. Please log in again.',
      };
      notifyListeners(result);
      return result;
    }

    const result: SyncResult = {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
    notifyListeners(result);
    return result;
  } finally {
    isSyncing = false;
  }
}

export function isSyncInProgress(): boolean {
  return isSyncing;
}

let unsubscribeNetInfo: (() => void) | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export function setupAutoSync(): void {
  if (unsubscribeNetInfo) {
    return;
  }

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      // Debounce to avoid rapid syncs on network flapping
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
      syncDebounceTimer = setTimeout(() => {
        syncWithServer();
      }, 1000);
    }
  });
}

export function teardownAutoSync(): void {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
}

let mutationSyncTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSyncAfterMutation(): void {
  // Debounce sync after mutations to batch rapid changes
  if (mutationSyncTimer) {
    clearTimeout(mutationSyncTimer);
  }
  mutationSyncTimer = setTimeout(() => {
    syncWithServer();
  }, 2000);
}
