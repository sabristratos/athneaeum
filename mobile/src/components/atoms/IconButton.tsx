import React from 'react';
import { ActivityIndicator } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable } from './Pressable';
import { Icon } from './Icon';
import { useTheme } from '@/themes';

export type IconButtonVariant = 'ghost' | 'filled' | 'outlined' | 'primary' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps {
  icon: IconSvgElement;
  onPress?: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  accessibilityHint?: string;
  hitSlop?: number;
}

const sizeMap = {
  sm: { button: 36, icon: 16 },
  md: { button: 44, icon: 20 },
  lg: { button: 48, icon: 24 },
};

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  color,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  hitSlop = 8,
}: IconButtonProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { button: buttonSize, icon: iconSize } = sizeMap[size];

  const getStyles = () => {
    const baseRadius = isScholar ? theme.radii.sm : theme.radii.full;

    switch (variant) {
      case 'filled':
        return {
          backgroundColor: theme.colors.primary,
          borderWidth: 0,
          borderColor: 'transparent',
          iconColor: theme.colors.onPrimary,
          borderRadius: baseRadius,
        };
      case 'primary':
        return {
          backgroundColor: theme.colors.primarySubtle,
          borderWidth: 0,
          borderColor: 'transparent',
          iconColor: theme.colors.primary,
          borderRadius: baseRadius,
        };
      case 'danger':
        return {
          backgroundColor: theme.colors.dangerSubtle,
          borderWidth: 0,
          borderColor: 'transparent',
          iconColor: theme.colors.danger,
          borderRadius: baseRadius,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
          iconColor: color ?? theme.colors.foreground,
          borderRadius: baseRadius,
        };
      case 'ghost':
      default:
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          iconColor: color ?? theme.colors.foreground,
          borderRadius: baseRadius,
        };
    }
  };

  const styles = getStyles();

  const isDisabled = disabled || loading || !onPress;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      activeScale={0.9}
      activeOpacity={0.8}
      haptic={isDisabled ? 'none' : 'light'}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={hitSlop}
      style={{
        width: buttonSize,
        height: buttonSize,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: styles.backgroundColor,
        borderWidth: styles.borderWidth,
        borderColor: styles.borderColor,
        borderRadius: styles.borderRadius,
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator size={iconSize} color={styles.iconColor} />
      ) : (
        <Icon icon={icon} size={iconSize} color={styles.iconColor} />
      )}
    </Pressable>
  );
}
