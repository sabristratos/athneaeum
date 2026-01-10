import React, { useEffect, memo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/themes';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { OPACITIES } from '../constants';

interface SkeletonShimmerProps {
  width: number | `${number}%`;
  height: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const SkeletonShimmer = memo(function SkeletonShimmer({
  width,
  height,
  style,
  borderRadius,
}: SkeletonShimmerProps) {
  const { theme, themeName } = useTheme();
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(-1);

  const finalRadius = borderRadius ?? theme.radii.sm;

  const shimmerColors =
    themeName === 'scholar'
      ? ([theme.colors.surfaceAlt, theme.colors.surfaceHover, theme.colors.surfaceAlt] as const)
      : ([theme.colors.surfaceAlt, theme.colors.surface, theme.colors.surfaceAlt] as const);

  useEffect(() => {
    if (reducedMotion) {
      translateX.value = 0;
      return;
    }

    translateX.value = withRepeat(
      withTiming(1, {
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, [reducedMotion, translateX]);

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { opacity: OPACITIES.shimmerMax };
    }

    return {
      transform: [{ translateX: interpolate(translateX.value, [-1, 1], [-200, 200]) }],
    };
  });

  if (reducedMotion) {
    return (
      <View
        style={[
          {
            width,
            height,
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: finalRadius,
            opacity: OPACITIES.shimmerMax,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: finalRadius,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={shimmerColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});
