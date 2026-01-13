import React, { memo, useCallback, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  measure,
  runOnUI,
  runOnJS,
} from 'react-native-reanimated';
import { Text, Progress } from '@/components/atoms';
import { Rating, Chip } from '@/components/molecules';
import { Card, CoverImage } from '@/components/organisms';
import { useTheme } from '@/themes';
import { componentSizes, sharedSpacing } from '@/themes/shared';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import { STATUS_VARIANT_MAP } from '@/components/constants';
import { formatDateFromString } from '@/utils/dateUtils';
import type { UserBook } from '@/types';

interface BookListItemProps {
  item: UserBook;
  onPress: (item: UserBook) => void;
}

const NAVIGATION_DELAY = 16;

export const BookListItem = memo(function BookListItem({ item, onPress }: BookListItemProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const coverRef = useAnimatedRef<Animated.View>();

  const startForwardTransition = useSharedElementStore((state) => state.startForwardTransition);
  const registerListItemPosition = useSharedElementStore((state) => state.registerListItemPosition);
  const isTransitioning = useSharedElementStore((state) => state.isTransitioning);
  const transitioningUserBookId = useSharedElementStore((state) => state.userBookId);

  const book = item.book;
  const showProgress = item.status === 'reading' && book.page_count;

  const processAndNavigate = useCallback(
    (measured: { pageX: number; pageY: number; width: number; height: number } | null) => {
      if (!measured || measured.width === 0) {
        onPress(item);
        return;
      }

      const heroX = sharedSpacing.lg;
      const headerHeight = componentSizes.headerHeight;
      const heroY = insets.top + headerHeight + sharedSpacing.lg;

      const sourcePosition = {
        x: measured.pageX,
        y: measured.pageY,
        width: measured.width,
        height: measured.height,
      };
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

      setTimeout(() => {
        onPress(item);
      }, NAVIGATION_DELAY);
    },
    [item, onPress, startForwardTransition, registerListItemPosition, book.cover_url, insets.top]
  );

  const handlePress = useCallback(() => {
    runOnUI(() => {
      'worklet';
      const measured = measure(coverRef);
      runOnJS(processAndNavigate)(measured);
    })();
  }, [coverRef, processAndNavigate]);

  const isThisItemTransitioning = isTransitioning && transitioningUserBookId === item.id;

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

  const accessibilityLabel = `${book.title} by ${book.author}. Status: ${item.status_label}${
    item.rating ? `. Rating: ${item.rating} out of 5` : ''
  }${showProgress ? `. Page ${item.current_page} of ${book.page_count}` : ''}`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view book details"
    >
      <Card variant="elevated" padding="md" style={cardStyle}>
        <View style={rowStyle}>
          <Animated.View
            ref={coverRef}
            collapsable={false}
            style={{ opacity: isThisItemTransitioning ? 0 : 1 }}
          >
            <CoverImage
              uri={book.cover_url}
              size="md"
              fallbackText="No Cover"
              accessibilityLabel={`Cover of ${book.title}`}
            />
          </Animated.View>

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
                Finished {formatDateFromString(item.finished_at)}
              </Text>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
});
