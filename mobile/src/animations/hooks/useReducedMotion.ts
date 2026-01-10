import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useReducedMotion as useReanimatedReducedMotion } from 'react-native-reanimated';

export function useReducedMotion(): boolean {
  const reanimatedReducedMotion = useReanimatedReducedMotion();
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion
    );

    return () => subscription.remove();
  }, []);

  return reanimatedReducedMotion || systemReducedMotion;
}
