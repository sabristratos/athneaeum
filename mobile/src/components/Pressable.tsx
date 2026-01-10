import React, { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type ViewStyle,
  type StyleProp,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SPRINGS, TIMING } from '@/animations';

export type HapticType = 'light' | 'medium' | 'heavy' | 'none';

interface PressableProps extends Omit<RNPressableProps, 'style'> {
  haptic?: HapticType;
  activeOpacity?: number;
  activeScale?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  className?: string;
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

const hapticMap: Record<Exclude<HapticType, 'none'>, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

export function Pressable({
  haptic = 'light',
  activeOpacity = 0.8,
  activeScale = 1, // No scale by default, components opt-in
  onPressIn,
  onPressOut,
  style,
  className,
  children,
  disabled,
  ...props
}: PressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withSpring(activeScale, SPRINGS.snappy);
        opacity.value = withTiming(activeOpacity, TIMING.fast);

        if (haptic !== 'none') {
          Haptics.impactAsync(hapticMap[haptic]);
        }
      }
      onPressIn?.(event);
    },
    [haptic, onPressIn, disabled, activeScale, activeOpacity, scale, opacity]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      scale.value = withSpring(1, SPRINGS.snappy);
      opacity.value = withTiming(1, TIMING.fast);
      onPressOut?.(event);
    },
    [onPressOut, scale, opacity]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getBaseStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
      if (typeof style === 'function') {
        return style({ pressed });
      }
      return style ?? {};
    },
    [style]
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[getBaseStyle, animatedStyle]}
      className={className}
      disabled={disabled}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
