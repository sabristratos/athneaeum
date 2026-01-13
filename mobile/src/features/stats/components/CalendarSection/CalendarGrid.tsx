import React, { memo, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { CalendarDayCell } from './CalendarDayCell';
import type { CalendarDay } from '@/types/stats';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const COLUMNS = 7;
const CELL_GAP = 4;

interface CalendarGridProps {
  gridData: (CalendarDay | null)[];
  onDayPress: (day: CalendarDay) => void;
}

export const CalendarGrid = memo(function CalendarGrid({
  gridData,
  onDayPress,
}: CalendarGridProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { width: screenWidth } = useWindowDimensions();

  const availableWidth = screenWidth - (theme.spacing.lg * 2);
  const totalGapWidth = CELL_GAP * (COLUMNS - 1);
  const cellSize = Math.floor((availableWidth - totalGapWidth) / COLUMNS);
  const gridWidth = (cellSize * COLUMNS) + totalGapWidth;

  const today = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const rows = useMemo(() => {
    const result: (CalendarDay | null)[][] = [];
    for (let i = 0; i < gridData.length; i += COLUMNS) {
      result.push(gridData.slice(i, i + COLUMNS));
    }
    return result;
  }, [gridData]);

  return (
    <View style={styles.container}>
      <View style={[styles.weekdayRow, { width: gridWidth }]}>
        {WEEKDAYS.map((day, index) => (
          <View
            key={day}
            style={[
              styles.weekdayCell,
              { width: cellSize, marginLeft: index > 0 ? CELL_GAP : 0 },
            ]}
          >
            <Text
              style={{
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
                fontSize: 11,
                textAlign: 'center',
                textTransform: isScholar ? 'uppercase' : 'none',
                letterSpacing: isScholar ? 0.5 : 0,
              }}
            >
              {isScholar ? day.charAt(0) : day}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.row, { width: gridWidth }]}>
          {row.map((day, colIndex) => {
            const globalIndex = rowIndex * COLUMNS + colIndex;
            const dayNumber = day ? parseInt(day.date.split('-')[2], 10) : null;

            return (
              <View
                key={globalIndex}
                style={{
                  width: cellSize,
                  height: cellSize,
                  marginLeft: colIndex > 0 ? CELL_GAP : 0,
                }}
              >
                {dayNumber !== null && (
                  <CalendarDayCell
                    day={day}
                    dayNumber={dayNumber}
                    size={cellSize}
                    onPress={onDayPress}
                    isToday={day?.date === today}
                  />
                )}
              </View>
            );
          })}
          {row.length < COLUMNS &&
            Array.from({ length: COLUMNS - row.length }).map((_, i) => (
              <View
                key={`empty-${i}`}
                style={{
                  width: cellSize,
                  height: cellSize,
                  marginLeft: CELL_GAP,
                }}
              />
            ))}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {},
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  weekdayCell: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: CELL_GAP,
  },
});
