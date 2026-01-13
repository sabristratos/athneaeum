import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedRef,
  useAnimatedStyle,
  measure,
  runOnUI,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { Pressable, Text } from '@/components/atoms';
import { CoverImage } from '@/components/organisms';
import { useTheme } from '@/themes';
import { componentSizes, sharedSpacing } from '@/themes/shared';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import type { UserBook } from '@/types';

interface BookCoverCardProps {
  item: UserBook;
  onPress: (item: UserBook) => void;
  size?: 'sm' | 'md' | 'lg';
  showTitle?: boolean;
  showAuthor?: boolean;
  tiltAngle?: SharedValue<number>;
  skewAngle?: SharedValue<number>;
  index?: number;
  enablePhysics?: boolean;
}

const sizeMap = {
  sm: { width: 80, height: 120 },
  md: { width: 100, height: 150 },
  lg: { width: 120, height: 180 },
};

const NAVIGATION_DELAY = 16;

export const BookCoverCard = memo(function BookCoverCard({
  item,
  onPress,
  size = 'md',
  showTitle = true,
  showAuthor = false,
  tiltAngle,
  skewAngle,
  index = 0,
  enablePhysics = true,
}: BookCoverCardProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const coverRef = useAnimatedRef<Animated.View>();
  const dimensions = sizeMap[size];

  const startForwardTransition = useSharedElementStore((state) => state.startForwardTransition);
  const registerListItemPosition = useSharedElementStore((state) => state.registerListItemPosition);
  const isTransitioning = useSharedElementStore((state) => state.isTransitioning);
  const transitioningUserBookId = useSharedElementStore((state) => state.userBookId);

  const physicsStyle = useAnimatedStyle(() => {
    if (!enablePhysics || !tiltAngle || !skewAngle) {
      return {};
    }

    const skewDirection = index % 2 === 0 ? 1 : -1;

    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${tiltAngle.value}deg` },
        { skewX: `${skewAngle.value * skewDirection}deg` },
      ],
    };
  }, [enablePhysics, index, tiltAngle, skewAngle]);

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
        item.book.cover_url || '',
        item.id
      );

      setTimeout(() => {
        onPress(item);
      }, NAVIGATION_DELAY);
    },
    [item, onPress, startForwardTransition, registerListItemPosition, insets.top]
  );

  const handlePress = useCallback(() => {
    runOnUI(() => {
      'worklet';
      const measured = measure(coverRef);
      runOnJS(processAndNavigate)(measured);
    })();
  }, [coverRef, processAndNavigate]);

  const isThisItemTransitioning = isTransitioning && transitioningUserBookId === item.id;

  const accessibilityLabel = `${item.book.title} by ${item.book.author}${
    item.status === 'reading' ? '. Currently reading' : ''
  }`;

  const content = (
    <Pressable
      onPress={handlePress}
      haptic="light"
      activeScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Double tap to view book details"
    >
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        <Animated.View
          ref={coverRef}
          collapsable={false}
          style={[
            styles.coverContainer,
            {
              borderRadius: theme.radii.md,
              opacity: isThisItemTransitioning ? 0 : 1,
              ...theme.shadows.md,
            },
          ]}
        >
          <CoverImage
            uri={item.book.cover_url}
            size="custom"
            width={dimensions.width}
            height={dimensions.height}
            accessibilityLabel={`Cover of ${item.book.title}`}
          />

          {item.status === 'reading' && (
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: theme.colors.success,
                  borderColor: theme.colors.surface,
                },
              ]}
            />
          )}
        </Animated.View>

        {(showTitle || showAuthor) && (
          <View style={[styles.textContainer, { marginTop: theme.spacing.xs }]}>
            {showTitle && (
              <Text
                variant="caption"
                numberOfLines={2}
                style={[
                  styles.title,
                  {
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                {item.book.title}
              </Text>
            )}
            {showAuthor && (
              <Text
                variant="caption"
                numberOfLines={1}
                style={[
                  styles.author,
                  {
                    color: theme.colors.foregroundMuted,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                {item.book.author}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );

  if (enablePhysics && tiltAngle && skewAngle) {
    return <Animated.View style={physicsStyle}>{content}</Animated.View>;
  }

  return content;
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  coverContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  statusDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  author: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
    marginTop: 2,
  },
});
