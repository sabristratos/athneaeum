import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/themes';

interface VignetteOverlayProps {
  intensity?: 'light' | 'medium' | 'heavy';
  enabled?: boolean;
}

/**
 * An overlay that creates a vignette effect (darkening toward edges).
 * Used in Scholar theme to create archive/library atmosphere.
 * Uses multiple linear gradients to approximate a radial vignette.
 */
export const VignetteOverlay = memo(function VignetteOverlay({
  intensity = 'medium',
  enabled = true,
}: VignetteOverlayProps) {
  const { theme, themeName } = useTheme();

  // Only show vignette for dark themes
  if (!enabled || !theme.isDark) {
    return null;
  }

  const opacityMap = {
    light: 0.15,
    medium: 0.25,
    heavy: 0.4,
  };

  const maxOpacity = opacityMap[intensity];

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top edge */}
      <LinearGradient
        colors={[`rgba(0,0,0,${maxOpacity})`, 'rgba(0,0,0,0)']}
        style={[styles.edge, styles.topEdge]}
      />

      {/* Bottom edge */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${maxOpacity})`]}
        style={[styles.edge, styles.bottomEdge]}
      />

      {/* Left edge */}
      <LinearGradient
        colors={[`rgba(0,0,0,${maxOpacity * 0.7})`, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.edge, styles.leftEdge]}
      />

      {/* Right edge */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${maxOpacity * 0.7})`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.edge, styles.rightEdge]}
      />

      {/* Corner overlays for deeper vignette */}
      <LinearGradient
        colors={[`rgba(0,0,0,${maxOpacity * 0.5})`, 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.corner, styles.topLeftCorner]}
      />

      <LinearGradient
        colors={[`rgba(0,0,0,${maxOpacity * 0.5})`, 'rgba(0,0,0,0)']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.corner, styles.topRightCorner]}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${maxOpacity * 0.5})`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.corner, styles.bottomRightCorner]}
      />

      <LinearGradient
        colors={['rgba(0,0,0,0)', `rgba(0,0,0,${maxOpacity * 0.5})`]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.corner, styles.bottomLeftCorner]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
  edge: {
    position: 'absolute',
  },
  topEdge: {
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  bottomEdge: {
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  leftEdge: {
    top: 0,
    bottom: 0,
    left: 0,
    width: 60,
  },
  rightEdge: {
    top: 0,
    bottom: 0,
    right: 0,
    width: 60,
  },
  corner: {
    position: 'absolute',
    width: 100,
    height: 100,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
  },
  topRightCorner: {
    top: 0,
    right: 0,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
  },
});
