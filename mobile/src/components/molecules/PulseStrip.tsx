import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { PulseDot, Text, type DayLabel } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations';
import type { RecentSession } from '@/types/book';

export interface PulseStripProps {
  recentSessions: RecentSession[];
  streakDays: number;
}

const DAYS: DayLabel[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface DayData {
  day: DayLabel;
  date: string;
  pagesRead: number;
  isActive: boolean;
  isToday: boolean;
}

function getWeekData(sessions: RecentSession[]): DayData[] {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sessionsByDate = new Map<string, number>();
  sessions.forEach((session) => {
    const dateKey = session.date.split('T')[0];
    const current = sessionsByDate.get(dateKey) || 0;
    sessionsByDate.set(dateKey, current + session.pages_read);
  });

  const weekData: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(date);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const pagesRead = sessionsByDate.get(dateStr) || 0;

    weekData.push({
      day: DAYS[i],
      date: dateStr,
      pagesRead,
      isActive: pagesRead > 0,
      isToday,
    });
  }

  return weekData;
}

function getConsecutiveRanges(weekData: DayData[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let currentStart: number | null = null;

  weekData.forEach((day, index) => {
    if (day.isActive) {
      if (currentStart === null) {
        currentStart = index;
      }
    } else {
      if (currentStart !== null) {
        ranges.push({ start: currentStart, end: index - 1 });
        currentStart = null;
      }
    }
  });

  if (currentStart !== null) {
    ranges.push({ start: currentStart, end: weekData.length - 1 });
  }

  return ranges;
}

export function PulseStrip({ recentSessions, streakDays }: PulseStripProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const tooltipOpacity = useSharedValue(0);

  const weekData = useMemo(
    () => getWeekData(recentSessions),
    [recentSessions]
  );

  const streakRanges = useMemo(
    () => getConsecutiveRanges(weekData),
    [weekData]
  );

  const activeDaysCount = weekData.filter((d) => d.isActive).length;

  const handleDayPress = useCallback(
    (day: DayData) => {
      setSelectedDay(day);
      tooltipOpacity.value = withSpring(1, SPRINGS.snappy);

      setTimeout(() => {
        tooltipOpacity.value = withTiming(0, { duration: 300 });
        setSelectedDay(null);
      }, 2000);
    },
    [tooltipOpacity]
  );

  const tooltipStyle = useAnimatedStyle(() => ({
    opacity: tooltipOpacity.value,
  }));

  const dotSize = 36;
  const gapSize = 8;
  const totalWidth = 7 * dotSize + 6 * gapSize;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="caption" muted>
          This Week
        </Text>
        {streakDays > 0 && (
          <View
            style={[
              styles.streakBadge,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderRadius: isScholar ? theme.radii.xs : theme.radii.full,
              },
            ]}
          >
            <Text
              variant="caption"
              color="primary"
              style={{ fontWeight: '600', fontSize: 11 }}
            >
              {streakDays} day streak
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.dotsContainer, { width: totalWidth }]}>
        {streakRanges.map((range) => (
          <View
            key={`${range.start}-${range.end}`}
            style={[
              styles.streakLine,
              {
                left: range.start * (dotSize + gapSize) + dotSize / 2,
                width:
                  (range.end - range.start) * (dotSize + gapSize) + 1,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        ))}

        <View style={styles.dotsRow}>
          {weekData.map((day, index) => (
            <PulseDot
              key={day.date}
              day={day.day}
              pagesRead={day.pagesRead}
              isActive={day.isActive}
              isToday={day.isToday}
              onPress={() => handleDayPress(day)}
              size={dotSize}
            />
          ))}
        </View>
      </View>

      {selectedDay && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
            },
            tooltipStyle,
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.foreground }}>
            {selectedDay.pagesRead > 0
              ? `${selectedDay.pagesRead} pages on ${formatDate(selectedDay.date)}`
              : `No reading on ${formatDate(selectedDay.date)}`}
          </Text>
        </Animated.View>
      )}

      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundMuted,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        {activeDaysCount}/7 days active
      </Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    width: '100%',
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  dotsContainer: {
    position: 'relative',
    height: 60,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  streakLine: {
    position: 'absolute',
    height: 2,
    top: 17,
    opacity: 0.4,
  },
  tooltip: {
    position: 'absolute',
    bottom: -30,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});
