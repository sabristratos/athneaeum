import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import type { UserBook } from '@/database/models/UserBook';
import type { ReadingSession } from '@/database/models/ReadingSession';
import type { ReadingGoal, GoalType, GoalPeriod } from '@/database/models/ReadingGoal';

export interface GoalProgress {
  goal: ReadingGoal;
  currentValue: number;
  progressPercentage: number;
  isCompleted: boolean;
  remaining: number;
  isOnTrack: boolean;
  periodStart: Date;
  periodEnd: Date;
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function getYearlyPeriod(year: number): PeriodRange {
  return {
    start: new Date(year, 0, 1, 0, 0, 0, 0),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export function getMonthlyPeriod(year: number, month: number): PeriodRange {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const lastDay = new Date(year, month, 0).getDate();
  const end = new Date(year, month - 1, lastDay, 23, 59, 59, 999);
  return { start, end };
}

export function getWeeklyPeriod(year: number, week: number): PeriodRange {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);

  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (week - 1) * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getDailyPeriod(date: Date = new Date()): PeriodRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getPeriodRange(goal: ReadingGoal): PeriodRange {
  switch (goal.period) {
    case 'yearly':
      return getYearlyPeriod(goal.year);
    case 'monthly':
      return getMonthlyPeriod(goal.year, goal.month ?? 1);
    case 'weekly':
      return getWeeklyPeriod(goal.year, goal.week ?? 1);
    case 'daily':
      return getDailyPeriod();
  }
}

function getElapsedFraction(period: PeriodRange): number {
  const now = new Date();
  const totalMs = period.end.getTime() - period.start.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - period.start.getTime(), totalMs));
  return elapsedMs / totalMs;
}

async function computeBooksGoal(period: PeriodRange): Promise<number> {
  const userBooksCollection = database.get<UserBook>('user_books');

  const startIso = period.start.toISOString();
  const endIso = period.end.toISOString();

  const completedBooks = await userBooksCollection
    .query(
      Q.where('status', 'read'),
      Q.where('is_deleted', false),
      Q.where('finished_at', Q.gte(period.start.getTime())),
      Q.where('finished_at', Q.lte(period.end.getTime()))
    )
    .fetch();

  return completedBooks.length;
}

async function computePagesGoal(period: PeriodRange): Promise<number> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');

  const startDate = formatDateForQuery(period.start);
  const endDate = formatDateForQuery(period.end);

  const sessions = await sessionsCollection
    .query(
      Q.where('is_deleted', false),
      Q.where('date', Q.gte(startDate)),
      Q.where('date', Q.lte(endDate))
    )
    .fetch();

  return sessions.reduce((total, session) => total + session.pagesRead, 0);
}

async function computeMinutesGoal(period: PeriodRange): Promise<number> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');

  const startDate = formatDateForQuery(period.start);
  const endDate = formatDateForQuery(period.end);

  const sessions = await sessionsCollection
    .query(
      Q.where('is_deleted', false),
      Q.where('date', Q.gte(startDate)),
      Q.where('date', Q.lte(endDate))
    )
    .fetch();

  const totalSeconds = sessions.reduce(
    (total, session) => total + (session.durationSeconds ?? 0),
    0
  );

  return Math.floor(totalSeconds / 60);
}

async function computeStreakGoal(): Promise<number> {
  const sessionsCollection = database.get<ReadingSession>('reading_sessions');

  const sessions = await sessionsCollection
    .query(Q.where('is_deleted', false), Q.sortBy('date', Q.desc))
    .fetch();

  if (sessions.length === 0) return 0;

  const uniqueDates = [...new Set(sessions.map((s) => s.sessionDate))].sort().reverse();

  if (uniqueDates.length === 0) return 0;

  const today = formatDateForQuery(new Date());
  const yesterday = formatDateForQuery(new Date(Date.now() - 24 * 60 * 60 * 1000));

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  let currentDate = parseQueryDate(uniqueDates[0]);

  for (let i = 1; i < uniqueDates.length; i++) {
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);

    const sessionDate = parseQueryDate(uniqueDates[i]);

    if (formatDateForQuery(sessionDate) === formatDateForQuery(previousDate)) {
      streak++;
      currentDate = sessionDate;
    } else {
      break;
    }
  }

  return streak;
}

function formatDateForQuery(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseQueryDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export async function computeGoalProgress(goal: ReadingGoal): Promise<GoalProgress> {
  const period = getPeriodRange(goal);

  let currentValue: number;

  switch (goal.type) {
    case 'books':
      currentValue = await computeBooksGoal(period);
      break;
    case 'pages':
      currentValue = await computePagesGoal(period);
      break;
    case 'minutes':
      currentValue = await computeMinutesGoal(period);
      break;
    case 'streak':
      currentValue = await computeStreakGoal();
      break;
    default:
      currentValue = 0;
  }

  const progressPercentage = Math.min(100, (currentValue / goal.target) * 100);
  const isCompleted = currentValue >= goal.target;
  const remaining = Math.max(0, goal.target - currentValue);

  const elapsedFraction = getElapsedFraction(period);
  const expectedValue = goal.target * elapsedFraction;
  const isOnTrack = currentValue >= expectedValue || isCompleted;

  return {
    goal,
    currentValue,
    progressPercentage,
    isCompleted,
    remaining,
    isOnTrack,
    periodStart: period.start,
    periodEnd: period.end,
  };
}

export async function computeAllGoalsProgress(
  goals: ReadingGoal[]
): Promise<GoalProgress[]> {
  return Promise.all(goals.map(computeGoalProgress));
}

export function getCurrentPeriodInfo(period: GoalPeriod): { year: number; month?: number; week?: number } {
  const now = new Date();
  const year = now.getFullYear();

  switch (period) {
    case 'yearly':
      return { year };
    case 'monthly':
      return { year, month: now.getMonth() + 1 };
    case 'weekly': {
      const jan4 = new Date(year, 0, 4);
      const dayOfWeek = jan4.getDay() || 7;
      const firstMonday = new Date(jan4);
      firstMonday.setDate(jan4.getDate() - dayOfWeek + 1);
      const diff = now.getTime() - firstMonday.getTime();
      const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;
      return { year, week };
    }
    case 'daily':
      return { year };
  }
}

export function formatPeriodLabel(goal: ReadingGoal): string {
  switch (goal.period) {
    case 'yearly':
      return `${goal.year}`;
    case 'monthly': {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return `${monthNames[(goal.month ?? 1) - 1]} ${goal.year}`;
    }
    case 'weekly':
      return `Week ${goal.week ?? 1}, ${goal.year}`;
    case 'daily':
      return 'Today';
  }
}

export function formatGoalUnit(type: GoalType, value: number): string {
  switch (type) {
    case 'books':
      return value === 1 ? 'book' : 'books';
    case 'pages':
      return value === 1 ? 'page' : 'pages';
    case 'minutes':
      return value === 1 ? 'minute' : 'minutes';
    case 'streak':
      return value === 1 ? 'day' : 'days';
  }
}
