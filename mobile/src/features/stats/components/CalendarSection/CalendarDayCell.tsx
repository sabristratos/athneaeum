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

const INTENSITY_COLORS: Record<ThemeName, string[]> = {
  scholar: ['#2a2622', '#5c3d3d', '#8b4545', '#a33a3a', '#8b2e2e'],
  dreamer: ['#f0ebe3', '#c5d5c0', '#9ec49b', '#7ab377', '#5a9e55'],
  wanderer: ['#2a2420', '#5c4a35', '#8b6b45', '#b8860b', '#d4a017'],
  midnight: ['#1e293b', '#3730a3', '#4f46e5', '#6366f1', '#818cf8'],
};

export const CalendarDayCell = memo(function CalendarDayCell({
  day,
  dayNumber,
  size,
  onPress,
  isToday = false,
}: CalendarDayCellProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const backgroundColor = useMemo(() => {
    if (!day) return 'transparent';
    const colors = INTENSITY_COLORS[themeName] || INTENSITY_COLORS.scholar;
    return colors[day.intensity];
  }, [day, themeName]);

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
                ? themeName === 'dreamer' ? theme.colors.foreground : '#fff'
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
