import React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Card } from '@/components/organisms/cards/Card';
import { useTheme } from '@/themes';

interface SectionSkeletonProps {
  height?: number;
}

export function SectionSkeleton({ height = 200 }: SectionSkeletonProps) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
      <Animated.View style={animatedStyle}>
        <View
          style={{
            height: 20,
            width: '50%',
            backgroundColor: theme.colors.muted,
            borderRadius: theme.radii.sm,
            marginBottom: theme.spacing.sm,
          }}
        />
        <View
          style={{
            height: 14,
            width: '70%',
            backgroundColor: theme.colors.muted,
            borderRadius: theme.radii.sm,
            marginBottom: theme.spacing.md,
          }}
        />
        <View
          style={{
            height: height,
            backgroundColor: theme.colors.muted,
            borderRadius: theme.radii.md,
          }}
        />
      </Animated.View>
    </Card>
  );
}
