import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/themes';

interface TextureBackgroundProps {
  children: React.ReactNode;
}

/**
 * A background component with the theme's canvas color.
 * Note: SVG noise filters don't work on React Native, so we use a simple background.
 */
export function TextureBackground({ children }: TextureBackgroundProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.canvas }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
