import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  useLogSession,
  useDeleteSession,
  useUpdateSession,
  useReadingSessions as useLocalReadingSessions,
} from '@/database/hooks';
import { queryKeys } from '@/lib/queryKeys';
import type { ReadingSession } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'BookDetail'>;

interface SessionData {
  endPage: number;
  durationSeconds?: number;
  notes?: string;
  date: string;
}

interface ToastOptions {
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
}

interface UseBookDetailSessionsOptions {
  localUserBookId: string | null;
  currentPage: number;
  onShowError: (message: string) => void;
  onShowSuccess: (message: string, options?: ToastOptions) => void;
}

export function useBookDetailSessions({
  localUserBookId,
  currentPage,
  onShowError,
  onShowSuccess,
}: UseBookDetailSessionsOptions) {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ReadingSession | null>(null);

  const { logSession } = useLogSession();
  const { deleteSession } = useDeleteSession();
  const { updateSession } = useUpdateSession();
  const { sessions: localSessions, loading: sessionsLoading } = useLocalReadingSessions(
    localUserBookId ?? undefined
  );

  const sessions: ReadingSession[] = useMemo(() => {
    return localSessions.map((s) => ({
      id: s.serverId ?? 0,
      local_id: s.id,
      user_book_id: s.serverUserBookId ?? 0,
      read_through_id: s.serverReadThroughId ?? null,
      date: s.sessionDate,
      pages_read: s.pagesRead,
      start_page: s.startPage,
      end_page: s.endPage,
      duration_seconds: s.durationSeconds,
      notes: s.notes,
      formatted_duration: s.durationSeconds
        ? `${Math.floor(s.durationSeconds / 60)}m`
        : null,
      created_at: s.createdAt?.toISOString() ?? '',
      updated_at: s.updatedAt?.toISOString() ?? '',
    }));
  }, [localSessions]);

  const handleLogSession = useCallback(
    async (data: SessionData): Promise<void> => {
      if (!localUserBookId) return;

      const pagesRead = data.endPage - currentPage;

      try {
        await logSession({
          userBookId: localUserBookId,
          date: data.date,
          pagesRead,
          startPage: currentPage,
          endPage: data.endPage,
          durationSeconds: data.durationSeconds,
          notes: data.notes,
        });

        onShowSuccess('Session logged');
        navigation.setParams({
          userBook: {
            current_page: data.endPage,
          },
        } as any);

        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to log session';
        throw new Error(message);
      }
    },
    [localUserBookId, currentPage, logSession, onShowSuccess, navigation, queryClient]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number): Promise<void> => {
      const sessionToDelete = sessions.find((s) => s.id === sessionId);
      const localSessionId = (sessionToDelete as any)?.local_id;

      if (!sessionToDelete || !localSessionId || !localUserBookId) {
        onShowError('Session not found');
        return;
      }

      const savedSessionData = {
        userBookId: localUserBookId,
        date: sessionToDelete.date,
        pagesRead: sessionToDelete.pages_read,
        startPage: sessionToDelete.start_page,
        endPage: sessionToDelete.end_page,
        durationSeconds: sessionToDelete.duration_seconds ?? undefined,
        notes: sessionToDelete.notes ?? undefined,
      };

      try {
        await deleteSession(localSessionId);
        onShowSuccess('Session deleted', {
          action: {
            label: 'Undo',
            onPress: async () => {
              await logSession(savedSessionData);
              queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
            },
          },
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete session';
        onShowError(message);
      }
    },
    [sessions, localUserBookId, deleteSession, logSession, onShowError, onShowSuccess, queryClient]
  );

  const handleUpdateSession = useCallback(
    async (
      sessionId: number,
      data: { date?: string; pagesRead?: number; notes?: string | null }
    ): Promise<void> => {
      const sessionToUpdate = sessions.find((s) => s.id === sessionId);
      const localSessionId = (sessionToUpdate as any)?.local_id;

      if (!localSessionId) {
        onShowError('Session not found');
        return;
      }

      try {
        await updateSession(localSessionId, data);
        onShowSuccess('Session updated');
        setShowEditSessionModal(false);
        setEditingSession(null);
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update session';
        onShowError(message);
      }
    },
    [sessions, updateSession, onShowError, onShowSuccess, queryClient]
  );

  const handleOpenSessionModal = useCallback(() => setShowSessionModal(true), []);
  const handleCloseSessionModal = useCallback(() => setShowSessionModal(false), []);

  const handleOpenEditSession = useCallback((session: ReadingSession) => {
    setEditingSession(session);
    setShowEditSessionModal(true);
  }, []);

  const handleCloseEditSessionModal = useCallback(() => {
    setShowEditSessionModal(false);
    setEditingSession(null);
  }, []);

  return {
    sessions,
    sessionsLoading,
    showSessionModal,
    showEditSessionModal,
    editingSession,
    setEditingSession,
    handleLogSession,
    handleDeleteSession,
    handleUpdateSession,
    handleOpenSessionModal,
    handleCloseSessionModal,
    handleOpenEditSession,
    handleCloseEditSessionModal,
  };
}
