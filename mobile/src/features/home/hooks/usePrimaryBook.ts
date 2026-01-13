import { useMemo } from 'react';
import type { UserBook, RecentSession } from '@/types/book';

export interface UsePrimaryBookResult {
  primaryBook: UserBook | null;
  isPinned: boolean;
}

export function usePrimaryBook(
  readingBooks: UserBook[],
  recentSessions: RecentSession[]
): UsePrimaryBookResult {
  return useMemo(() => {
    if (readingBooks.length === 0) {
      return { primaryBook: null, isPinned: false };
    }

    const pinnedBook = readingBooks.find((book) => book.is_pinned);
    if (pinnedBook) {
      return { primaryBook: pinnedBook, isPinned: true };
    }

    const sessionsByBookId = new Map<number, Date>();
    recentSessions.forEach((session) => {
      const bookId = session.book?.id;
      if (bookId) {
        const sessionDate = new Date(session.date);
        const existing = sessionsByBookId.get(bookId);
        if (!existing || sessionDate > existing) {
          sessionsByBookId.set(bookId, sessionDate);
        }
      }
    });

    let mostRecentBook: UserBook | null = null;
    let mostRecentDate: Date | null = null;

    for (const book of readingBooks) {
      const lastSession = sessionsByBookId.get(book.book_id);
      if (lastSession) {
        if (!mostRecentDate || lastSession > mostRecentDate) {
          mostRecentDate = lastSession;
          mostRecentBook = book;
        }
      }
    }

    if (mostRecentBook) {
      return { primaryBook: mostRecentBook, isPinned: false };
    }

    const sortedByUpdated = [...readingBooks].sort((a, b) => {
      const dateA = new Date(a.updated_at);
      const dateB = new Date(b.updated_at);
      return dateB.getTime() - dateA.getTime();
    });

    return { primaryBook: sortedByUpdated[0], isPinned: false };
  }, [readingBooks, recentSessions]);
}
