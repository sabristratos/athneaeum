import { useEffect, useState, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { UserBook } from '@/database/models/UserBook';

export function useReadingSessions(userBookId?: string) {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionsCollection = database.get<ReadingSession>('reading_sessions');

    const query = userBookId
      ? sessionsCollection.query(
          Q.where('user_book_id', userBookId),
          Q.where('is_deleted', false),
          Q.sortBy('date', Q.desc)
        )
      : sessionsCollection.query(
          Q.where('is_deleted', false),
          Q.sortBy('date', Q.desc)
        );

    const subscription = query.observe().subscribe((result) => {
      setSessions(result);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [userBookId]);

  return { sessions, loading };
}

interface LogSessionData {
  userBookId: string;
  date: string;
  pagesRead: number;
  startPage: number;
  endPage: number;
  durationSeconds?: number;
  notes?: string;
}

export function useLogSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logSession = useCallback(async (data: LogSessionData) => {
    setLoading(true);
    setError(null);

    try {
      let sessionId: string | null = null;

      await database.write(async () => {
        const sessionsCollection =
          database.get<ReadingSession>('reading_sessions');
        const userBooksCollection = database.get<UserBook>('user_books');

        // Get the userBook to find server_user_book_id
        const userBook = await userBooksCollection.find(data.userBookId);

        // Create session
        const session = await sessionsCollection.create((record) => {
          record.userBookId = data.userBookId;
          record.serverUserBookId = userBook.serverId;
          record.sessionDate = data.date;
          record.pagesRead = data.pagesRead;
          record.startPage = data.startPage;
          record.endPage = data.endPage;
          record.durationSeconds = data.durationSeconds || null;
          record.notes = data.notes || null;
          record.isPendingSync = true;
          record.isDeleted = false;
        });

        // Update userBook's current page
        await userBook.update((record) => {
          record.currentPage = data.endPage;
          record.isPendingSync = true;
        });

        sessionId = session.id;
      });

      scheduleSyncAfterMutation();
      return sessionId;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to log session';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { logSession, loading, error };
}

export function useDeleteSession() {
  const [loading, setLoading] = useState(false);

  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true);

    try {
      await database.write(async () => {
        const session = await database
          .get<ReadingSession>('reading_sessions')
          .find(sessionId);
        await session.softDelete();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteSession, loading };
}

export function useSessionStats(userBookId?: string) {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPagesRead: 0,
    totalDurationSeconds: 0,
    averagePagesPerSession: 0,
    averageSessionDuration: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionsCollection = database.get<ReadingSession>('reading_sessions');

    const query = userBookId
      ? sessionsCollection.query(
          Q.where('user_book_id', userBookId),
          Q.where('is_deleted', false)
        )
      : sessionsCollection.query(Q.where('is_deleted', false));

    const subscription = query.observe().subscribe((sessions) => {
      const totalSessions = sessions.length;
      const totalPagesRead = sessions.reduce(
        (sum, s) => sum + s.pagesRead,
        0
      );
      const totalDurationSeconds = sessions.reduce(
        (sum, s) => sum + (s.durationSeconds || 0),
        0
      );

      setStats({
        totalSessions,
        totalPagesRead,
        totalDurationSeconds,
        averagePagesPerSession:
          totalSessions > 0 ? Math.round(totalPagesRead / totalSessions) : 0,
        averageSessionDuration:
          totalSessions > 0
            ? Math.round(totalDurationSeconds / totalSessions)
            : 0,
      });
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [userBookId]);

  return { stats, loading };
}
