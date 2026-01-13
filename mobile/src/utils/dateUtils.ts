export const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function daysAgo(date: Date | string): number {
  const compareDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return Math.floor((now.getTime() - compareDate.getTime()) / MS_PER_DAY);
}

export function isToday(date: Date): boolean {
  const today = startOfDay(new Date());
  const compareDate = startOfDay(date);
  return compareDate.getTime() === today.getTime();
}

export function formatTimeAgo(date: Date | null): string {
  if (!date) return '';
  const diffDays = daysAgo(date);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function formatRelativeDate(date: Date): string {
  const today = startOfDay(new Date());
  const compareDate = startOfDay(date);
  const diffDays = Math.floor((today.getTime() - compareDate.getTime()) / MS_PER_DAY);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatDateFromString(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return formatRelativeDate(date);
}

export function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
}

export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function durationToSeconds(hours: number, minutes: number): number {
  return hours * 3600 + minutes * 60;
}

export function secondsToDuration(totalSeconds: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { hours, minutes };
}

export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatShortDateWithYear(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatLongDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
