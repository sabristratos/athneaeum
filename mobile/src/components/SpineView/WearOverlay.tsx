import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { ThemeName } from '@/types/theme';

interface WearOverlayProps {
  /** Age in days since book was added */
  age: number;
  themeName: ThemeName;
  height?: number;
}

// Maximum wear intensity (at 1 year old)
const MAX_WEAR_OPACITY = 0.15;
const MAX_AGE_DAYS = 365;

/**
 * Calculate the age in days from a date string or Date object
 */
export function getBookAge(createdAt: Date | string | null): number {
  if (!createdAt) return 0;
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Age-based wear overlay for book spines.
 * Simulates natural wear and tear that accumulates over time:
 * - Edge darkening at top and bottom
 * - Subtle center wear line
 * - Intensity increases with book age (max at 1 year)
 */
export const WearOverlay = memo(function WearOverlay({
  age,
  themeName,
  height = 150,
}: WearOverlayProps) {
  // Calculate wear intensity (capped at 1 year)
  const wearIntensity = useMemo(() => {
    const normalizedAge = Math.min(age / MAX_AGE_DAYS, 1);
    return normalizedAge * MAX_WEAR_OPACITY;
  }, [age]);

  // Skip rendering for very new books
  if (wearIntensity < 0.02) {
    return null;
  }

  // Theme-specific wear colors
  const wearColors = useMemo(() => {
    switch (themeName) {
      case 'scholar':
        return {
          edge: 'rgba(0, 0, 0, 0.3)',
          center: 'rgba(139, 46, 46, 0.1)', // Burgundy tint
        };
      case 'dreamer':
        return {
          edge: 'rgba(0, 0, 0, 0.2)',
          center: 'rgba(139, 122, 158, 0.08)', // Lavender tint
        };
      case 'wanderer':
        return {
          edge: 'rgba(61, 50, 37, 0.25)',
          center: 'rgba(184, 115, 51, 0.1)', // Copper tint
        };
      default:
        return {
          edge: 'rgba(0, 0, 0, 0.2)',
          center: 'rgba(0, 0, 0, 0.05)',
        };
    }
  }, [themeName]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity: wearIntensity / MAX_WEAR_OPACITY }]}
      pointerEvents="none"
    >
      {/* Top edge wear - gradient from dark to transparent */}
      <LinearGradient
        colors={[wearColors.edge, 'transparent']}
        style={[styles.edgeWear, styles.topWear, { height: height * 0.08 }]}
      />

      {/* Bottom edge wear - gradient from transparent to dark */}
      <LinearGradient
        colors={['transparent', wearColors.edge]}
        style={[styles.edgeWear, styles.bottomWear, { height: height * 0.08 }]}
      />

      {/* Center wear line - subtle horizontal mark */}
      <View
        style={[
          styles.centerWear,
          {
            top: height * 0.45,
            height: height * 0.1,
            backgroundColor: wearColors.center,
          },
        ]}
      />

      {/* Corner wear - subtle darkening at corners */}
      <View
        style={[
          styles.cornerWear,
          styles.topLeftCorner,
          { backgroundColor: wearColors.edge },
        ]}
      />
      <View
        style={[
          styles.cornerWear,
          styles.topRightCorner,
          { backgroundColor: wearColors.edge },
        ]}
      />
      <View
        style={[
          styles.cornerWear,
          styles.bottomLeftCorner,
          { backgroundColor: wearColors.edge },
        ]}
      />
      <View
        style={[
          styles.cornerWear,
          styles.bottomRightCorner,
          { backgroundColor: wearColors.edge },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  edgeWear: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topWear: {
    top: 0,
  },
  bottomWear: {
    bottom: 0,
  },
  centerWear: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0.5,
  },
  cornerWear: {
    position: 'absolute',
    width: 4,
    height: 4,
    opacity: 0.3,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderBottomRightRadius: 4,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderBottomLeftRadius: 4,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderTopRightRadius: 4,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 4,
  },
});
