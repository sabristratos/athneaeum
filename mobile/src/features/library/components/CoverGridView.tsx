import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions, RefreshControl } from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { BookCoverCard, ShelfRow } from '@/components';
import { useTheme } from '@/themes';
import { useScrollPhysics, buildSectionBoundaries } from '@/hooks';
import type { UserBook } from '@/types';

interface CoverGridViewProps {
  books: UserBook[];
  onBookPress: (book: UserBook) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  numColumns?: number;
  showShelves?: boolean;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

/**
 * A grid view for displaying book covers.
 * Groups books into rows with optional shelf rails behind each row.
 * Includes scroll physics for tilt/skew effects and section haptics.
 */
export function CoverGridView({
  books,
  onBookPress,
  onRefresh,
  refreshing = false,
  numColumns = 3,
  showShelves = true,
  ListHeaderComponent,
  ListEmptyComponent,
}: CoverGridViewProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // Calculate item dimensions
  const horizontalPadding = theme.spacing.lg * 2;
  const gap = theme.spacing.md;
  const availableWidth = screenWidth - horizontalPadding - gap * (numColumns - 1);
  const itemWidth = Math.floor(availableWidth / numColumns);

  // Build section boundaries for haptic feedback
  const sectionBoundaries = useMemo(
    () => buildSectionBoundaries(books, 180), // Approximate row height
    [books]
  );

  // Scroll physics
  const { scrollHandler, tiltAngle, skewAngle } = useScrollPhysics({
    enableTilt: true,
    enableSkew: true,
    enableSectionHaptics: true,
    sectionBoundaries,
  });

  // Group books into rows
  const rows = useMemo(() => {
    const result: UserBook[][] = [];
    for (let i = 0; i < books.length; i += numColumns) {
      result.push(books.slice(i, i + numColumns));
    }
    return result;
  }, [books, numColumns]);

  // Render a single row of books
  const renderRow = useCallback(
    ({ item: row, index: rowIndex }: ListRenderItemInfo<UserBook[]>) => {
      const content = (
        <View style={[styles.row, { gap, paddingHorizontal: theme.spacing.lg }]}>
          {row.map((book, colIndex) => (
            <BookCoverCard
              key={book.id}
              item={book}
              onPress={onBookPress}
              size="md"
              showTitle={true}
              showAuthor={false}
              tiltAngle={tiltAngle}
              skewAngle={skewAngle}
              index={rowIndex * numColumns + colIndex}
              enablePhysics={true}
            />
          ))}
          {/* Fill empty slots to maintain grid alignment */}
          {row.length < numColumns &&
            Array.from({ length: numColumns - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: itemWidth }} />
            ))}
        </View>
      );

      if (showShelves) {
        return (
          <ShelfRow showRail={true} style={{ marginBottom: theme.spacing.md }}>
            {content}
          </ShelfRow>
        );
      }

      return <View style={{ marginBottom: theme.spacing.md }}>{content}</View>;
    },
    [
      onBookPress,
      tiltAngle,
      skewAngle,
      numColumns,
      gap,
      itemWidth,
      showShelves,
      theme.spacing,
    ]
  );

  const keyExtractor = useCallback(
    (row: UserBook[], index: number) => `grid-row-${index}`,
    []
  );

  return (
    <FlashList
      data={rows}
      renderItem={renderRow}
      keyExtractor={keyExtractor}
      onScroll={scrollHandler as any}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
});
