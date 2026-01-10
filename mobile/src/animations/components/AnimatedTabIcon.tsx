import React, { useEffect, memo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useThemeAnimation } from '../hooks/useThemeAnimation';
import { iconSizes } from '@/themes/shared';

interface AnimatedTabIconProps {
  icon: IconSvgElement;
  color: string;
  focused: boolean;
}

export const AnimatedTabIcon = memo(function AnimatedTabIcon({
  icon,
  color,
  focused,
}: AnimatedTabIconProps) {
  const { spring, scales, reducedMotion } = useThemeAnimation();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      if (reducedMotion) {
        scale.value = scales.emphasis;
      } else {
        scale.value = withSequence(
          withSpring(scales.emphasis, spring.emphasis),
          withSpring(1.05, spring.press)
        );
        rotation.value = withSequence(
          withSpring(3, spring.emphasis),
          withSpring(-3, spring.emphasis),
          withSpring(0, spring.press)
        );
      }
    } else {
      scale.value = reducedMotion ? 1 : withSpring(1, spring.press);
      rotation.value = reducedMotion ? 0 : withSpring(0, spring.press);
    }
  }, [focused, reducedMotion, spring, scales, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <HugeiconsIcon icon={icon} size={iconSizes.lg} color={color} />
    </Animated.View>
  );
});
