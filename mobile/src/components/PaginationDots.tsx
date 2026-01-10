import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';

interface PaginationDotsProps {
  /** Total number of dots */
  count: number;
  /** Currently active dot index (0-based) */
  activeIndex: number;
  /** Optional animated scroll position for smooth transitions */
  scrollX?: SharedValue<number>;
  /** Width of each item for scroll-based calculations */
  itemWidth?: number;
}

/**
 * Simple dot indicators for carousel/paging navigation.
 * Active dot is larger and uses primary color, inactive dots are smaller and muted.
 */
export function PaginationDots({
  count,
  activeIndex,
  scrollX,
  itemWidth,
}: PaginationDotsProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  if (count <= 1) {
    return null;
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <Dot
          key={index}
          index={index}
          activeIndex={activeIndex}
          scrollX={scrollX}
          itemWidth={itemWidth}
          theme={theme}
          isScholar={isScholar}
        />
      ))}
    </View>
  );
}

interface DotProps {
  index: number;
  activeIndex: number;
  scrollX?: SharedValue<number>;
  itemWidth?: number;
  theme: ReturnType<typeof useTheme>['theme'];
  isScholar: boolean;
}

function Dot({ index, activeIndex, scrollX, itemWidth, theme, isScholar }: DotProps) {
  const isActive = index === activeIndex;

  // Animated style for smooth scroll-based transitions
  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollX || !itemWidth) {
      // Static mode - just use activeIndex
      return {
        width: isActive ? 8 : 6,
        height: isActive ? 8 : 6,
        opacity: isActive ? 1 : 0.4,
        backgroundColor: isActive ? theme.colors.primary : theme.colors.foregroundMuted,
      };
    }

    // Calculate active state based on scroll position
    const inputRange = [
      (index - 1) * itemWidth,
      index * itemWidth,
      (index + 1) * itemWidth,
    ];

    const width = interpolate(
      scrollX.value,
      inputRange,
      [6, 8, 6],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.4, 1, 0.4],
      Extrapolation.CLAMP
    );

    return {
      width,
      height: width,
      opacity,
      backgroundColor: theme.colors.primary,
    };
  }, [scrollX, itemWidth, index, isActive, theme.colors.primary, theme.colors.foregroundMuted]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          borderRadius: isScholar ? 1 : 4,
        },
        !scrollX && {
          width: isActive ? 8 : 6,
          height: isActive ? 8 : 6,
          opacity: isActive ? 1 : 0.4,
          backgroundColor: isActive ? theme.colors.primary : theme.colors.foregroundMuted,
        },
        scrollX && animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 4,
  },
});
