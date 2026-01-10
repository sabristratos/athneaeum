import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Pressable } from '@/components/Pressable';
import { CoverImage } from '@/components/CoverImage';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
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

/**
 * A compact book cover card for grid view.
 * Shows cover image with optional title/author below.
 * Supports scroll physics transforms when tiltAngle/skewAngle are provided.
 */
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
  const { theme, themeName } = useTheme();
  const dimensions = sizeMap[size];

  const animatedStyle = useAnimatedStyle(() => {
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

  const handlePress = () => onPress(item);

  const content = (
    <Pressable onPress={handlePress} haptic="light" activeScale={0.96}>
      <View
        style={[
          styles.container,
          {
            width: dimensions.width,
            borderRadius: theme.radii.md,
          },
        ]}
      >
        {/* Cover image with shadow */}
        <View
          style={[
            styles.coverContainer,
            {
              borderRadius: theme.radii.md,
              ...theme.shadows.md,
            },
          ]}
        >
          <CoverImage
            uri={item.book.cover_url}
            size="custom"
            width={dimensions.width}
            height={dimensions.height}
          />

          {/* Status indicator dot */}
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
        </View>

        {/* Title and author */}
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

  // Wrap with animated view if physics enabled
  if (enablePhysics && tiltAngle && skewAngle) {
    return <Animated.View style={animatedStyle}>{content}</Animated.View>;
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
