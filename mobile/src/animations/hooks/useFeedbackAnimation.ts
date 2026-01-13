import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useThemeAnimation } from './useThemeAnimation';
import { SPRINGS, TIMING } from '../constants';

interface FeedbackAnimationResult {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  triggerSuccess: () => void;
  triggerError: () => void;
  triggerWarning: () => void;
  reset: () => void;
}

export function useFeedbackAnimation(): FeedbackAnimationResult {
  const { reducedMotion } = useThemeAnimation();

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const triggerSuccess = useCallback(() => {
    triggerHaptic('success');

    if (reducedMotion) {
      scale.value = withSequence(
        withTiming(1.1, TIMING.fast),
        withTiming(1, TIMING.fast)
      );
    } else {
      scale.value = withSequence(
        withSpring(1.2, SPRINGS.bouncy),
        withSpring(1, SPRINGS.responsive)
      );
    }
  }, [reducedMotion, scale]);

  const triggerError = useCallback(() => {
    triggerHaptic('error');

    if (reducedMotion) {
      translateX.value = withSequence(
        withTiming(-5, TIMING.instant),
        withTiming(5, TIMING.instant),
        withTiming(0, TIMING.instant)
      );
    } else {
      translateX.value = withSequence(
        withTiming(-10, TIMING.instant),
        withTiming(10, TIMING.instant),
        withTiming(-8, TIMING.instant),
        withTiming(8, TIMING.instant),
        withTiming(-4, TIMING.instant),
        withTiming(0, TIMING.instant)
      );
    }
  }, [reducedMotion, translateX]);

  const triggerWarning = useCallback(() => {
    triggerHaptic('warning');

    if (reducedMotion) {
      scale.value = withSequence(
        withTiming(0.95, TIMING.fast),
        withTiming(1, TIMING.fast)
      );
    } else {
      scale.value = withSequence(
        withSpring(0.92, SPRINGS.snappy),
        withSpring(1.05, SPRINGS.bouncy),
        withSpring(1, SPRINGS.responsive)
      );
    }
  }, [reducedMotion, scale]);

  const reset = useCallback(() => {
    scale.value = withTiming(1, TIMING.fast);
    translateX.value = withTiming(0, TIMING.fast);
  }, [scale, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  return { animatedStyle, triggerSuccess, triggerError, triggerWarning, reset };
}