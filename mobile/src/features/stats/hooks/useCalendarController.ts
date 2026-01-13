import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/stores/toastStore';
import type { CalendarDay, MonthlySummary } from '@/types/stats';

export function useCalendarController() {
  const today = new Date();
  const toast = useToast();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [isDayLogVisible, setIsDayLogVisible] = useState(false);
  const wrapCardRef = useRef<ViewShot>(null);

  const calendarQuery = useQuery({
    queryKey: queryKeys.stats.calendar(currentYear, currentMonth),
    queryFn: () => booksApi.getCalendar(currentYear, currentMonth),
    staleTime: 1000 * 60 * 5,
  });

  const calendarDays = useMemo(() => {
    if (!calendarQuery.data?.days) return [];
    return calendarQuery.data.days;
  }, [calendarQuery.data]);

  const monthlySummary = useMemo((): MonthlySummary | null => {
    if (!calendarQuery.data?.monthly_summaries?.length) return null;
    return calendarQuery.data.monthly_summaries[0] ?? null;
  }, [calendarQuery.data]);

  const monthLabel = useMemo(() => {
    const date = new Date(currentYear, currentMonth - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  const goToPreviousMonth = useCallback(() => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }, [currentMonth]);

  const canGoNext = useMemo(() => {
    const now = new Date();
    return !(currentYear === now.getFullYear() && currentMonth === now.getMonth() + 1);
  }, [currentYear, currentMonth]);

  const handleDayPress = useCallback((day: CalendarDay) => {
    if (day.sessions.length > 0 || day.books_completed.length > 0) {
      setSelectedDay(day);
      setIsDayLogVisible(true);
    }
  }, []);

  const closeDayLog = useCallback(() => {
    setIsDayLogVisible(false);
    setSelectedDay(null);
  }, []);

  const handleExportWrapCard = useCallback(async () => {
    try {
      const uri = await wrapCardRef.current?.capture?.();
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your reading wrap',
          });
        } else {
          toast.warning('Sharing is not available on this device');
        }
      }
    } catch (error) {
      toast.danger('Failed to export wrap card');
    }
  }, [toast]);

  const calendarGridData = useMemo(() => {
    if (!calendarDays.length) return [];

    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();

    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const grid: (CalendarDay | null)[] = [];

    for (let i = 0; i < startDayOfWeek; i++) {
      grid.push(null);
    }

    const daysByDate = new Map(calendarDays.map((d) => [d.date, d]));

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayData = daysByDate.get(dateStr);
      grid.push(dayData ?? {
        date: dateStr,
        local_date_string: dateStr,
        pages_read: 0,
        intensity: 0,
        sessions: [],
        books_completed: [],
      });
    }

    return grid;
  }, [calendarDays, currentYear, currentMonth]);

  return {
    currentYear,
    currentMonth,
    monthLabel,
    calendarDays,
    calendarGridData,
    monthlySummary,

    selectedDay,
    isDayLogVisible,
    closeDayLog,
    handleDayPress,

    goToPreviousMonth,
    goToNextMonth,
    canGoNext,

    wrapCardRef,
    handleExportWrapCard,

    isLoading: calendarQuery.isLoading,
    isRefreshing: calendarQuery.isFetching,
    isError: calendarQuery.isError,
    onRefresh: calendarQuery.refetch,
  };
}
