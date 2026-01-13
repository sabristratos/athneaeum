import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { UserBook } from '@/database/models/UserBook';
import type { Book } from '@/database/models/Book';
import type {
  ReadingStats,
  PeriodStats,
  RecentSession,
  FormatVelocityData,
  FormatVelocityItem,
  MoodGenreItem,
  HeatmapData,
  HeatmapDay,
  ReadingRhythm,
  BookFormat,
} from '@/types';

function formatDuration(seconds: number): string | null {
  if (seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getStartOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateStreak(sessionDates: string[]): { current: number; longest: number } {
  if (sessionDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  const uniqueDates = [...new Set(sessionDates)].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatLocalDate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatLocalDate(yesterday);

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;

  if (uniqueDates[0] === todayStr || uniqueDates[0] === yesterdayStr) {
    currentStreak = 1;
    const startDate = new Date(uniqueDates[0]);

    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.floor(
        (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak);

  return { current: currentStreak, longest: longestStreak };
}

export async function calculateLocalStats(): Promise<ReadingStats> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');
  const userBooksCollection = database.get<UserBook>('user_books');
  const booksCollection = database.get<Book>('books');

  const allSessions = await sessionsCollection
    .query(Q.where('is_deleted', false), Q.sortBy('date', Q.desc))
    .fetch();

  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  const startOfMonth = getStartOfMonth(now);

  let totalPagesRead = 0;
  let totalReadingTimeSeconds = 0;
  const sessionDates: string[] = [];

  let weekPages = 0;
  let weekSessions = 0;
  let weekTime = 0;

  let monthPages = 0;
  let monthSessions = 0;
  let monthTime = 0;

  for (const session of allSessions) {
    totalPagesRead += session.pagesRead;
    totalReadingTimeSeconds += session.durationSeconds ?? 0;
    sessionDates.push(session.sessionDate.split('T')[0]);

    const sessionDate = new Date(session.sessionDate);

    if (sessionDate >= startOfWeek) {
      weekPages += session.pagesRead;
      weekSessions++;
      weekTime += session.durationSeconds ?? 0;
    }

    if (sessionDate >= startOfMonth) {
      monthPages += session.pagesRead;
      monthSessions++;
      monthTime += session.durationSeconds ?? 0;
    }
  }

  const totalSessions = allSessions.length;
  const avgPagesPerSession =
    totalSessions > 0 ? Math.round(totalPagesRead / totalSessions) : 0;
  const avgSessionDurationSeconds =
    totalSessions > 0 ? Math.round(totalReadingTimeSeconds / totalSessions) : 0;

  const { current: currentStreak, longest: longestStreak } =
    calculateStreak(sessionDates);

  const completedBooks = await userBooksCollection
    .query(Q.where('is_deleted', false), Q.where('status', 'read'))
    .fetchCount();

  const inProgressBooks = await userBooksCollection
    .query(Q.where('is_deleted', false), Q.where('status', 'reading'))
    .fetchCount();

  const recentRaw = allSessions.slice(0, 5);

  const userBookIds = recentRaw.map((s) => s.userBookId);
  const userBooks = await userBooksCollection
    .query(Q.where('id', Q.oneOf(userBookIds)))
    .fetch();
  const userBookMap = new Map(userBooks.map((ub) => [ub.id, ub]));

  const bookIds = userBooks.map((ub) => ub.bookId);
  const books = await booksCollection
    .query(Q.where('id', Q.oneOf(bookIds)))
    .fetch();
  const bookMap = new Map(books.map((b) => [b.id, b]));

  const recentSessions: RecentSession[] = [];
  for (const session of recentRaw) {
    const userBook = userBookMap.get(session.userBookId);
    if (!userBook) {
      console.warn(`[LocalStats] UserBook not found for session ${session.id}`);
      continue;
    }

    const book = bookMap.get(userBook.bookId);
    if (!book) {
      console.warn(`[LocalStats] Book not found for userBook ${userBook.id}`);
      continue;
    }

    recentSessions.push({
      id: parseInt(session.id, 10) || 0,
      date: session.sessionDate,
      pages_read: session.pagesRead,
      start_page: session.startPage,
      end_page: session.endPage,
      duration_seconds: session.durationSeconds,
      formatted_duration: formatDuration(session.durationSeconds ?? 0),
      notes: session.notes,
      book: {
        id: parseInt(book.id, 10) || 0,
        title: book.title,
        author: book.author,
        cover_url: book.coverUrl,
      },
    });
  }

  const thisWeek: PeriodStats = {
    pages_read: weekPages,
    sessions: weekSessions,
    reading_time_seconds: weekTime,
    reading_time_formatted: formatDuration(weekTime),
  };

  const thisMonth: PeriodStats = {
    pages_read: monthPages,
    sessions: monthSessions,
    reading_time_seconds: monthTime,
    reading_time_formatted: formatDuration(monthTime),
  };

  return {
    total_pages_read: totalPagesRead,
    total_sessions: totalSessions,
    total_reading_time_seconds: totalReadingTimeSeconds,
    total_reading_time_formatted: formatDuration(totalReadingTimeSeconds),
    books_completed: completedBooks,
    books_in_progress: inProgressBooks,
    current_streak_days: currentStreak,
    longest_streak_days: longestStreak,
    avg_pages_per_session: avgPagesPerSession,
    avg_session_duration_seconds: avgSessionDurationSeconds,
    avg_session_duration_formatted: formatDuration(avgSessionDurationSeconds),
    this_week: thisWeek,
    this_month: thisMonth,
    recent_sessions: recentSessions,
  };
}

const FORMAT_LABELS: Record<BookFormat, string> = {
  physical: 'Physical',
  ebook: 'E-book',
  audiobook: 'Audiobook',
};

export async function calculateFormatVelocity(): Promise<FormatVelocityData> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');
  const userBooksCollection = database.get<UserBook>('user_books');

  const sessions = await sessionsCollection
    .query(Q.where('is_deleted', false))
    .fetch();

  const userBookIds = [...new Set(sessions.map((s) => s.userBookId))];
  const userBooks = await userBooksCollection
    .query(Q.where('id', Q.oneOf(userBookIds)))
    .fetch();

  const userBookMap = new Map(userBooks.map((ub) => [ub.id, ub]));

  const formatData: Record<
    BookFormat,
    { totalPages: number; totalSeconds: number }
  > = {
    physical: { totalPages: 0, totalSeconds: 0 },
    ebook: { totalPages: 0, totalSeconds: 0 },
    audiobook: { totalPages: 0, totalSeconds: 0 },
  };

  for (const session of sessions) {
    const userBook = userBookMap.get(session.userBookId);
    if (!userBook?.format) continue;

    const format = userBook.format as BookFormat;
    if (formatData[format]) {
      formatData[format].totalPages += session.pagesRead;
      formatData[format].totalSeconds += session.durationSeconds ?? 0;
    }
  }

  const formats: FormatVelocityItem[] = [];
  let totalVelocity = 0;
  let velocityCount = 0;

  for (const format of Object.keys(formatData) as BookFormat[]) {
    const data = formatData[format];
    if (data.totalSeconds > 0) {
      const hours = data.totalSeconds / 3600;
      const pagesPerHour = Math.round(data.totalPages / hours);
      formats.push({
        format,
        label: FORMAT_LABELS[format],
        pages_per_hour: pagesPerHour,
        total_pages: data.totalPages,
        total_hours: Math.round(hours * 10) / 10,
      });
      totalVelocity += pagesPerHour;
      velocityCount++;
    }
  }

  formats.sort((a, b) => b.pages_per_hour - a.pages_per_hour);
  const fastestFormat = formats.length > 0 ? formats[0].format : null;
  const averageVelocity = velocityCount > 0 ? Math.round(totalVelocity / velocityCount) : 0;

  return {
    formats,
    fastest_format: fastestFormat,
    average_velocity: averageVelocity,
  };
}

export async function calculateGenreBreakdown(): Promise<MoodGenreItem[]> {
  const userBooksCollection = database.get<UserBook>('user_books');
  const booksCollection = database.get<Book>('books');

  const userBooks = await userBooksCollection
    .query(Q.where('is_deleted', false), Q.where('status', 'read'))
    .fetch();

  const bookIds = userBooks.map((ub) => ub.bookId);
  const books = await booksCollection.query(Q.where('id', Q.oneOf(bookIds))).fetch();

  const genreCounts: Record<string, number> = {};
  let totalGenres = 0;

  for (const book of books) {
    const genres = book.genres || [];
    for (const genre of genres) {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      totalGenres++;
    }
  }

  const items: MoodGenreItem[] = Object.entries(genreCounts)
    .map(([genre, count]) => ({
      genre,
      genre_key: genre.toLowerCase().replace(/\s+/g, '_'),
      count,
      percentage: totalGenres > 0 ? Math.round((count / totalGenres) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return items;
}

function determineReadingRhythm(days: HeatmapDay[]): { rhythm: ReadingRhythm; label: string } {
  const dayOfWeekCounts = new Array(7).fill(0);
  let weekdayPages = 0;
  let weekendPages = 0;

  for (const day of days) {
    if (day.pages_read === 0) continue;
    const date = new Date(day.date);
    const dow = date.getDay();
    dayOfWeekCounts[dow]++;

    if (dow === 0 || dow === 6) {
      weekendPages += day.pages_read;
    } else {
      weekdayPages += day.pages_read;
    }
  }

  const totalDays = days.filter((d) => d.pages_read > 0).length;
  if (totalDays === 0) {
    return { rhythm: 'balanced', label: 'Balanced Reader' };
  }

  const weekendDays = dayOfWeekCounts[0] + dayOfWeekCounts[6];
  const weekdayDays = totalDays - weekendDays;

  if (weekendDays > weekdayDays * 2) {
    return { rhythm: 'weekend_warrior', label: 'Weekend Warrior' };
  }

  if (weekdayDays > weekendDays * 3) {
    return { rhythm: 'weekday_devotee', label: 'Weekday Devotee' };
  }

  if (totalDays >= 25) {
    return { rhythm: 'daily_reader', label: 'Daily Reader' };
  }

  return { rhythm: 'balanced', label: 'Balanced Reader' };
}

export async function calculateHeatmapData(days = 365): Promise<HeatmapData> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');
  const userBooksCollection = database.get<UserBook>('user_books');

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = formatLocalDate(startDate);

  const sessions = await sessionsCollection
    .query(Q.where('is_deleted', false), Q.where('date', Q.gte(startDateStr)))
    .fetch();

  const dailyPages: Record<string, number> = {};
  let totalPages = 0;

  for (const session of sessions) {
    const dateKey = session.sessionDate.split('T')[0];
    dailyPages[dateKey] = (dailyPages[dateKey] || 0) + session.pagesRead;
    totalPages += session.pagesRead;
  }

  const maxPages = Math.max(...Object.values(dailyPages), 1);
  const heatmapDays: HeatmapDay[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = formatLocalDate(date);
    const pagesRead = dailyPages[dateStr] || 0;

    let intensity: 0 | 1 | 2 | 3 | 4 = 0;
    if (pagesRead > 0) {
      const ratio = pagesRead / maxPages;
      if (ratio >= 0.75) intensity = 4;
      else if (ratio >= 0.5) intensity = 3;
      else if (ratio >= 0.25) intensity = 2;
      else intensity = 1;
    }

    heatmapDays.push({ date: dateStr, pages_read: pagesRead, intensity });
  }

  const sessionDates = [...new Set(sessions.map((s) => s.sessionDate.split('T')[0]))];
  const { current, longest } = calculateStreak(sessionDates);

  const { rhythm, label } = determineReadingRhythm(heatmapDays);

  const completedBooks = await userBooksCollection
    .query(Q.where('is_deleted', false), Q.where('status', 'read'))
    .fetchCount();

  return {
    days: heatmapDays,
    longest_streak: longest,
    current_streak: current,
    reading_rhythm: rhythm,
    rhythm_label: label,
    total_active_days: Object.keys(dailyPages).length,
    total_pages_read: totalPages,
    total_pages_from_sessions: totalPages,
    total_books_completed: completedBooks,
  };
}
