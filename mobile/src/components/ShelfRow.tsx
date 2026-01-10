import React, { memo, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/themes';
import { ShelfRail } from './ShelfRail';

interface ShelfRowProps {
  children: ReactNode;
  showRail?: boolean;
  style?: object;
}

/**
 * A row wrapper that contains books and displays a shelf rail behind them.
 * Creates the visual effect of books sitting on a physical shelf.
 */
export const ShelfRow = memo(function ShelfRow({
  children,
  showRail = true,
  style,
}: ShelfRowProps) {
  const { theme, themeName } = useTheme();

  // Calculate padding based on theme
  const paddingBottom = themeName === 'dreamer' ? theme.spacing.md : theme.spacing.sm;

  return (
    <View style={[styles.container, { paddingBottom }, style]}>
      {/* Books container */}
      <View style={styles.booksContainer}>{children}</View>

      {/* Shelf rail behind books */}
      {showRail && <ShelfRail />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  booksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    zIndex: 1,
  },
});
