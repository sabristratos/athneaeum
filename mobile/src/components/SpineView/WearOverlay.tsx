import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { daysAgo } from '@/utils/dateUtils';
import type { ThemeName } from '@/types/theme';

interface WearOverlayProps {
  age: number;
  themeName: ThemeName;
  height?: number;
}

const MAX_WEAR_OPACITY = 0.15;
const MAX_AGE_DAYS = 365;

export function getBookAge(createdAt: Date | string | null): number {
  if (!createdAt) return 0;
  return daysAgo(createdAt);
}

export const WearOverlay = memo(function WearOverlay({
  age,
  themeName,
  height = 150,
}: WearOverlayProps) {
  const wearIntensity = useMemo(() => {
    const normalizedAge = Math.min(age / MAX_AGE_DAYS, 1);
    return normalizedAge * MAX_WEAR_OPACITY;
  }, [age]);

  if (wearIntensity < 0.02) {
    return null;
  }

  const edgeColor = useMemo(() => {
    switch (themeName) {
      case 'scholar':
        return 'rgba(0, 0, 0, 0.35)';
      case 'dreamer':
        return 'rgba(0, 0, 0, 0.25)';
      case 'wanderer':
        return 'rgba(61, 50, 37, 0.3)';
      default:
        return 'rgba(0, 0, 0, 0.25)';
    }
  }, [themeName]);

  return (
    <View
      style={[StyleSheet.absoluteFill, { opacity: wearIntensity / MAX_WEAR_OPACITY }]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[edgeColor, 'transparent']}
        style={[styles.edgeWear, { height: height * 0.1 }]}
      />
      <LinearGradient
        colors={['transparent', edgeColor]}
        style={[styles.edgeWear, styles.bottomWear, { height: height * 0.1 }]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  edgeWear: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomWear: {
    top: undefined,
    bottom: 0,
  },
});
