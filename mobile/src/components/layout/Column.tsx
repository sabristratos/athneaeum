import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/themes';
import type { ThemeSpacing } from '@/types/theme';

type SpacingKey = keyof ThemeSpacing;

interface ColumnProps extends ViewProps {
  /** Gap between children */
  gap?: SpacingKey;
  /** Padding on all sides */
  padding?: SpacingKey;
  /** Horizontal padding */
  paddingH?: SpacingKey;
  /** Vertical padding */
  paddingV?: SpacingKey;
  /** Margin on all sides */
  margin?: SpacingKey;
  /** Margin bottom */
  marginB?: SpacingKey;
  /** Margin top */
  marginT?: SpacingKey;
  /** Align items (default: stretch) */
  align?: ViewStyle['alignItems'];
  /** Justify content (default: flex-start) */
  justify?: ViewStyle['justifyContent'];
  /** Flex value */
  flex?: number;
  children?: React.ReactNode;
}

export function Column({
  gap,
  padding,
  paddingH,
  paddingV,
  margin,
  marginB,
  marginT,
  align = 'stretch',
  justify = 'flex-start',
  flex,
  style,
  children,
  ...props
}: ColumnProps) {
  const { theme } = useTheme();

  const computedStyle: ViewStyle = {
    flexDirection: 'column',
    alignItems: align,
    justifyContent: justify,
  };

  if (gap) computedStyle.gap = theme.spacing[gap];
  if (padding) computedStyle.padding = theme.spacing[padding];
  if (paddingH) computedStyle.paddingHorizontal = theme.spacing[paddingH];
  if (paddingV) computedStyle.paddingVertical = theme.spacing[paddingV];
  if (margin) computedStyle.margin = theme.spacing[margin];
  if (marginB) computedStyle.marginBottom = theme.spacing[marginB];
  if (marginT) computedStyle.marginTop = theme.spacing[marginT];
  if (flex !== undefined) computedStyle.flex = flex;

  return (
    <View style={[computedStyle, style]} {...props}>
      {children}
    </View>
  );
}
