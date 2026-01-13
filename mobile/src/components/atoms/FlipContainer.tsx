import React, { useCallback } from 'react';
import { View, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { SPRINGS, TRANSFORMS } from '@/animations';

export interface FlipContainerProps {
  isFlipped: boolean;
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  onFlip?: () => void;
  perspective?: number;
  style?: StyleProp<ViewStyle>;
  frontStyle?: StyleProp<ViewStyle>;
  backStyle?: StyleProp<ViewStyle>;
}

export function FlipContainer({
  isFlipped,
  frontContent,
  backContent,
  onFlip,
  perspective = TRANSFORMS.perspectiveDefault + 200,
  style,
  frontStyle,
  backStyle,
}: FlipContainerProps) {
  const rotation = useSharedValue(isFlipped ? 180 : 0);

  React.useEffect(() => {
    rotation.value = withSpring(isFlipped ? 180 : 0, SPRINGS.dramatic);
    if (onFlip) {
      triggerHaptic('medium');
    }
  }, [isFlipped, onFlip, rotation]);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [0, 180],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
      opacity: interpolate(
        rotation.value,
        [0, 90, 180],
        [1, 0, 0],
        Extrapolation.CLAMP
      ),
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(
      rotation.value,
      [0, 180],
      [180, 360],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { perspective },
        { rotateY: `${rotateY}deg` },
      ],
      backfaceVisibility: 'hidden' as const,
      opacity: interpolate(
        rotation.value,
        [0, 90, 180],
        [0, 0, 1],
        Extrapolation.CLAMP
      ),
    };
  });

  return (
    <View style={style}>
      <Animated.View
        style={[
          { position: 'absolute', width: '100%', height: '100%' },
          frontStyle,
          frontAnimatedStyle,
        ]}
      >
        {frontContent}
      </Animated.View>

      <Animated.View
        style={[
          { position: 'absolute', width: '100%', height: '100%' },
          backStyle,
          backAnimatedStyle,
        ]}
      >
        {backContent}
      </Animated.View>
    </View>
  );
}