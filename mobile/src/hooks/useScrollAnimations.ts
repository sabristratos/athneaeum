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
  /** scrollY at which header title starts fading in (default: 150) */
  titleFadeStart?: number;
  /** scrollY at which header title is fully visible (default: 250) */
  titleFadeEnd?: number;
  /** scrollY threshold after which FAB hides on scroll down (default: 100) */
  fabHideThreshold?: number;
  /** Height of the hero/stage section for parallax calculations */
  stageHeight?: number;
}

interface ScrollAnimationsResult {
  /** Current scroll position */
  scrollY: SharedValue<number>;
  /** Scroll handler to attach to Animated.ScrollView */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** FAB visibility (0 = hidden, 1 = visible) */
  fabVisible: SharedValue<number>;
  /** Header title opacity (0-1) */
  headerTitleOpacity: SharedValue<number>;
  /** Cover parallax opacity (1-0 as scrolled) */
  coverOpacity: SharedValue<number>;
  /** Cover parallax scale (1-0.8 as scrolled) */
  coverScale: SharedValue<number>;
  /** Cover parallax translateY (0-stageHeight*0.5 as scrolled) */
  coverTranslateY: SharedValue<number>;
}

/**
 * Hook that manages scroll-based animations for the Book Detail screen.
 * Returns shared values and a scroll handler for:
 * - FAB hide/show on scroll direction
 * - Header title fade in/out
 * - Cover parallax (scale, opacity, translateY)
 */
export function useScrollAnimations(
  config: ScrollAnimationsConfig = {}
): ScrollAnimationsResult {
  const {
    titleFadeStart = 150,
    titleFadeEnd = 250,
    fabHideThreshold = 100,
    stageHeight = 350,
  } = config;

  // Scroll position tracking
  const scrollY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);

  // FAB visibility (1 = visible, 0 = hidden)
  const fabVisible = useSharedValue(1);

  // Header title opacity (0 = invisible, 1 = fully visible)
  const headerTitleOpacity = useSharedValue(0);

  // Cover parallax values
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

      // Header title: fade in as main title scrolls out of view
      headerTitleOpacity.value = interpolate(
        y,
        [titleFadeStart, titleFadeEnd],
        [0, 1],
        Extrapolation.CLAMP
      );

      // Cover parallax: scale, opacity, translateY
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
