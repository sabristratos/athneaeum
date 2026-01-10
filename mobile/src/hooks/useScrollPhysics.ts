import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useDerivedValue,
  withSpring,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SPRINGS } from '@/animations';

const MAX_TILT_ANGLE = 8;
const VELOCITY_THRESHOLD = 50;
const MAX_VELOCITY = 200;
const SKEW_VELOCITY_THRESHOLD = 150;
const MAX_SKEW_ANGLE = 3;

const MIN_HAPTIC_INTERVAL = 100;

interface SectionBoundary {
  letter: string;
  startIndex: number;
  offsetY: number;
}

interface ScrollPhysicsConfig {
  enableTilt?: boolean;
  enableSkew?: boolean;
  enableSectionHaptics?: boolean;
  sectionBoundaries?: SectionBoundary[];
  itemHeight?: number;
}

interface ScrollPhysicsResult {
  scrollY: SharedValue<number>;
  scrollVelocity: SharedValue<number>;
  tiltAngle: SharedValue<number>;
  skewAngle: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
}

/**
 * Hook that provides scroll-based physics effects for library views.
 * - Tracks scroll velocity
 * - Calculates tilt angle based on velocity (books lean backward on fast scroll)
 * - Calculates skew for high-velocity "warp speed" effect
 * - Triggers haptics when crossing section boundaries
 */
export function useScrollPhysics(config: ScrollPhysicsConfig = {}): ScrollPhysicsResult {
  const {
    enableTilt = true,
    enableSkew = true,
    enableSectionHaptics = true,
    sectionBoundaries = [],
    itemHeight = 100,
  } = config;

  // Scroll position tracking
  const scrollY = useSharedValue(0);
  const prevScrollY = useSharedValue(0);
  const prevTime = useSharedValue(0);
  const scrollVelocity = useSharedValue(0);

  // Section tracking for haptics
  const lastSectionIndex = useSharedValue(-1);
  const lastHapticTimeRef = useRef(0);

  // Haptic trigger (must run on JS thread)
  const triggerSectionHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticTimeRef.current > MIN_HAPTIC_INTERVAL) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      lastHapticTimeRef.current = now;
    }
  }, []);

  // Calculate tilt based on velocity
  const tiltAngle = useDerivedValue(() => {
    if (!enableTilt) return 0;

    const velocity = scrollVelocity.value;
    const absVelocity = Math.abs(velocity);

    if (absVelocity < VELOCITY_THRESHOLD) {
      return withSpring(0, SPRINGS.settle);
    }

    // Map velocity to angle with non-linear response (easeOut feel)
    const clampedVelocity = Math.min(absVelocity, MAX_VELOCITY);
    const normalizedVelocity = clampedVelocity / MAX_VELOCITY;
    const easedVelocity = Math.pow(normalizedVelocity, 0.7);

    // Negative velocity (scrolling down) = negative rotationX (tilt backward)
    const direction = velocity > 0 ? -1 : 1;
    return direction * easedVelocity * MAX_TILT_ANGLE;
  }, [enableTilt]);

  // Calculate skew for high-velocity "warp speed" effect
  const skewAngle = useDerivedValue(() => {
    if (!enableSkew) return 0;

    const absVelocity = Math.abs(scrollVelocity.value);

    if (absVelocity < SKEW_VELOCITY_THRESHOLD) {
      return withSpring(0, SPRINGS.settle);
    }

    // Linear map from threshold to max velocity
    const skewFactor =
      (absVelocity - SKEW_VELOCITY_THRESHOLD) / (MAX_VELOCITY - SKEW_VELOCITY_THRESHOLD);
    const clampedFactor = Math.min(1, skewFactor);

    return clampedFactor * MAX_SKEW_ANGLE;
  }, [enableSkew]);

  // Check section boundary crossing
  const checkSectionBoundary = useCallback(
    (currentY: number) => {
      'worklet';
      if (!enableSectionHaptics || sectionBoundaries.length === 0) return;

      // Find current section based on scroll position
      let currentSection = -1;
      for (let i = sectionBoundaries.length - 1; i >= 0; i--) {
        if (currentY >= sectionBoundaries[i].offsetY - 50) {
          currentSection = i;
          break;
        }
      }

      if (currentSection !== lastSectionIndex.value && lastSectionIndex.value !== -1) {
        // Crossed a boundary - trigger haptic on JS thread
        runOnJS(triggerSectionHaptic)();
      }

      lastSectionIndex.value = currentSection;
    },
    [enableSectionHaptics, sectionBoundaries, triggerSectionHaptic]
  );

  // Animated scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const currentTime = Date.now();

      // Calculate velocity (pixels per millisecond)
      const timeDelta = currentTime - prevTime.value;
      if (timeDelta > 0 && timeDelta < 100) {
        // Ignore large time gaps (e.g., after pause)
        const positionDelta = currentY - prevScrollY.value;
        // Velocity in px/ms, multiply by 16 to approximate px/frame at 60fps
        const newVelocity = (positionDelta / timeDelta) * 16;

        // Smooth velocity changes
        scrollVelocity.value = scrollVelocity.value * 0.7 + newVelocity * 0.3;
      }

      prevScrollY.value = currentY;
      prevTime.value = currentTime;
      scrollY.value = currentY;

      // Check section boundaries for haptics
      checkSectionBoundary(currentY);
    },
    onBeginDrag: () => {
      // Reset timing on new gesture
      prevTime.value = Date.now();
    },
    onMomentumEnd: () => {
      scrollVelocity.value = withSpring(0, SPRINGS.settle);
    },
  });

  return {
    scrollY,
    scrollVelocity,
    tiltAngle,
    skewAngle,
    scrollHandler,
  };
}

/**
 * Builds section boundaries from a list of books for haptic feedback.
 * Groups books by first letter of title.
 */
export function buildSectionBoundaries<T extends { book: { title: string } }>(
  books: T[],
  itemHeight: number = 100
): SectionBoundary[] {
  const boundaries: SectionBoundary[] = [];
  let currentLetter = '';

  books.forEach((item, index) => {
    const firstLetter = item.book.title.charAt(0).toUpperCase();
    if (firstLetter !== currentLetter && /[A-Z]/.test(firstLetter)) {
      boundaries.push({
        letter: firstLetter,
        startIndex: index,
        offsetY: index * itemHeight,
      });
      currentLetter = firstLetter;
    }
  });

  return boundaries;
}
