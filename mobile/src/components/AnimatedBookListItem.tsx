import React, { memo } from 'react';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { BookListItem } from '@/components/BookListItem';
import type { UserBook } from '@/types';

interface AnimatedBookListItemProps {
  item: UserBook;
  index: number;
  onPress: (item: UserBook) => void;
  tiltAngle: SharedValue<number>;
  skewAngle: SharedValue<number>;
  enablePhysics?: boolean;
}

/**
 * Physics-enabled wrapper that applies scroll transforms.
 * Separated to avoid useAnimatedStyle overhead when physics is disabled.
 */
const PhysicsBookItem = memo(function PhysicsBookItem({
  item,
  index,
  onPress,
  tiltAngle,
  skewAngle,
}: Omit<AnimatedBookListItemProps, 'enablePhysics'>) {
  // Calculate skew direction based on row index
  const skewDirection = index % 2 === 0 ? 1 : -1;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${tiltAngle.value}deg` },
        { skewX: `${skewAngle.value * skewDirection}deg` },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <BookListItem item={item} onPress={onPress} />
    </Animated.View>
  );
});

/**
 * A wrapper around BookListItem that optionally applies scroll physics transforms.
 * - rotationX based on scroll velocity (tilt effect)
 * - skewX at high velocities (warp speed effect)
 * - Alternating skew direction per row for visual interest
 *
 * When enablePhysics=false, renders BookListItem directly without animation overhead.
 */
export const AnimatedBookListItem = memo(function AnimatedBookListItem({
  item,
  index,
  onPress,
  tiltAngle,
  skewAngle,
  enablePhysics = true,
}: AnimatedBookListItemProps) {
  // When physics disabled, render plain BookListItem without animation wrapper
  if (!enablePhysics) {
    return <BookListItem item={item} onPress={onPress} />;
  }

  return (
    <PhysicsBookItem
      item={item}
      index={index}
      onPress={onPress}
      tiltAngle={tiltAngle}
      skewAngle={skewAngle}
    />
  );
});
