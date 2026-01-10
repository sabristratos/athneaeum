import React, { memo, useMemo } from 'react';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/themes';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'caption' | 'label';
type TextColor = 'default' | 'muted' | 'primary' | 'success' | 'danger' | 'accent';

interface TextProps extends RNTextProps {
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

const colorStyles: Record<TextColor, string> = {
  default: 'text-foreground',
  muted: 'text-foreground-muted',
  primary: 'text-primary',
  success: 'text-success',
  danger: 'text-danger',
  accent: 'text-accent',
};

export const Text = memo(function Text({
  variant = 'body',
  color = 'default',
  muted = false,
  center = false,
  bold = false,
  style,
  className,
  children,
  ...props
}: TextProps) {
  const { theme } = useTheme();

  const colorClass = muted ? colorStyles.muted : colorStyles[color];
  const alignClass = center ? 'text-center' : '';

  const isHeading = variant.startsWith('h');
  const isLabel = variant === 'label';

  // Memoize text style computation
  const textStyle = useMemo<TextStyle>(() => {
    const fontFamily = isHeading ? theme.fonts.heading : theme.fonts.body;
    const fontSize = fontSizes[variant];

    // Determine font weight
    let fontWeight: TextStyle['fontWeight'];
    if (bold) fontWeight = theme.fontWeights.bold as TextStyle['fontWeight'];
    else if (isHeading) fontWeight = theme.fontWeights.semibold as TextStyle['fontWeight'];
    else if (isLabel) fontWeight = theme.fontWeights.medium as TextStyle['fontWeight'];
    else fontWeight = theme.fontWeights.normal as TextStyle['fontWeight'];

    // Determine line height
    let lineHeight: number;
    if (isHeading) lineHeight = fontSize * theme.lineHeights.tight;
    else if (variant === 'caption' || variant === 'label') lineHeight = fontSize * theme.lineHeights.tight;
    else lineHeight = fontSize * theme.lineHeights.normal;

    // Determine letter spacing
    let letterSpacing: number;
    if (isLabel) letterSpacing = theme.letterSpacing.wide;
    else if (isHeading) letterSpacing = theme.letterSpacing.tight;
    else letterSpacing = theme.letterSpacing.normal;

    return {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      textTransform: isLabel ? 'uppercase' : 'none',
    };
  }, [variant, bold, isHeading, isLabel, theme]);

  return (
    <RNText
      className={`${colorClass} ${alignClass} ${className ?? ''}`}
      style={[textStyle, style]}
      {...props}
    >
      {children}
    </RNText>
  );
});
