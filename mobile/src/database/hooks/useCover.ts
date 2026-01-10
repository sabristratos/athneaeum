import { useState, useCallback } from 'react';
import { pickAndSaveCover, deleteCover } from '@/database/sync/coverSync';
import { scheduleSyncAfterMutation } from '@/database/sync';

export function useCustomCover() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickCover = useCallback(async (userBookId: string) => {
    setLoading(true);
    setError(null);

    try {
      const localPath = await pickAndSaveCover(userBookId);
      if (localPath) {
        scheduleSyncAfterMutation();
      }
      return localPath;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to pick cover';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeCover = useCallback(async (userBookId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteCover(userBookId);
      scheduleSyncAfterMutation();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to remove cover';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { pickCover, removeCover, loading, error };
}
