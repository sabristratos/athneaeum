import React, { useCallback, useImperativeHandle, forwardRef, useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Confetti } from 'react-native-fast-confetti';
import { useReducedMotion } from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { CELEBRATION } from '@/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface RatingCelebrationRef {
  trigger: () => void;
}

interface RatingCelebrationProps {
  containerWidth?: number;
}

export const RatingCelebration = forwardRef<RatingCelebrationRef, RatingCelebrationProps>(
  function RatingCelebration({ containerWidth = 180 }, ref) {
    const { theme } = useTheme();
    const [isActive, setIsActive] = useState(false);
    const reducedMotion = useReducedMotion();

    const confettiColors = useMemo(() => [
      theme.colors.primary,
      theme.colors.accent,
      theme.colors.success,
      theme.colors.primaryHover,
    ], [theme.colors.primary, theme.colors.accent, theme.colors.success, theme.colors.primaryHover]);

    const cannonsPositions = useMemo(() => [
      { x: containerWidth / 2, y: 0 },
    ], [containerWidth]);

    const trigger = useCallback(() => {
      if (reducedMotion) return;
      setIsActive(true);
    }, [reducedMotion]);

    const handleAnimationEnd = useCallback(() => {
      setIsActive(false);
    }, []);

    useImperativeHandle(ref, () => ({ trigger }), [trigger]);

    if (!isActive || reducedMotion) return null;

    return (
      <View style={styles.container} pointerEvents="none">
        <Confetti
          count={CELEBRATION.confettiCount}
          flakeSize={{ width: 8, height: 8 }}
          colors={confettiColors}
          autoplay={true}
          isInfinite={false}
          fallDuration={CELEBRATION.confettiDuration}
          onAnimationEnd={handleAnimationEnd}
          fadeOutOnEnd={true}
          cannonsPositions={cannonsPositions}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT * 0.5}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
    zIndex: 100,
  },
});
