import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, RefreshControl, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { ShelfRow } from '@/components/ShelfRow';
import { useTheme } from '@/themes';
import { useScrollPhysics, buildSectionBoundaries } from '@/hooks';
import { BookSpine } from './BookSpine';
import { SPINE_HEIGHT_MAX } from './constants';
import type { UserBook } from '@/types';

const SPINE_GAP = 2;
const SHELF_PADDING = 16;
const INITIAL_BATCH_SIZE = 40;
const LOAD_MORE_BATCH_SIZE = 40;
const LOAD_MORE_THRESHOLD = 500;

interface SpineGridViewProps {
  books: UserBook[];
  onBookPress: (book: UserBook) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  showShelves?: boolean;
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType | React.ReactElement | null;
}

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
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH_SIZE);

  const visibleBooks = useMemo(() => {
    return books.slice(0, visibleCount);
  }, [books, visibleCount]);

  const hasMoreBooks = visibleCount < books.length;

  const sectionBoundaries = useMemo(
    () => buildSectionBoundaries(visibleBooks, SPINE_HEIGHT_MAX + theme.spacing.md),
    [visibleBooks, theme.spacing.md]
  );

  const { scrollHandler: physicsScrollHandler, tiltAngle, skewAngle } = useScrollPhysics({
    enableTilt: true,
    enableSkew: true,
    enableSectionHaptics: true,
    sectionBoundaries,
  });

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      physicsScrollHandler(event);

      if (!hasMoreBooks) return;

      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;

      if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
        setVisibleCount((prev) => Math.min(prev + LOAD_MORE_BATCH_SIZE, books.length));
      }
    },
    [physicsScrollHandler, hasMoreBooks, books.length]
  );

  const containerPhysicsStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${tiltAngle.value}deg` },
      ],
    };
  }, [tiltAngle]);

  const handleBookPress = useCallback(
    (userBook: UserBook) => {
      onBookPress(userBook);
    },
    [onBookPress]
  );

  const renderHeader = useCallback(() => {
    if (!ListHeaderComponent) return null;
    if (React.isValidElement(ListHeaderComponent)) {
      return ListHeaderComponent;
    }
    const HeaderComponent = ListHeaderComponent as React.ComponentType;
    return <HeaderComponent />;
  }, [ListHeaderComponent]);

  const renderEmpty = useCallback(() => {
    if (books.length > 0 || !ListEmptyComponent) return null;
    if (React.isValidElement(ListEmptyComponent)) {
      return ListEmptyComponent;
    }
    const EmptyComponent = ListEmptyComponent as React.ComponentType;
    return <EmptyComponent />;
  }, [books.length, ListEmptyComponent]);

  const renderSpines = useCallback(() => {
    if (books.length === 0) return renderEmpty();

    const content = (
      <View style={[styles.spinesContainer, { gap: SPINE_GAP }]}>
        {visibleBooks.map((userBook, index) => (
          <BookSpine
            key={userBook.id}
            book={userBook.book}
            userBook={userBook}
            onPress={() => handleBookPress(userBook)}
            index={index}
            skewAngle={skewAngle}
            totalBooks={books.length}
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
  }, [books.length, visibleBooks, handleBookPress, renderEmpty, showShelves, theme.spacing.md, skewAngle]);

  return (
    <Animated.ScrollView
      style={styles.scrollView}
      contentContainerStyle={{ paddingBottom: theme.spacing.xl + 80 }}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
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
      <Animated.View style={containerPhysicsStyle}>
        {renderSpines()}
      </Animated.View>
    </Animated.ScrollView>
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
