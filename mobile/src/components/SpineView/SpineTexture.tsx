import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { ThemeName } from '@/types/theme';

interface TextureConfig {
  opacity: number;
  lineCount: number;
}

const TEXTURE_CONFIGS: Record<ThemeName, TextureConfig> = {
  scholar: {
    opacity: 0.06,
    lineCount: 15,
  },
  dreamer: {
    opacity: 0.04,
    lineCount: 10,
  },
  wanderer: {
    opacity: 0.05,
    lineCount: 12,
  },
};

interface SpineTextureProps {
  themeName: ThemeName;
  width?: number;
  height?: number;
}

/**
 * Simple texture overlay for book spines using native Views.
 * Creates a subtle grain effect with horizontal lines.
 */
export const SpineTexture = memo(function SpineTexture({
  themeName,
}: SpineTextureProps) {
  const config = TEXTURE_CONFIGS[themeName];

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        styles.texture,
        { opacity: config.opacity },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: config.lineCount }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.grainLine,
            {
              top: `${(i + 1) * (100 / (config.lineCount + 1))}%`,
              opacity: i % 3 === 0 ? 0.4 : 0.2,
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  texture: {
    overflow: 'hidden',
  },
  grainLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
  },
});
