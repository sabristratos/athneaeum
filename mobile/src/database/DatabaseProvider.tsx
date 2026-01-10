import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
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
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  const triggerSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await syncWithServer();
      if (result.status === 'success' && result.pulledAt) {
        setLastSyncAt(result.pulledAt);
      }
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        await database.adapter.getLocal('_init_check');
        setIsReady(true);
        setupAutoSync();
        triggerSync();
      } catch (error) {
        if (__DEV__) {
          console.error('[DatabaseProvider] Init error:', error);
        }
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

  if (!isReady) {
    return null;
  }

  return (
    <DatabaseContext.Provider
      value={{ database, isReady, isSyncing, lastSyncAt, triggerSync }}
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
    lastSyncAt: context.lastSyncAt,
    triggerSync: context.triggerSync,
  };
}
