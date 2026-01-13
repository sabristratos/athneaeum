import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, Pressable } from '@/components';
import { useTheme } from '@/themes';

interface ReadingCalendarProps {
  activeDates?: string[];
  onDatePress?: (date: string) => void;
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();

  const days: (number | null)[] = [];

  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return days;
}

function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function ReadingCalendar({ activeDates = [], onDatePress }: ReadingCalendarProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const activeDatesSet = useMemo(() => new Set(activeDates), [activeDates]);

  const days = useMemo(
    () => getCalendarDays(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const monthName = today.toLocaleDateString('en-US', { month: 'long' });

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Reading Calendar
      </Text>
      <Card variant="elevated" padding="md">
        <Text
          variant="label"
          style={{ textAlign: 'center', marginBottom: theme.spacing.sm }}
        >
          {monthName} {currentYear}
        </Text>

        {/* Weekday headers */}
        <View style={styles.weekRow}>
          {WEEKDAYS.map((day, index) => (
            <View key={index} style={styles.dayCell}>
              <Text
                variant="caption"
                muted
                style={{ textAlign: 'center', fontSize: 10 }}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarGrid}>
          {days.map((day, index) => {
            if (day === null) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const dateKey = formatDateKey(currentYear, currentMonth, day);
            const isActive = activeDatesSet.has(dateKey);
            const isToday = day === currentDay;

            return (
              <Pressable
                key={day}
                onPress={() => onDatePress?.(dateKey)}
                haptic="light"
                style={styles.dayCell}
              >
                <View
                  style={[
                    styles.dayContent,
                    {
                      borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                    },
                    isToday && {
                      borderWidth: 1,
                      borderColor: theme.colors.primary,
                    },
                    isActive && {
                      backgroundColor: theme.colors.tintPrimary,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      textAlign: 'center',
                      fontSize: 12,
                      color: isActive
                        ? theme.colors.primary
                        : isToday
                        ? theme.colors.primary
                        : theme.colors.foregroundMuted,
                      fontWeight: isActive || isToday ? '600' : '400',
                    }}
                  >
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {activeDates.length > 0 && (
          <View style={{ marginTop: theme.spacing.sm, alignItems: 'center' }}>
            <Text variant="caption" muted>
              {activeDates.length} reading {activeDates.length === 1 ? 'day' : 'days'} this month
            </Text>
          </View>
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
