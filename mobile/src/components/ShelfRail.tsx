import React, { memo } from 'react';
import { View, StyleSheet, type DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/themes';

interface ShelfRailProps {
  width?: DimensionValue;
}

/**
 * A visual "rail" or "ledge" that sits behind books to create depth.
 * Different styling per theme:
 * - Scholar: Sharp edges with dramatic shadow
 * - Dreamer: Soft, rounded cloud-like surface
 * - Wanderer: Parchment-textured with worn edges
 */
export const ShelfRail = memo(function ShelfRail({ width = '100%' }: ShelfRailProps) {
  const { theme, themeName } = useTheme();

  if (themeName === 'scholar') {
    return (
      <View style={[styles.container, { width }]}>
        {/* Top highlight line */}
        <View
          style={[
            styles.topHighlight,
            {
              backgroundColor: theme.colors.border,
              height: 1,
            },
          ]}
        />
        {/* Rail surface */}
        <View
          style={[
            styles.railSurface,
            {
              backgroundColor: theme.colors.surfaceAlt,
              height: 6,
            },
          ]}
        />
        {/* Bottom shadow */}
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)']}
          style={[styles.bottomShadow, { height: 4 }]}
        />
      </View>
    );
  }

  if (themeName === 'dreamer') {
    return (
      <View style={[styles.container, { width }]}>
        {/* Soft cloud-like surface */}
        <View
          style={[
            styles.dreamerSurface,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radii.lg,
              height: 12,
              ...theme.shadows.sm,
            },
          ]}
        />
      </View>
    );
  }

  // Wanderer theme
  return (
    <View style={[styles.container, { width }]}>
      {/* Parchment-textured rail */}
      <LinearGradient
        colors={[theme.colors.surfaceAlt, theme.colors.surface, theme.colors.surfaceAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.wandererSurface,
          {
            borderRadius: theme.radii.sm,
            height: 8,
          },
        ]}
      />
      {/* Worn edge effect */}
      <View
        style={[
          styles.wornEdge,
          {
            backgroundColor: theme.colors.border,
            height: 2,
            borderRadius: theme.radii.sm,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  topHighlight: {
    width: '100%',
  },
  railSurface: {
    width: '100%',
  },
  bottomShadow: {
    width: '100%',
  },
  dreamerSurface: {
    width: '100%',
  },
  wandererSurface: {
    width: '100%',
  },
  wornEdge: {
    width: '100%',
    marginTop: 1,
  },
});
