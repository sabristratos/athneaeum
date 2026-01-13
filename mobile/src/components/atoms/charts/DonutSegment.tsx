import React, { memo, useEffect } from 'react';
import { Circle, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface DonutSegmentProps {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  percentage: number;
  offset: number;
  color: string;
  isActive?: boolean;
  onPress?: () => void;
}

export const DonutSegment = memo(function DonutSegment({
  cx,
  cy,
  radius,
  strokeWidth,
  percentage,
  offset,
  color,
  isActive = false,
  onPress,
}: DonutSegmentProps) {
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;

  const animatedDashoffset = useSharedValue(circumference);

  useEffect(() => {
    const targetOffset = circumference - (percentage / 100) * circumference;
    animatedDashoffset.value = withTiming(targetOffset, { duration: 800 });
  }, [percentage, circumference, animatedDashoffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedDashoffset.value,
  }));

  const rotation = (offset / 100) * 360 - 90;

  return (
    <G
      onPress={onPress}
      rotation={rotation}
      origin={`${cx}, ${cy}`}
    >
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth={isActive ? strokeWidth + 4 : strokeWidth}
        strokeDasharray={strokeDasharray}
        fill="transparent"
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </G>
  );
});
