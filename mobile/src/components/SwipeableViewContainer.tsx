import React, { memo, useCallback } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { triggerHaptic } from '@/hooks/useHaptic';
import { SPRINGS } from '@/animations/constants';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
const SWIPE_VELOCITY_THRESHOLD = 500;

interface SwipeableViewContainerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  enabled?: boolean;
  swipeHint?: boolean;
}

/**
 * A container that detects horizontal swipe gestures.
 * Use for switching between view modes in the library.
 * Can be disabled when child views have their own swipe gestures (e.g., TBR stack).
 */
export const SwipeableViewContainer = memo(function SwipeableViewContainer({
  children,
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  swipeHint = false,
}: SwipeableViewContainerProps) {
  const translateX = useSharedValue(0);

  const handleSwipeLeft = useCallback(() => {
    triggerHaptic('light');
    onSwipeLeft?.();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    triggerHaptic('light');
    onSwipeRight?.();
  }, [onSwipeRight]);

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      const clampedX = Math.max(-50, Math.min(50, event.translationX * 0.3));
      translateX.value = clampedX;
    })
    .onEnd((event) => {
      const shouldSwipeLeft =
        event.translationX < -SWIPE_THRESHOLD ||
        event.velocityX < -SWIPE_VELOCITY_THRESHOLD;
      const shouldSwipeRight =
        event.translationX > SWIPE_THRESHOLD ||
        event.velocityX > SWIPE_VELOCITY_THRESHOLD;

      if (shouldSwipeLeft && onSwipeLeft) {
        runOnJS(handleSwipeLeft)();
      } else if (shouldSwipeRight && onSwipeRight) {
        runOnJS(handleSwipeRight)();
      }

      translateX.value = withSpring(0, SPRINGS.swipeReturn);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, swipeHint && animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
