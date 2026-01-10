import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

interface ParallaxConfig {
  /** Maximum rotation angle in degrees (default: 8) */
  maxAngle?: number;
  /** Enable/disable the effect (default: true) */
  enabled?: boolean;
  /** Spring damping (default: 15) */
  damping?: number;
  /** Spring stiffness (default: 150) */
  stiffness?: number;
  /** Accelerometer update interval in ms (default: 100) */
  updateInterval?: number;
}

interface ParallaxResult {
  /** Animated style to apply to the container */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Current tilt values (for debugging) */
  tiltX: SharedValue<number>;
  tiltY: SharedValue<number>;
}

/**
 * Hook that creates a 3D parallax effect based on device tilt.
 * Uses accelerometer data to detect device orientation and applies
 * subtle rotations to create a "floating" card effect.
 *
 * @example
 * ```tsx
 * const { animatedStyle } = useGyroscopeParallax({ maxAngle: 10 });
 *
 * return (
 *   <Animated.View style={[styles.card, animatedStyle]}>
 *     <Image source={coverImage} />
 *   </Animated.View>
 * );
 * ```
 */
export function useGyroscopeParallax(config: ParallaxConfig = {}): ParallaxResult {
  const {
    maxAngle = 8,
    enabled = true,
    damping = 15,
    stiffness = 150,
    updateInterval = 100,
  } = config;

  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') {
      return;
    }

    const springConfig = { damping, stiffness, mass: 0.5 };

    Accelerometer.setUpdateInterval(updateInterval);

    subscriptionRef.current = Accelerometer.addListener(({ x, y }) => {
      // Clamp accelerometer values to reasonable range
      const clampedX = Math.max(-0.5, Math.min(0.5, x));
      const clampedY = Math.max(-0.5, Math.min(0.5, y));

      const targetX = clampedY * maxAngle * 2;
      const targetY = clampedX * maxAngle * 2;

      // Update shared values directly - Reanimated handles UI thread sync
      tiltX.value = withSpring(targetX, springConfig);
      tiltY.value = withSpring(targetY, springConfig);
    });

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [enabled, maxAngle, damping, stiffness, updateInterval]);

  // Create animated style with 3D transforms
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 800 },
        { rotateX: `${tiltX.value}deg` },
        { rotateY: `${-tiltY.value}deg` },
      ],
    };
  });

  return {
    animatedStyle,
    tiltX,
    tiltY,
  };
}

/**
 * Check if accelerometer is available on the device.
 */
export function isGyroscopeAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(false);
  }
  return Accelerometer.isAvailableAsync();
}
