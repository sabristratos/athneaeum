import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/themes';
import type { ThemeSpacing } from '@/types/theme';

type SpacingKey = keyof ThemeSpacing;

interface RowProps extends ViewProps {
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
  /** Align items (default: center) */
  align?: ViewStyle['alignItems'];
  /** Justify content (default: flex-start) */
  justify?: ViewStyle['justifyContent'];
  /** Allow wrapping */
  wrap?: boolean;
  /** Flex value */
  flex?: number;
  children?: React.ReactNode;
}

export function Row({
  gap,
  padding,
  paddingH,
  paddingV,
  margin,
  marginB,
  marginT,
  align = 'center',
  justify = 'flex-start',
  wrap = false,
  flex,
  style,
  children,
  ...props
}: RowProps) {
  const { theme } = useTheme();

  const computedStyle: ViewStyle = {
    flexDirection: 'row',
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
  if (wrap) computedStyle.flexWrap = 'wrap';
  if (flex !== undefined) computedStyle.flex = flex;

  return (
    <View style={[computedStyle, style]} {...props}>
      {children}
    </View>
  );
}
