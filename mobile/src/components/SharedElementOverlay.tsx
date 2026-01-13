import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  withTiming,
  useReducedMotion,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { useSharedElementStore } from '@/stores/sharedElementStore';
import { SPRINGS } from '@/animations/constants';

export function SharedElementOverlay() {
  const { theme, themeName } = useTheme();
  const reducedMotion = useReducedMotion();
  const isScholar = themeName === 'scholar';

  const {
    isTransitioning,
    direction,
    sourcePosition,
    targetPosition,
    coverUri,
    completeTransition,
  } = useSharedElementStore();

  const animatedX = useSharedValue(0);
  const animatedY = useSharedValue(0);
  const animatedWidth = useSharedValue(0);
  const animatedHeight = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isTransitioning && sourcePosition && targetPosition) {
      const isForward = direction === 'forward';
      const spring = isForward ? SPRINGS.sharedElement : SPRINGS.sharedElementFast;

      animatedX.value = sourcePosition.x;
      animatedY.value = sourcePosition.y;
      animatedWidth.value = sourcePosition.width;
      animatedHeight.value = sourcePosition.height;
      opacity.value = 1;

      if (reducedMotion) {
        animatedX.value = withTiming(targetPosition.x, { duration: 200 }, (finished) => {
          if (finished) {
            opacity.value = withTiming(0, { duration: 100 }, () => {
              runOnJS(completeTransition)();
            });
          }
        });
        animatedY.value = withTiming(targetPosition.y, { duration: 200 });
        animatedWidth.value = withTiming(targetPosition.width, { duration: 200 });
        animatedHeight.value = withTiming(targetPosition.height, { duration: 200 });
      } else {
        animatedX.value = withSpring(targetPosition.x, spring);
        animatedY.value = withSpring(targetPosition.y, spring);
        animatedWidth.value = withSpring(targetPosition.width, spring);
        animatedHeight.value = withSpring(targetPosition.height, spring, (finished) => {
          if (finished) {
            opacity.value = withTiming(0, { duration: 80 }, () => {
              runOnJS(completeTransition)();
            });
          }
        });
      }
    } else if (!isTransitioning) {
      opacity.value = 0;
    }
  }, [isTransitioning, sourcePosition, targetPosition, direction, reducedMotion]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.lg;

  const animatedStyle = useAnimatedStyle(() => {
    if (opacity.value === 0) {
      return { opacity: 0 };
    }

    return {
      position: 'absolute',
      left: animatedX.value,
      top: animatedY.value,
      width: animatedWidth.value,
      height: animatedHeight.value,
      opacity: opacity.value,
    };
  });

  if (!coverUri || !sourcePosition || !targetPosition) {
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
          ...theme.shadows.lg,
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
        cachePolicy="memory-disk"
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
