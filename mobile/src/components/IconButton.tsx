import React from 'react';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable } from '@/components/Pressable';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/themes';

type IconButtonVariant = 'ghost' | 'filled' | 'outlined';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: IconSvgElement;
  onPress: () => void;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  color?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  hitSlop?: number;
}

const sizeMap = {
  sm: { button: 32, icon: 16 },
  md: { button: 40, icon: 20 },
  lg: { button: 48, icon: 24 },
};

export function IconButton({
  icon,
  onPress,
  size = 'md',
  variant = 'ghost',
  color,
  disabled = false,
  accessibilityLabel,
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

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      activeScale={0.9}
      activeOpacity={0.8}
      haptic={disabled ? 'none' : 'light'}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
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
      <Icon icon={icon} size={iconSize} color={styles.iconColor} />
    </Pressable>
  );
}
