import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components';
import { SkeletonShimmer } from '@/animations';
import { useTheme } from '@/themes';

export function SearchResultSkeleton() {
  const { theme } = useTheme();

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <SkeletonShimmer width={80} height={120} />

        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <SkeletonShimmer width="80%" height={20} />
          <SkeletonShimmer width="50%" height={16} />
          <SkeletonShimmer width="30%" height={14} />
          <SkeletonShimmer width="100%" height={40} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <SkeletonShimmer width={100} height={32} />
            <SkeletonShimmer width={80} height={32} />
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
