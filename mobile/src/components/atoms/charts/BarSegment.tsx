import React, { memo, useEffect } from 'react';
import { Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface BarSegmentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  animated?: boolean;
}

export const BarSegment = memo(function BarSegment({
  x,
  y,
  width,
  height,
  color,
  animated = true,
}: BarSegmentProps) {
  const { theme } = useTheme();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedWidth.value = withTiming(width, { duration: 600 });
    } else {
      animatedWidth.value = width;
    }
  }, [width, animated, animatedWidth]);

  const animatedProps = useAnimatedProps(() => ({
    width: animatedWidth.value,
  }));

  return (
    <AnimatedRect
      x={x}
      y={y}
      height={height}
      rx={theme.radii.sm}
      fill={color || theme.colors.primary}
      animatedProps={animatedProps}
    />
  );
});
