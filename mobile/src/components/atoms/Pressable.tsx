import React, { useCallback, useRef } from 'react';
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
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { SPRINGS, TIMING } from '@/animations';
import { triggerHaptic, type HapticFeedback } from '@/hooks/useHaptic';

export type HapticType = 'light' | 'medium' | 'heavy' | 'none';

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  haptic?: HapticType;
  longPressHaptic?: HapticType;
  activeOpacity?: number;
  activeScale?: number;
  longPressScale?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
  className?: string;
  children: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export function Pressable({
  haptic = 'light',
  longPressHaptic = 'heavy',
  activeOpacity = 0.8,
  activeScale = 1,
  longPressScale = 0.95,
  onPressIn,
  onPressOut,
  onLongPress,
  style,
  className,
  children,
  disabled,
  hitSlop,
  ...props
}: PressableProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const isLongPressing = useRef(false);

  const triggerLongPressHaptic = useCallback(() => {
    if (longPressHaptic !== 'none') {
      triggerHaptic(longPressHaptic as HapticFeedback);
    }
  }, [longPressHaptic]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withSpring(activeScale, SPRINGS.snappy);
        opacity.value = withTiming(activeOpacity, TIMING.fast);

        if (haptic !== 'none') {
          triggerHaptic(haptic as HapticFeedback);
        }
      }
      onPressIn?.(event);
    },
    [haptic, onPressIn, disabled, activeScale, activeOpacity, scale, opacity]
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      isLongPressing.current = false;
      scale.value = withSpring(1, SPRINGS.snappy);
      opacity.value = withTiming(1, TIMING.fast);
      onPressOut?.(event);
    },
    [onPressOut, scale, opacity]
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      isLongPressing.current = true;

      scale.value = withSequence(
        withSpring(longPressScale, SPRINGS.press),
        withSpring(1, SPRINGS.snappy)
      );

      triggerLongPressHaptic();
      onLongPress?.(event);
    },
    [onLongPress, longPressScale, scale, triggerLongPressHaptic]
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

  const defaultHitSlop = hitSlop ?? {
    top: 8,
    right: 8,
    bottom: 8,
    left: 8,
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress ? handleLongPress : undefined}
      style={[getBaseStyle, animatedStyle]}
      className={className}
      disabled={disabled}
      hitSlop={defaultHitSlop}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
