import React, { memo, useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { ThemeName } from '@/types/theme';
import type { CalendarDay } from '@/types/stats';

interface CalendarDayCellProps {
  day: CalendarDay | null;
  dayNumber: number | null;
  size: number;
  onPress?: (day: CalendarDay) => void;
  isToday?: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function generateIntensityColors(
  primaryColor: string,
  surfaceColor: string,
  isDark: boolean
): string[] {
  const primary = hexToRgb(primaryColor);
  const surface = hexToRgb(surfaceColor);

  if (!primary || !surface) {
    return ['transparent', primaryColor, primaryColor, primaryColor, primaryColor];
  }

  if (isDark) {
    const opacities = [0.1, 0.3, 0.5, 0.7, 0.9];
    return opacities.map(
      (opacity) =>
        `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${opacity})`
    );
  } else {
    const opacities = [0.08, 0.2, 0.4, 0.6, 0.85];
    return opacities.map(
      (opacity) =>
        `rgba(${primary.r}, ${primary.g}, ${primary.b}, ${opacity})`
    );
  }
}

export const CalendarDayCell = memo(function CalendarDayCell({
  day,
  dayNumber,
  size,
  onPress,
  isToday = false,
}: CalendarDayCellProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const intensityColors = useMemo(
    () => generateIntensityColors(theme.colors.primary, theme.colors.surface, theme.isDark),
    [theme.colors.primary, theme.colors.surface, theme.isDark]
  );

  const backgroundColor = useMemo(() => {
    if (!day) return 'transparent';
    return intensityColors[day.intensity] || 'transparent';
  }, [day, intensityColors]);

  const hasActivity = day && (day.sessions.length > 0 || day.books_completed.length > 0);
  const booksCompleted = day?.books_completed ?? [];

  const sessionBooks = useMemo(() => {
    if (!day?.sessions.length) return [];
    const seen = new Set<number>();
    return day.sessions
      .filter((s) => {
        if (seen.has(s.user_book_id)) return false;
        seen.add(s.user_book_id);
        return true;
      })
      .map((s) => ({
        id: s.user_book_id,
        title: s.book_title,
        author: s.book_author,
        cover_url: s.cover_url,
      }));
  }, [day?.sessions]);

  const allBooks = useMemo(() => {
    const completedIds = new Set(booksCompleted.map((b) => b.id));
    const readingBooks = sessionBooks.filter((b) => !completedIds.has(b.id));
    return [...booksCompleted, ...readingBooks];
  }, [booksCompleted, sessionBooks]);

  const showCovers = allBooks.length > 0;

  const handlePress = () => {
    if (day && hasActivity && onPress) {
      onPress(day);
    }
  };

  if (dayNumber === null) {
    return <View style={[styles.cell, { width: size, height: size }]} />;
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={!hasActivity}
      haptic="light"
      style={[
        styles.cell,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: isScholar ? theme.radii.xs : theme.radii.sm,
        },
        isToday && {
          borderWidth: 2,
          borderColor: theme.colors.primary,
        },
      ]}
      accessibilityLabel={`${dayNumber}${day?.pages_read ? `, ${day.pages_read} pages read` : ''}${showCovers ? `, ${allBooks.length} book${allBooks.length > 1 ? 's' : ''} read` : ''}`}
      accessibilityHint={hasActivity ? 'Tap to view day details' : undefined}
    >
      {showCovers ? (
        <>
          <View style={[styles.coversContainerLarge, { width: size - 4, height: size - 4 }]}>
            {allBooks.slice(0, 2).map((book, index) => {
              const coverHeight = size - 4;
              const coverWidth = Math.round(coverHeight * 0.65);
              return (
                <View
                  key={book.id}
                  style={[
                    styles.coverWrapperLarge,
                    {
                      left: index * (coverWidth * 0.3),
                      zIndex: 2 - index,
                    },
                  ]}
                >
                  {book.cover_url ? (
                    <Image
                      source={{ uri: book.cover_url }}
                      style={{
                        width: coverWidth,
                        height: coverHeight,
                        borderRadius: isScholar ? 2 : 3,
                      }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: coverWidth,
                        height: coverHeight,
                        backgroundColor: theme.colors.surfaceAlt,
                        borderRadius: isScholar ? 2 : 3,
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
          <View
            style={[
              styles.dayBadge,
              {
                backgroundColor: theme.colors.canvas + 'E6',
                borderRadius: isScholar ? 2 : 4,
              },
            ]}
          >
            <Text
              style={{
                color: theme.colors.foreground,
                fontSize: 9,
                fontWeight: '600',
                fontFamily: theme.fonts.body,
              }}
            >
              {dayNumber}
            </Text>
          </View>
          {allBooks.length > 2 && (
            <View
              style={[
                styles.moreIndicator,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontSize: 8,
                  fontWeight: '600',
                }}
              >
                +{allBooks.length - 2}
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text
          style={[
            styles.dayNumber,
            {
              color: day?.intensity && day.intensity > 0
                ? theme.isDark ? theme.colors.onPrimary : theme.colors.foreground
                : theme.colors.foregroundMuted,
              fontSize: 12,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {dayNumber}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coversContainerLarge: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
  coverWrapperLarge: {
    position: 'absolute',
  },
  dayBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  moreIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    textAlign: 'center',
  },
});
