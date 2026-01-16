import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { SPRINGS } from '@/animations';

interface ScrollAnimationsConfig {
  titleFadeStart?: number;
  titleFadeEnd?: number;
  fabHideThreshold?: number;
  stageHeight?: number;
}

interface ScrollAnimationsResult {
  scrollY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  fabVisible: SharedValue<number>;
  headerTitleOpacity: SharedValue<number>;
  coverOpacity: SharedValue<number>;
  coverScale: SharedValue<number>;
  coverTranslateY: SharedValue<number>;
}

/**
 * Hook that manages scroll-based animations for the Book Detail screen.
 */
export function useBookDetailScrollAnimations(
  config: ScrollAnimationsConfig = {}
): ScrollAnimationsResult {
  const {
    titleFadeStart = 150,
    titleFadeEnd = 250,
    fabHideThreshold = 100,
    stageHeight = 350,
  } = config;

  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const fabVisible = useSharedValue(1);
  const headerTitleOpacity = useSharedValue(0);
  const coverOpacity = useSharedValue(1);
  const coverScale = useSharedValue(1);
  const coverTranslateY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const diff = y - lastScrollY.value;

      scrollY.value = y;

      if (diff > 5 && y > fabHideThreshold) {
        fabVisible.value = withSpring(0, SPRINGS.settle);
      } else if (diff < -5) {
        fabVisible.value = withSpring(1, SPRINGS.settle);
      }

      headerTitleOpacity.value = interpolate(
        y,
        [titleFadeStart, titleFadeEnd],
        [0, 1],
        Extrapolation.CLAMP
      );

      coverOpacity.value = interpolate(
        y,
        [0, stageHeight * 0.7],
        [1, 0],
        Extrapolation.CLAMP
      );

      coverScale.value = interpolate(
        y,
        [0, stageHeight],
        [1, 0.8],
        Extrapolation.CLAMP
      );

      coverTranslateY.value = interpolate(
        y,
        [0, stageHeight],
        [0, stageHeight * 0.5],
        Extrapolation.CLAMP
      );

      lastScrollY.value = y;
    },
  });

  return {
    scrollY,
    scrollHandler,
    fabVisible,
    headerTitleOpacity,
    coverOpacity,
    coverScale,
    coverTranslateY,
  };
}
