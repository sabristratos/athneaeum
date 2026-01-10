import React, { memo, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, TouchableOpacity, findNodeHandle, UIManager, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';
import { Card } from '@/components/Card';
import { Rating } from '@/components/Rating';
import { Progress } from '@/components/Progress';
import { CoverImage } from '@/components/CoverImage';
import { Chip } from '@/components/Chip';
import { useTheme } from '@/themes';
import { componentSizes, sharedSpacing } from '@/themes/shared';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import type { UserBook, BookStatus } from '@/types';

interface BookListItemProps {
  item: UserBook;
  onPress: (item: UserBook) => void;
}

const STATUS_VARIANT_MAP: Record<BookStatus, 'primary' | 'success' | 'danger' | 'muted'> = {
  reading: 'primary',
  read: 'success',
  dnf: 'danger',
  want_to_read: 'muted',
};

export const BookListItem = memo(function BookListItem({ item, onPress }: BookListItemProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coverRef = useRef<View>(null);

  // Use stable selectors to avoid unnecessary re-renders
  const startForwardTransition = useSharedElementStore((state) => state.startForwardTransition);
  const registerListItemPosition = useSharedElementStore((state) => state.registerListItemPosition);
  const isTransitioning = useSharedElementStore((state) => state.isTransitioning);
  const transitioningUserBookId = useSharedElementStore((state) => state.userBookId);

  const book = item.book;
  const showProgress = item.status === 'reading' && book.page_count;

  // Memoize position registration - only called on layout change
  const registerPosition = useCallback(() => {
    if (!coverRef.current) return;
    const handle = findNodeHandle(coverRef.current);
    if (!handle) return;
    UIManager.measureInWindow(handle, (x, y, width, height) => {
      if (width > 0 && height > 0) {
        registerListItemPosition(item.id, { x, y, width, height });
      }
    });
  }, [item.id, registerListItemPosition]);

  // Register position on mount with slight delay for layout completion
  useEffect(() => {
    const timer = setTimeout(registerPosition, 100);
    return () => clearTimeout(timer);
  }, [registerPosition]);

  const handlePress = useCallback(() => {
    if (!coverRef.current) {
      onPress(item);
      return;
    }

    const handle = findNodeHandle(coverRef.current);
    if (!handle) {
      onPress(item);
      return;
    }

    UIManager.measureInWindow(handle, (x, y, width, height) => {
      const heroX = (screenWidth - HERO_COVER.width) / 2;
      const headerHeight = componentSizes.headerHeight;
      const heroY = insets.top + headerHeight;

      const sourcePosition = { x, y, width, height };
      const targetPosition = {
        x: heroX,
        y: heroY,
        width: HERO_COVER.width,
        height: HERO_COVER.height,
      };

      registerListItemPosition(item.id, sourcePosition);
      startForwardTransition(
        sourcePosition,
        targetPosition,
        book.cover_url || '',
        item.id
      );
      onPress(item);
    });
  }, [item, onPress, startForwardTransition, registerListItemPosition, book.cover_url, screenWidth, insets.top]);

  // Hide cover during transition if this is the transitioning item
  const isThisItemTransitioning = isTransitioning && transitioningUserBookId === item.id;

  // Memoize styles
  const cardStyle = useMemo(
    () => ({ marginBottom: theme.spacing.md }),
    [theme.spacing.md]
  );

  const rowStyle = useMemo(
    () => ({ flexDirection: 'row' as const, gap: theme.spacing.md }),
    [theme.spacing.md]
  );

  const contentStyle = useMemo(
    () => ({ flex: 1, gap: theme.spacing.xs }),
    [theme.spacing.xs]
  );

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <Card variant="elevated" padding="md" style={cardStyle}>
        <View style={rowStyle}>
          <View
            ref={coverRef}
            collapsable={false}
            onLayout={registerPosition}
            style={{ opacity: isThisItemTransitioning ? 0 : 1 }}
          >
            <CoverImage uri={book.cover_url} size="md" fallbackText="No Cover" />
          </View>

          <View style={contentStyle}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Text
                variant="h3"
                numberOfLines={2}
                style={{ flex: 1, marginRight: theme.spacing.sm }}
              >
                {book.title}
              </Text>
              <Chip
                label={item.status_label}
                variant={STATUS_VARIANT_MAP[item.status]}
                selected
                size="sm"
              />
            </View>

            <Text variant="body" muted numberOfLines={1}>
              {book.author}
            </Text>

            {item.rating !== null && item.rating > 0 && (
              <Rating value={item.rating} size="sm" showValue={false} />
            )}

            {showProgress && (
              <View style={{ marginTop: theme.spacing.xs }}>
                <Progress
                  value={item.current_page}
                  max={book.page_count!}
                  size="sm"
                  showPercentage={false}
                />
                <Text variant="caption" muted style={{ marginTop: sharedSpacing.xxs }}>
                  Page {item.current_page} of {book.page_count}
                </Text>
              </View>
            )}

            {item.status === 'read' && item.finished_at && (
              <Text variant="caption" muted>
                Finished {new Date(item.finished_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});
