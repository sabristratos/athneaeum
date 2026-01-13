import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/themes';

type BadgeVariant = 'primary' | 'accent' | 'muted' | 'success' | 'danger';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

export function Badge({
  variant = 'primary',
  size = 'sm',
  children,
  accessibilityLabel,
}: BadgeProps) {
  const { theme, themeName } = useTheme();

  const displayText = typeof children === 'string'
    ? children
    : String(children ?? '');

  const isScholar = themeName === 'scholar';

  // Scholar: Uppercase, thin border, transparent bg
  // Dreamer: Lowercase, solid bg, rounded pill

  const getVariantStyles = () => {
    const baseStyles = {
      primary: {
        backgroundColor: isScholar ? 'transparent' : theme.colors.tintPrimary,
        borderColor: isScholar ? theme.colors.borderMuted : 'transparent',
        textColor: isScholar ? theme.colors.foregroundMuted : theme.colors.foreground,
      },
      accent: {
        backgroundColor: isScholar ? 'transparent' : theme.colors.tintAccent,
        borderColor: isScholar ? theme.colors.primary : 'transparent',
        textColor: isScholar ? theme.colors.primary : theme.colors.foregroundSubtle,
      },
      muted: {
        backgroundColor: isScholar ? 'transparent' : theme.colors.surfaceAlt,
        borderColor: isScholar ? theme.colors.border : 'transparent',
        textColor: theme.colors.foregroundMuted,
      },
      success: {
        backgroundColor: isScholar ? 'transparent' : theme.colors.tintPrimary,
        borderColor: isScholar ? theme.colors.success : 'transparent',
        textColor: isScholar ? theme.colors.success : theme.colors.success,
      },
      danger: {
        backgroundColor: isScholar ? 'transparent' : theme.colors.tintAccent,
        borderColor: isScholar ? theme.colors.danger : 'transparent',
        textColor: theme.colors.danger,
      },
    };
    return baseStyles[variant];
  };

  const styles = getVariantStyles();

  const paddingH = size === 'sm' ? 8 : 12;
  const paddingV = size === 'sm' ? 2 : 4;
  const fontSize = size === 'sm' ? 10 : 12;

  return (
    <View
      style={{
        backgroundColor: styles.backgroundColor,
        borderWidth: isScholar ? theme.borders.thin : 0,
        borderColor: styles.borderColor,
        borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        alignSelf: 'flex-start',
      }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? displayText}
    >
      <Text
        style={{
          fontSize,
          color: styles.textColor,
          fontWeight: isScholar ? '400' : '700',
          textTransform: isScholar ? 'uppercase' : 'none',
          letterSpacing: isScholar ? 1 : 0,
          fontFamily: theme.fonts.body,
        }}
      >
        {displayText}
      </Text>
    </View>
  );
}
