import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { useTheme } from '@/themes';
import { StackedBook } from './StackedBook';
import { coverSizes } from '@/themes/shared';
import type { UserBook } from '@/types';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';

const STACK_OFFSET = 28;

interface TBRStackViewProps {
  books: UserBook[];
  onBookPress: (book: UserBook) => void;
  onStartReading?: (book: UserBook) => void;
  onReadLater?: (book: UserBook) => void;
  maxVisible?: number;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

/**
 * A TBR (To Be Read) stack view that displays books as a physical pile.
 * The top book can be swiped right to start reading.
 * Tapping a book pulls it out with animation and navigates to detail.
 */
export function TBRStackView({
  books,
  onBookPress,
  onStartReading,
  onReadLater,
  maxVisible = 4,
  ListEmptyComponent,
}: TBRStackViewProps) {
  const { theme } = useTheme();

  // Only show top N books in stack
  const visibleBooks = useMemo(
    () => books.slice(0, maxVisible),
    [books, maxVisible]
  );

  // Top book for info display
  const topBook = books[0] ?? null;

  // Handle swipe left to start reading
  const handleSwipeLeft = useCallback(
    (book: UserBook) => {
      onStartReading?.(book);
    },
    [onStartReading]
  );

  // Handle swipe right to push to back of queue
  const handleSwipeRight = useCallback(
    (book: UserBook) => {
      onReadLater?.(book);
    },
    [onReadLater]
  );

  // Handle Start Reading button press
  const handleStartReadingPress = useCallback(() => {
    if (topBook) {
      onStartReading?.(topBook);
    }
  }, [topBook, onStartReading]);

  // Calculate stack height based on number of books
  const stackHeight = useMemo(() => {
    const baseHeight = coverSizes.stack.height;
    const stackOffset = Math.min(visibleBooks.length - 1, maxVisible - 1) * STACK_OFFSET;
    return baseHeight + stackOffset;
  }, [visibleBooks.length, maxVisible]);

  if (books.length === 0 && ListEmptyComponent) {
    return <>{ListEmptyComponent}</>;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.container}
    >
      {/* Stack visualization */}
      <View style={[styles.stackContainer, { height: stackHeight }]}>
        {/* Render books in reverse order (bottom to top) */}
        {visibleBooks.slice().reverse().map((book, reverseIndex) => {
          const index = visibleBooks.length - 1 - reverseIndex;
          return (
            <StackedBook
              key={book.id}
              item={book}
              index={index}
              totalBooks={visibleBooks.length}
              onPress={onBookPress}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isTopBook={index === 0}
            />
          );
        })}
      </View>

      {/* Book info and actions */}
      <View style={styles.bottomSection}>
        {/* Book info */}
        {topBook && (
          <View style={styles.infoSection}>
            <Text
              variant="body"
              numberOfLines={2}
              style={{
                color: theme.colors.foreground,
                fontFamily: theme.fonts.heading,
                fontSize: 18,
                lineHeight: 24,
                textAlign: 'center',
              }}
            >
              {topBook.book.title}
            </Text>
            <Text
              variant="caption"
              numberOfLines={1}
              style={{
                color: theme.colors.foregroundMuted,
                marginTop: theme.spacing.xs,
                textAlign: 'center',
              }}
            >
              {topBook.book.author}
            </Text>
          </View>
        )}

        {/* Start Reading button */}
        {topBook && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Button variant="primary" size="md" onPress={handleStartReadingPress}>
              <Icon
                icon={BookOpen01Icon}
                size={18}
                color={theme.colors.onPrimary}
              />
              <Text
                variant="body"
                style={{
                  color: theme.colors.onPrimary,
                  fontFamily: theme.fonts.heading,
                  fontSize: 15,
                }}
              >
                Start Reading
              </Text>
            </Button>
          </View>
        )}

        {/* Remaining count + Instructions */}
        <View style={[styles.footer, { marginTop: theme.spacing.sm }]}>
          {books.length > maxVisible && (
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundSubtle }}
            >
              +{books.length - maxVisible} more in stack
            </Text>
          )}
          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundSubtle,
              textAlign: 'center',
              fontStyle: 'italic',
              marginTop: books.length > maxVisible ? theme.spacing.xs : 0,
            }}
          >
            Swipe left to start • Swipe right for later
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  stackContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 70,
    marginTop: 80,
  },
  infoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  footer: {
    alignItems: 'center',
  },
});
