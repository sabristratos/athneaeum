import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { ShelfRow } from '@/components/ShelfRow';
import { useTheme } from '@/themes';
import { useScrollPhysics, buildSectionBoundaries } from '@/hooks';
import { BookSpine } from './BookSpine';
import type { UserBook } from '@/types';

// Spine dimensions - use max height for section boundary calculations
const SPINE_HEIGHT_MAX = 160;
const SPINE_GAP = 2;
const SHELF_PADDING = 16;

interface SpineGridViewProps {
  books: UserBook[];
  onBookPress: (book: UserBook) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showShelves?: boolean;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

/**
 * A grid view that displays books as procedurally generated spines.
 * Spine widths vary based on page count.
 * Can show 50+ books per screen, mimicking a real bookshelf.
 */
export function SpineGridView({
  books,
  onBookPress,
  onRefresh,
  refreshing = false,
  showShelves = true,
  ListHeaderComponent,
  ListEmptyComponent,
}: SpineGridViewProps) {
  const { theme } = useTheme();

  // Build section boundaries for haptic feedback
  const sectionBoundaries = useMemo(
    () => buildSectionBoundaries(books, SPINE_HEIGHT_MAX + theme.spacing.md),
    [books, theme.spacing.md]
  );

  // Scroll physics
  const { scrollHandler, tiltAngle, skewAngle } = useScrollPhysics({
    enableTilt: true,
    enableSkew: true,
    enableSectionHaptics: true,
    sectionBoundaries,
  });

  // Render header if provided
  const renderHeader = () => {
    if (!ListHeaderComponent) return null;
    if (React.isValidElement(ListHeaderComponent)) {
      return ListHeaderComponent;
    }
    const HeaderComponent = ListHeaderComponent as React.ComponentType;
    return <HeaderComponent />;
  };

  // Render empty state if provided
  const renderEmpty = () => {
    if (books.length > 0 || !ListEmptyComponent) return null;
    if (React.isValidElement(ListEmptyComponent)) {
      return ListEmptyComponent;
    }
    const EmptyComponent = ListEmptyComponent as React.ComponentType;
    return <EmptyComponent />;
  };

  // Render all spines in a flex wrap container
  const renderSpines = () => {
    if (books.length === 0) return renderEmpty();

    const content = (
      <View style={[styles.spinesContainer, { gap: SPINE_GAP }]}>
        {books.map((userBook, index) => (
          <BookSpine
            key={userBook.id}
            book={userBook.book}
            userBook={userBook}
            onPress={() => onBookPress(userBook)}
            index={index}
            tiltAngle={tiltAngle}
            skewAngle={skewAngle}
            enablePhysics={true}
          />
        ))}
      </View>
    );

    if (showShelves) {
      return (
        <ShelfRow showRail={true} style={{ marginBottom: theme.spacing.md }}>
          <View style={[styles.rowContainer, { paddingHorizontal: SHELF_PADDING }]}>
            {content}
          </View>
        </ShelfRow>
      );
    }

    return (
      <View style={[styles.rowContainer, { paddingHorizontal: SHELF_PADDING }]}>
        {content}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: theme.spacing.xl + 80 }}
      showsVerticalScrollIndicator={false}
      onScroll={scrollHandler as any}
      scrollEventThrottle={16}
      removeClippedSubviews={true}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        ) : undefined
      }
    >
      {renderHeader()}
      {renderSpines()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  rowContainer: {
    width: '100%',
  },
  spinesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
});
