import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/themes';

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;

function SkeletonCard() {
  const { theme } = useTheme();

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.cover,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.md,
          },
        ]}
      />
      <View
        style={[
          styles.titleSkeleton,
          { backgroundColor: theme.colors.surface },
        ]}
      />
      <View
        style={[
          styles.authorSkeleton,
          { backgroundColor: theme.colors.surface },
        ]}
      />
    </View>
  );
}

function SkeletonSection() {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <View
        style={[
          styles.sectionTitle,
          { backgroundColor: theme.colors.surface },
        ]}
      />
      <View style={styles.cardsRow}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    </View>
  );
}

export function DiscoverySkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonSection />
      <SkeletonSection />
      <SkeletonSection />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    height: 24,
    width: 180,
    borderRadius: 4,
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  titleSkeleton: {
    height: 14,
    width: 100,
    borderRadius: 4,
    marginTop: 8,
  },
  authorSkeleton: {
    height: 12,
    width: 70,
    borderRadius: 4,
    marginTop: 4,
  },
});
