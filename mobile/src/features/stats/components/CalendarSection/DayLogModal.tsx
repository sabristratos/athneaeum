import React, { memo, useMemo } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Calendar01Icon, Book01Icon, Time01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { BottomSheet } from '@/components/organisms/modals/BottomSheet';
import { useTheme } from '@/themes';
import type { CalendarDay } from '@/types/stats';

interface DayLogModalProps {
  visible: boolean;
  onClose: () => void;
  day: CalendarDay | null;
}

export const DayLogModal = memo(function DayLogModal({
  visible,
  onClose,
  day,
}: DayLogModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const formattedDate = useMemo(() => {
    if (!day) return '';
    const date = new Date(day.date + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [day]);

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (!day) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={formattedDate}
      headerIcon={Calendar01Icon}
      scrollable
      maxHeight="70%"
    >
      <View style={{ paddingBottom: theme.spacing.lg }}>
        <View
          style={[
            styles.summaryRow,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.lg,
            },
          ]}
        >
          <View style={styles.summaryItem}>
            <Text
              variant="h2"
              style={{ color: theme.colors.primary }}
            >
              {day.pages_read}
            </Text>
            <Text variant="caption" muted>
              pages read
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text
              variant="h2"
              style={{ color: theme.colors.foreground }}
            >
              {day.sessions.length}
            </Text>
            <Text variant="caption" muted>
              {day.sessions.length === 1 ? 'session' : 'sessions'}
            </Text>
          </View>
          {day.books_completed.length > 0 && (
            <View style={styles.summaryItem}>
              <Text
                variant="h2"
                style={{ color: theme.colors.success }}
              >
                {day.books_completed.length}
              </Text>
              <Text variant="caption" muted>
                {day.books_completed.length === 1 ? 'book finished' : 'books finished'}
              </Text>
            </View>
          )}
        </View>

        {day.books_completed.length > 0 && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'COMPLETED' : 'Completed'}
            </Text>
            {day.books_completed.map((book) => (
              <View
                key={book.id}
                style={[
                  styles.bookRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                    borderWidth: theme.borders.thin,
                    borderColor: theme.colors.border,
                    padding: theme.spacing.sm,
                    marginBottom: theme.spacing.xs,
                  },
                ]}
              >
                {book.cover_url ? (
                  <Image
                    source={{ uri: book.cover_url }}
                    style={[
                      styles.bookCover,
                      { borderRadius: isScholar ? theme.radii.xs : theme.radii.sm },
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.bookCover, styles.placeholderCover]}>
                    <Icon icon={Book01Icon} size={20} color={theme.colors.foregroundMuted} />
                  </View>
                )}
                <View style={styles.bookInfo}>
                  <Text variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
                    {book.title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {book.author}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {day.sessions.length > 0 && (
          <View>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'READING SESSIONS' : 'Reading Sessions'}
            </Text>
            {day.sessions.map((session) => (
              <View
                key={session.id}
                style={[
                  styles.bookRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                    borderWidth: theme.borders.thin,
                    borderColor: theme.colors.border,
                    padding: theme.spacing.sm,
                    marginBottom: theme.spacing.xs,
                  },
                ]}
              >
                {session.cover_url ? (
                  <Image
                    source={{ uri: session.cover_url }}
                    style={[
                      styles.bookCover,
                      { borderRadius: isScholar ? theme.radii.xs : theme.radii.sm },
                    ]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.bookCover, styles.placeholderCover]}>
                    <Icon icon={Book01Icon} size={20} color={theme.colors.foregroundMuted} />
                  </View>
                )}
                <View style={styles.bookInfo}>
                  <Text variant="body" numberOfLines={1} style={{ fontWeight: '600' }}>
                    {session.book_title}
                  </Text>
                  <Text variant="caption" muted numberOfLines={1}>
                    {session.book_author}
                  </Text>
                  <View style={[styles.sessionMeta, { marginTop: theme.spacing.xs }]}>
                    <Text variant="caption" style={{ color: theme.colors.primary }}>
                      {session.pages_read} pages
                    </Text>
                    {session.duration_seconds != null && session.duration_seconds > 0 && (
                      <>
                        <Text variant="caption" muted> · </Text>
                        <Icon icon={Time01Icon} size={12} color={theme.colors.foregroundMuted} />
                        <Text variant="caption" muted style={{ marginLeft: 2 }}>
                          {formatDuration(session.duration_seconds)}
                        </Text>
                      </>
                    )}
                  </View>
                  {session.notes && (
                    <Text
                      variant="caption"
                      muted
                      emphatic
                      numberOfLines={2}
                      style={{ marginTop: theme.spacing.xs }}
                    >
                      {session.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bookCover: {
    width: 40,
    height: 56,
  },
  placeholderCover: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
