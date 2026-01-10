import React, { memo, useMemo } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { useTheme } from '@/themes';

type CardVariant = 'elevated' | 'outlined' | 'filled' | 'paper';

interface CardProps extends Omit<ViewProps, 'style'> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export const Card = memo(function Card({
  variant = 'elevated',
  padding = 'md',
  style,
  children,
  onPress,
  disabled = false,
  ...props
}: CardProps) {
  const { theme, themeName } = useTheme();

  const isScholar = themeName === 'scholar';

  // Memoize card styles to avoid recalculation on every render
  const cardStyle = useMemo<ViewStyle>(() => {
    const paddingMap = {
      none: 0,
      sm: theme.spacing.sm,
      md: theme.spacing.md,
      lg: theme.spacing.lg,
    };

    let variantStyles: ViewStyle;
    if (isScholar) {
      // Scholar: Dark, moody, dramatic shadows
      const scholarStyles: Record<CardVariant, ViewStyle> = {
        elevated: {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borders.default,
          borderColor: theme.colors.border,
          ...theme.shadows.md,
        },
        outlined: {
          backgroundColor: 'transparent',
          borderWidth: theme.borders.default,
          borderColor: theme.colors.border,
        },
        filled: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: 0,
        },
        paper: {
          backgroundColor: theme.colors.paper,
          borderWidth: 0,
          ...theme.shadows.sm,
          transform: [{ rotate: '1deg' }],
        },
      };
      variantStyles = scholarStyles[variant];
    } else {
      // Dreamer: Light, soft, minimal shadows
      const dreamerStyles: Record<CardVariant, ViewStyle> = {
        elevated: {
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borders.default,
          borderColor: theme.colors.border,
          ...theme.shadows.sm,
        },
        outlined: {
          backgroundColor: 'transparent',
          borderWidth: theme.borders.default,
          borderColor: theme.colors.border,
        },
        filled: {
          backgroundColor: theme.colors.surfaceAlt,
          borderWidth: theme.borders.default,
          borderColor: 'transparent',
        },
        paper: {
          backgroundColor: theme.colors.tintAccent,
          borderWidth: 0,
          ...theme.shadows.md,
        },
      };
      variantStyles = dreamerStyles[variant];
    }

    return {
      padding: paddingMap[padding],
      borderRadius: variant === 'paper' && isScholar ? 0 : theme.radii.lg,
      overflow: 'hidden',
      ...variantStyles,
      ...style,
    };
  }, [variant, padding, isScholar, theme, style]);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        activeScale={0.98}
        activeOpacity={0.95}
        haptic={disabled ? 'none' : 'light'}
        style={cardStyle}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={cardStyle} {...props}>
      {children}
    </View>
  );
});
