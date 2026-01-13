import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  runOnJS,
  runOnUI,
  type SharedValue,
} from 'react-native-reanimated';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptic';
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

type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

interface ScrollPhysicsResult {
  scrollY: SharedValue<number>;
  scrollVelocity: SharedValue<number>;
  tiltAngle: SharedValue<number>;
  skewAngle: SharedValue<number>;
  scrollHandler: ScrollHandler;
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
      triggerHaptic('heavy');
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

  // Check section boundary crossing (runs on UI thread)
  const checkSectionBoundaryWorklet = useCallback(
    (currentY: number) => {
      'worklet';
      if (!enableSectionHaptics || sectionBoundaries.length === 0) return;

      let currentSection = -1;
      for (let i = sectionBoundaries.length - 1; i >= 0; i--) {
        if (currentY >= sectionBoundaries[i].offsetY - 50) {
          currentSection = i;
          break;
        }
      }

      if (currentSection !== lastSectionIndex.value && lastSectionIndex.value !== -1) {
        runOnJS(triggerSectionHaptic)();
      }

      lastSectionIndex.value = currentSection;
    },
    [enableSectionHaptics, sectionBoundaries, triggerSectionHaptic]
  );

  // UI thread worklet to process scroll data
  const processScrollOnUI = useCallback(
    (currentY: number, currentTime: number) => {
      'worklet';
      const timeDelta = currentTime - prevTime.value;
      if (timeDelta > 0 && timeDelta < 100) {
        const positionDelta = currentY - prevScrollY.value;
        const newVelocity = (positionDelta / timeDelta) * 16;
        scrollVelocity.value = scrollVelocity.value * 0.7 + newVelocity * 0.3;
      }

      prevScrollY.value = currentY;
      prevTime.value = currentTime;
      scrollY.value = currentY;

      checkSectionBoundaryWorklet(currentY);
    },
    [scrollY, scrollVelocity, prevScrollY, prevTime, checkSectionBoundaryWorklet]
  );

  // Regular scroll handler compatible with FlashList v2
  const scrollHandler: ScrollHandler = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const currentTime = Date.now();
      runOnUI(processScrollOnUI)(currentY, currentTime);
    },
    [processScrollOnUI]
  );

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
