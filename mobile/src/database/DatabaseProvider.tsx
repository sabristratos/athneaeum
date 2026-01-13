import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import {
  setupAutoSync,
  teardownAutoSync,
  syncWithServer,
} from '@/database/sync';
import type { Database } from '@nozbe/watermelondb';

interface DatabaseContextValue {
  database: Database;
  isReady: boolean;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  triggerSync: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const pendingCheckTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const updatePendingCount = useCallback(async () => {
    try {
      const userBooksPending = await database
        .get('user_books')
        .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
        .fetchCount();

      const sessionsPending = await database
        .get('reading_sessions')
        .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
        .fetchCount();

      const booksPending = await database
        .get('books')
        .query(Q.where('is_pending_sync', true), Q.where('is_deleted', false))
        .fetchCount();

      setPendingCount(userBooksPending + sessionsPending + booksPending);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncWithServer();
      if (result.status === 'success' && result.pulledAt) {
        setLastSyncAt(result.pulledAt);
      }
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  }, [isOnline, updatePendingCount]);

  useEffect(() => {
    async function init() {
      try {
        await database.adapter.getLocal('_init_check');
        setIsReady(true);
        setupAutoSync();
        triggerSync();
      } catch {
        setIsReady(true);
      }
    }
    init();

    return () => {
      teardownAutoSync();
    };
  }, [triggerSync]);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          triggerSync();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [triggerSync]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    updatePendingCount();

    pendingCheckTimer.current = setInterval(() => {
      updatePendingCount();
    }, 10000);

    return () => {
      if (pendingCheckTimer.current) {
        clearInterval(pendingCheckTimer.current);
      }
    };
  }, [updatePendingCount]);

  if (!isReady) {
    return null;
  }

  return (
    <DatabaseContext.Provider
      value={{ database, isReady, isSyncing, isOnline, pendingCount, lastSyncAt, triggerSync }}
    >
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase(): Database {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context.database;
}

export function useDatabaseReady(): boolean {
  const context = useContext(DatabaseContext);
  return context?.isReady ?? false;
}

export function useSync() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useSync must be used within a DatabaseProvider');
  }
  return {
    isSyncing: context.isSyncing,
    isOnline: context.isOnline,
    pendingCount: context.pendingCount,
    lastSyncAt: context.lastSyncAt,
    triggerSync: context.triggerSync,
  };
}
