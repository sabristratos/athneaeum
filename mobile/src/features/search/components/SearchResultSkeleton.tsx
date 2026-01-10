import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Card } from '@/components';
import { useTheme } from '@/themes';

function SkeletonBox({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radii.sm,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SearchResultSkeleton() {
  const { theme } = useTheme();

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <SkeletonBox width={80} height={120} />

        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SkeletonBox width="80%" height={20} />
          <SkeletonBox width="50%" height={16} />
          <SkeletonBox width="30%" height={14} />
          <SkeletonBox width="100%" height={40} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <SkeletonBox width={100} height={32} />
            <SkeletonBox width={80} height={32} />
          </View>
        </View>
      </View>
    </Card>
  );
}

export function SearchResultSkeletonList({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SearchResultSkeleton key={index} />
      ))}
    </>
  );
}
