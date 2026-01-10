import React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/themes';
import type { ThemeSpacing } from '@/types/theme';

type SpacingKey = keyof ThemeSpacing;

interface BoxProps extends ViewProps {
  /** Padding on all sides */
  padding?: SpacingKey;
  /** Horizontal padding (paddingLeft + paddingRight) */
  paddingH?: SpacingKey;
  /** Vertical padding (paddingTop + paddingBottom) */
  paddingV?: SpacingKey;
  /** Padding top */
  paddingT?: SpacingKey;
  /** Padding bottom */
  paddingB?: SpacingKey;
  /** Padding left */
  paddingL?: SpacingKey;
  /** Padding right */
  paddingR?: SpacingKey;
  /** Margin on all sides */
  margin?: SpacingKey;
  /** Horizontal margin (marginLeft + marginRight) */
  marginH?: SpacingKey;
  /** Vertical margin (marginTop + marginBottom) */
  marginV?: SpacingKey;
  /** Margin top */
  marginT?: SpacingKey;
  /** Margin bottom */
  marginB?: SpacingKey;
  /** Margin left */
  marginL?: SpacingKey;
  /** Margin right */
  marginR?: SpacingKey;
  /** Gap between children (requires flexbox) */
  gap?: SpacingKey;
  /** Background color using theme color key */
  bg?: 'canvas' | 'surface' | 'surfaceAlt' | 'surfaceHover' | 'primary' | 'transparent';
  /** Border radius using theme radii key */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Flex value */
  flex?: number;
  /** Align items */
  align?: ViewStyle['alignItems'];
  /** Justify content */
  justify?: ViewStyle['justifyContent'];
  children?: React.ReactNode;
}

export function Box({
  padding,
  paddingH,
  paddingV,
  paddingT,
  paddingB,
  paddingL,
  paddingR,
  margin,
  marginH,
  marginV,
  marginT,
  marginB,
  marginL,
  marginR,
  gap,
  bg,
  radius,
  flex,
  align,
  justify,
  style,
  children,
  ...props
}: BoxProps) {
  const { theme } = useTheme();

  const computedStyle: ViewStyle = {};

  // Padding
  if (padding) computedStyle.padding = theme.spacing[padding];
  if (paddingH) computedStyle.paddingHorizontal = theme.spacing[paddingH];
  if (paddingV) computedStyle.paddingVertical = theme.spacing[paddingV];
  if (paddingT) computedStyle.paddingTop = theme.spacing[paddingT];
  if (paddingB) computedStyle.paddingBottom = theme.spacing[paddingB];
  if (paddingL) computedStyle.paddingLeft = theme.spacing[paddingL];
  if (paddingR) computedStyle.paddingRight = theme.spacing[paddingR];

  // Margin
  if (margin) computedStyle.margin = theme.spacing[margin];
  if (marginH) computedStyle.marginHorizontal = theme.spacing[marginH];
  if (marginV) computedStyle.marginVertical = theme.spacing[marginV];
  if (marginT) computedStyle.marginTop = theme.spacing[marginT];
  if (marginB) computedStyle.marginBottom = theme.spacing[marginB];
  if (marginL) computedStyle.marginLeft = theme.spacing[marginL];
  if (marginR) computedStyle.marginRight = theme.spacing[marginR];

  // Gap
  if (gap) computedStyle.gap = theme.spacing[gap];

  // Background
  if (bg === 'transparent') {
    computedStyle.backgroundColor = 'transparent';
  } else if (bg) {
    computedStyle.backgroundColor = theme.colors[bg];
  }

  // Border radius
  if (radius) computedStyle.borderRadius = theme.radii[radius];

  // Flex
  if (flex !== undefined) computedStyle.flex = flex;

  // Alignment
  if (align) computedStyle.alignItems = align;
  if (justify) computedStyle.justifyContent = justify;

  return (
    <View style={[computedStyle, style]} {...props}>
      {children}
    </View>
  );
}
