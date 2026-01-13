import { useCallback, useRef } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useTheme } from '@/themes';
import { SPRINGS, CELEBRATION } from '../constants';
import type { RatingIconType } from '@/components/atoms/icons/RatingIcon';

export type CelebrationType = 'glint' | 'bloom' | 'spin' | 'glow';

const ICON_TO_CELEBRATION: Record<RatingIconType, CelebrationType> = {
  star: 'glint',
  heart: 'bloom',
  compass: 'spin',
  moon: 'glow',
};

interface UseCelebrationAnimationOptions {
  onCelebrationStart?: () => void;
  onCelebrationEnd?: () => void;
}

interface UseCelebrationAnimationResult {
  triggerCelebration: () => void;
  isCelebrating: boolean;
  celebrationType: CelebrationType;
  scale: { value: number };
  rotation: { value: number };
  glowOpacity: { value: number };
  glintProgress: { value: number };
  celebrationStyle: ReturnType<typeof useAnimatedStyle>;
  glintStyle: ReturnType<typeof useAnimatedStyle>;
  glowStyle: ReturnType<typeof useAnimatedStyle>;
}

export function useCelebrationAnimation(
  options: UseCelebrationAnimationOptions = {}
): UseCelebrationAnimationResult {
  const { onCelebrationStart, onCelebrationEnd } = options;
  const { theme } = useTheme();
  const iconType = theme.icons.rating as RatingIconType;
  const celebrationType = ICON_TO_CELEBRATION[iconType];

  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glintProgress = useSharedValue(0);
  const isCelebratingRef = useRef(false);
  const cooldownRef = useRef(false);

  const handleCelebrationEnd = useCallback(() => {
    isCelebratingRef.current = false;
    onCelebrationEnd?.();

    setTimeout(() => {
      cooldownRef.current = false;
    }, CELEBRATION.cooldownMs);
  }, [onCelebrationEnd]);

  const triggerCelebration = useCallback(() => {
    if (isCelebratingRef.current || cooldownRef.current) return;

    isCelebratingRef.current = true;
    cooldownRef.current = true;
    onCelebrationStart?.();

    triggerHaptic('success');

    switch (celebrationType) {
      case 'bloom':
        scale.value = withSequence(
          withSpring(CELEBRATION.bloomScale, SPRINGS.soft),
          withSpring(CELEBRATION.bloomSettleScale, SPRINGS.bouncy),
          withSpring(1, SPRINGS.gentle, () => {
            runOnJS(handleCelebrationEnd)();
          })
        );
        break;

      case 'spin':
        rotation.value = withSequence(
          withTiming(15, { duration: 50 }),
          withTiming(-10, { duration: 40 }),
          withTiming(CELEBRATION.spinDegrees, {
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
          }, () => {
            runOnJS(handleCelebrationEnd)();
          })
        );
        setTimeout(() => {
          rotation.value = 0;
        }, 400);
        break;

      case 'glow':
        scale.value = withSequence(
          withSpring(1.15, SPRINGS.soft),
          withSpring(1, SPRINGS.gentle)
        );
        glowOpacity.value = withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(CELEBRATION.glowOpacity, { duration: 150 }),
          withTiming(0, { duration: 150 }, () => {
            runOnJS(handleCelebrationEnd)();
          })
        );
        break;

      case 'glint':
      default:
        glintProgress.value = 0;
        glintProgress.value = withTiming(1, {
          duration: CELEBRATION.glintDuration,
          easing: Easing.out(Easing.cubic),
        }, () => {
          runOnJS(handleCelebrationEnd)();
        });
        scale.value = withSequence(
          withDelay(100, withSpring(1.1, SPRINGS.snappy)),
          withSpring(1, SPRINGS.gentle)
        );
        break;
    }
  }, [
    celebrationType,
    scale,
    rotation,
    glowOpacity,
    glintProgress,
    onCelebrationStart,
    handleCelebrationEnd,
  ]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const glintStyle = useAnimatedStyle(() => ({
    opacity: glintProgress.value > 0 && glintProgress.value < 1 ? 0.8 : 0,
    transform: [{ translateX: (glintProgress.value * 2 - 1) * 24 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return {
    triggerCelebration,
    isCelebrating: isCelebratingRef.current,
    celebrationType,
    scale,
    rotation,
    glowOpacity,
    glintProgress,
    celebrationStyle,
    glintStyle,
    glowStyle,
  };
}