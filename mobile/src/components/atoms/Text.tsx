import React from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/themes';

export type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'caption' | 'label';
type TextColor = 'default' | 'muted' | 'primary' | 'success' | 'danger' | 'accent';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  muted?: boolean;
  center?: boolean;
  bold?: boolean;
  children: React.ReactNode;
}

const fontSizes: Record<TextVariant, number> = {
  h1: 30,
  h2: 24,
  h3: 20,
  bodyLarge: 18,
  body: 16,
  caption: 14,
  label: 12,
};

export function Text({
  variant = 'body',
  color = 'default',
  muted = false,
  center = false,
  bold = false,
  style,
  children,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  const isHeading = variant.startsWith('h');
  const isLabel = variant === 'label';
  const fontSize = fontSizes[variant];

  // Compute color
  let colorValue: string;
  if (muted || color === 'muted') colorValue = theme.colors.foregroundMuted;
  else if (color === 'primary') colorValue = theme.colors.primary;
  else if (color === 'success') colorValue = theme.colors.success;
  else if (color === 'danger') colorValue = theme.colors.danger;
  else if (color === 'accent') colorValue = theme.colors.accent;
  else colorValue = theme.colors.foreground;

  // Compute font weight
  let fontWeight: TextStyle['fontWeight'];
  if (bold) fontWeight = theme.fontWeights.bold as TextStyle['fontWeight'];
  else if (isHeading) fontWeight = theme.fontWeights.semibold as TextStyle['fontWeight'];
  else if (isLabel) fontWeight = theme.fontWeights.medium as TextStyle['fontWeight'];
  else fontWeight = theme.fontWeights.normal as TextStyle['fontWeight'];

  // Compute line height (must be rounded to avoid Android text clipping issues)
  let lineHeight: number;
  if (isHeading || variant === 'caption' || variant === 'label') {
    lineHeight = Math.round(fontSize * theme.lineHeights.tight);
  } else {
    lineHeight = Math.round(fontSize * theme.lineHeights.normal);
  }

  // Compute letter spacing
  let letterSpacing: number;
  if (isLabel) letterSpacing = theme.letterSpacing.wide;
  else if (isHeading) letterSpacing = theme.letterSpacing.tight;
  else letterSpacing = theme.letterSpacing.normal;

  return (
    <RNText
      style={[
        {
          color: colorValue,
          fontSize,
          fontFamily: isHeading ? theme.fonts.heading : theme.fonts.body,
          fontWeight,
          letterSpacing,
          textTransform: isLabel ? 'uppercase' : 'none',
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
      accessibilityRole={isHeading ? 'header' : undefined}
      {...props}
    >
      {children}
    </RNText>
  );
}
