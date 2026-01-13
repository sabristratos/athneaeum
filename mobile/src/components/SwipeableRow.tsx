import React, { memo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Icon, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations/constants';
import { Delete02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_WIDTH = 80;
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.4;

interface SwipeAction {
  icon: any;
  label: string;
  color: string;
  onPress: () => void;
}

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  rightActions?: SwipeAction[];
  enabled?: boolean;
}

export const SwipeableRow = memo(function SwipeableRow({
  children,
  onDelete,
  rightActions,
  enabled = true,
}: SwipeableRowProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(0);
  const isDeleting = useSharedValue(false);
  const hasTriggeredHaptic = useSharedValue(false);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    rowHeight.value = event.nativeEvent.layout.height;
  }, []);

  const doHaptic = useCallback(() => {
    triggerHaptic('medium');
  }, []);

  const handleDelete = useCallback(() => {
    onDelete?.();
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .enabled(enabled && !!onDelete)
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .onUpdate((event) => {
      const clampedX = Math.min(0, Math.max(-DELETE_THRESHOLD - 40, event.translationX));
      translateX.value = clampedX;

      if (Math.abs(clampedX) > DELETE_THRESHOLD && !hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = true;
        runOnJS(doHaptic)();
      } else if (Math.abs(clampedX) <= DELETE_THRESHOLD && hasTriggeredHaptic.value) {
        hasTriggeredHaptic.value = false;
      }
    })
    .onEnd((event) => {
      hasTriggeredHaptic.value = false;

      if (Math.abs(translateX.value) > DELETE_THRESHOLD) {
        isDeleting.value = true;
        translateX.value = withTiming(-SCREEN_WIDTH, TIMING.normal, (finished) => {
          if (finished) {
            runOnJS(handleDelete)();
          }
        });
      } else if (Math.abs(translateX.value) > ACTION_WIDTH / 2) {
        translateX.value = withSpring(-ACTION_WIDTH, SPRINGS.snap);
      } else {
        translateX.value = withSpring(0, SPRINGS.snap);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const actionContainerStyle = useAnimatedStyle(() => {
    const width = Math.abs(translateX.value);
    return {
      width,
      height: rowHeight.value,
    };
  });

  const deleteIconStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, ACTION_WIDTH, DELETE_THRESHOLD],
      [0.5, 1, 1.3],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      Math.abs(translateX.value),
      [0, ACTION_WIDTH / 2],
      [0, 1],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const deleteTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      Math.abs(translateX.value),
      [DELETE_THRESHOLD - 20, DELETE_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  if (!onDelete) {
    return <>{children}</>;
  }

  return (
    <View
      style={styles.container}
      onLayout={onLayout}
      accessible={true}
      accessibilityHint={onDelete !== undefined ? 'Swipe left to reveal delete action' : undefined}
    >
      <Animated.View
        style={[
          styles.actionContainer,
          actionContainerStyle,
          { backgroundColor: theme.colors.danger },
        ]}
        accessibilityLabel="Delete"
        accessibilityRole="button"
      >
        <View style={styles.actionContent}>
          <Animated.View style={deleteIconStyle}>
            <Icon icon={Delete02Icon} size={24} color="#fff" />
          </Animated.View>
          <Animated.View style={deleteTextStyle}>
            <Text variant="caption" style={styles.deleteText}>
              Delete
            </Text>
          </Animated.View>
        </View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  row: {
    backgroundColor: 'transparent',
  },
  actionContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
  },
});
