import React, { memo, useMemo } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'primary-outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const Button = memo(function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  children,
  accessibilityLabel,
  accessibilityHint,
}: ButtonProps) {
  const { theme, themeName } = useTheme();

  const isPressed = useSharedValue(false);
  const isScholar = themeName === 'scholar';
  const isDisabled = disabled || loading;

  const variantStyles = useMemo(() => {
    if (isScholar) {
      return {
        primary: {
          bg: theme.colors.primary,
          bgPressed: theme.colors.primaryHover,
          text: theme.colors.onPrimary,
          border: theme.colors.primary,
        },
        secondary: {
          bg: theme.colors.surfaceHover,
          bgPressed: theme.colors.borderHover,
          text: theme.colors.foreground,
          border: theme.colors.borderHover,
        },
        ghost: {
          bg: 'transparent',
          bgPressed: theme.colors.surface,
          text: theme.colors.foregroundMuted,
          border: 'transparent',
        },
        danger: {
          bg: theme.colors.danger,
          bgPressed: theme.colors.danger,
          text: theme.colors.onDanger,
          border: theme.colors.danger,
        },
        outline: {
          bg: 'transparent',
          bgPressed: theme.colors.surfaceHover,
          text: theme.colors.foreground,
          border: theme.colors.borderHover,
        },
        'primary-outline': {
          bg: 'transparent',
          bgPressed: theme.colors.tintPrimary,
          text: theme.colors.primary,
          border: theme.colors.primary,
        },
      }[variant];
    } else {
      return {
        primary: {
          bg: theme.colors.primary,
          bgPressed: theme.colors.primaryHover,
          text: theme.colors.onPrimary,
          border: 'transparent',
          shadow: theme.colors.primaryDark,
        },
        secondary: {
          bg: theme.colors.surface,
          bgPressed: theme.colors.surfaceHover,
          text: theme.colors.foreground,
          border: theme.colors.border,
        },
        ghost: {
          bg: 'transparent',
          bgPressed: theme.colors.surfaceAlt,
          text: theme.colors.foregroundMuted,
          border: 'transparent',
        },
        danger: {
          bg: theme.colors.danger,
          bgPressed: theme.colors.danger,
          text: theme.colors.onDanger,
          border: 'transparent',
          shadow: theme.colors.danger,
        },
        outline: {
          bg: 'transparent',
          bgPressed: theme.colors.surfaceAlt,
          text: theme.colors.foreground,
          border: theme.colors.borderHover,
        },
        'primary-outline': {
          bg: 'transparent',
          bgPressed: theme.colors.tintPrimary,
          text: theme.colors.primary,
          border: theme.colors.primary,
        },
      }[variant];
    }
  }, [isScholar, variant, theme]);

  const sizeStyles = useMemo(() => {
    const sizes = {
      sm: { px: 12, py: 6, text: 14 },
      md: { px: 16, py: 10, text: 16 },
      lg: { px: 24, py: 14, text: 18 },
    };
    return sizes[size];
  }, [size]);

  const has3DShadow = !isScholar && (variant === 'primary' || variant === 'danger') && variantStyles?.shadow;

  const animatedContainerStyle = useAnimatedStyle(() => {
    const shadowOffset = has3DShadow ? (isPressed.value ? 0 : 4) : 0;
    const translateY = has3DShadow && isPressed.value ? 4 : 0;

    return {
      backgroundColor: isPressed.value ? variantStyles?.bgPressed : variantStyles?.bg,
      transform: [{ translateY: withSpring(translateY, SPRINGS.responsive) }],
      shadowOffset: { width: 0, height: shadowOffset },
      elevation: shadowOffset,
    };
  });

  const staticContainerStyle = useMemo(
    () => ({
      borderRadius: theme.radii.md,
      borderWidth: variantStyles?.border !== 'transparent' ? theme.borders.thin : 0,
      borderColor: variantStyles?.border,
      paddingHorizontal: sizeStyles.px,
      paddingVertical: sizeStyles.py,
      opacity: isDisabled ? 0.5 : 1,
      alignSelf: fullWidth ? ('stretch' as const) : ('flex-start' as const),
      ...(has3DShadow && {
        shadowColor: variantStyles.shadow,
        shadowOpacity: 0.6,
        shadowRadius: 0,
      }),
      ...(!has3DShadow && isScholar && variant === 'primary' && theme.shadows.sm),
    }),
    [theme, variantStyles, sizeStyles, isDisabled, fullWidth, has3DShadow, isScholar, variant]
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        isPressed.value = true;
      }}
      onPressOut={() => {
        isPressed.value = false;
      }}
      disabled={isDisabled}
      haptic={isDisabled ? 'none' : 'light'}
      activeScale={0.97}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <Animated.View style={[styles.container, staticContainerStyle, animatedContainerStyle]}>
        {loading ? (
          <ActivityIndicator size="small" color={variantStyles?.text} />
        ) : typeof children === 'string' ? (
          <Text
            style={{
              color: variantStyles?.text,
              fontSize: sizeStyles.text,
              fontWeight: isScholar ? '400' : '700',
              fontFamily: theme.fonts.body,
              textAlign: 'center',
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
