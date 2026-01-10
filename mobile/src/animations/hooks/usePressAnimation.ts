import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useThemeAnimation } from './useThemeAnimation';
import { OPACITIES, TIMING } from '../constants';

interface PressAnimationConfig {
  scaleValue?: number;
  opacityValue?: number;
  enabled?: boolean;
}

interface PressAnimationResult {
  scale: SharedValue<number>;
  opacity: SharedValue<number>;
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  pressIn: () => void;
  pressOut: () => void;
}

export function usePressAnimation(config: PressAnimationConfig = {}): PressAnimationResult {
  const { opacityValue = OPACITIES.pressed, enabled = true } = config;

  const { spring, scales, reducedMotion } = useThemeAnimation();
  const finalScale = config.scaleValue ?? scales.pressed;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pressIn = useCallback(() => {
    if (!enabled) return;

    if (reducedMotion) {
      scale.value = withTiming(finalScale, TIMING.instant);
      opacity.value = withTiming(opacityValue, TIMING.instant);
    } else {
      scale.value = withSpring(finalScale, spring.press);
      opacity.value = withTiming(opacityValue, TIMING.fast);
    }
  }, [enabled, reducedMotion, finalScale, opacityValue, spring.press, scale, opacity]);

  const pressOut = useCallback(() => {
    if (reducedMotion) {
      scale.value = withTiming(1, TIMING.instant);
      opacity.value = withTiming(1, TIMING.instant);
    } else {
      scale.value = withSpring(1, spring.press);
      opacity.value = withTiming(1, TIMING.fast);
    }
  }, [reducedMotion, spring.press, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { scale, opacity, animatedStyle, pressIn, pressOut };
}
