import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { useSharedElementStore } from '@/stores/sharedElementStore';

export function SharedElementOverlay() {
  const { theme, themeName } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const isScholar = themeName === 'scholar';

  const {
    isTransitioning,
    direction,
    sourcePosition,
    targetPosition,
    coverUri,
    completeTransition,
  } = useSharedElementStore();

  const progress = useSharedValue(0);

  useEffect(() => {
    if (isTransitioning && sourcePosition && targetPosition) {
      // Reset progress
      progress.value = 0;

      // Animate to target
      const duration = direction === 'forward' ? 450 : 350;
      progress.value = withTiming(
        1,
        {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        },
        (finished) => {
          if (finished) {
            runOnJS(completeTransition)();
          }
        }
      );
    }
  }, [isTransitioning, sourcePosition, targetPosition, direction]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.lg;

  const animatedStyle = useAnimatedStyle(() => {
    if (!sourcePosition || !targetPosition) {
      return { opacity: 0 };
    }

    const left = interpolate(
      progress.value,
      [0, 1],
      [sourcePosition.x, targetPosition.x]
    );
    const top = interpolate(
      progress.value,
      [0, 1],
      [sourcePosition.y, targetPosition.y]
    );
    const width = interpolate(
      progress.value,
      [0, 1],
      [sourcePosition.width, targetPosition.width]
    );
    const height = interpolate(
      progress.value,
      [0, 1],
      [sourcePosition.height, targetPosition.height]
    );

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      opacity: 1,
    };
  });

  if (!isTransitioning || !coverUri || !sourcePosition || !targetPosition) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          borderRadius,
          overflow: 'hidden',
          backgroundColor: theme.colors.surfaceAlt,
          ...(isScholar
            ? {
                borderWidth: 1,
                borderColor: theme.colors.border,
              }
            : {}),
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: coverUri }}
        style={styles.image}
        contentFit="cover"
        transition={0}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
