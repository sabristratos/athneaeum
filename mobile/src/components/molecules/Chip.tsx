import React from 'react';
import { View } from 'react-native';
import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';

export type ChipVariant = 'default' | 'primary' | 'success' | 'danger' | 'muted';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  variant?: ChipVariant;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const sizeMap = {
  sm: {
    paddingH: sharedSpacing.sm,
    paddingV: sharedSpacing.xs,
    fontSize: 12,
  },
  md: {
    paddingH: sharedSpacing.sm + sharedSpacing.xs,
    paddingV: sharedSpacing.xs + sharedSpacing.xxs,
    fontSize: 14,
  },
};

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  variant = 'default',
  size = 'md',
  disabled = false,
}: ChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { paddingH, paddingV, fontSize } = sizeMap[size];

  const getVariantColor = () => {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'muted':
        return theme.colors.surfaceAlt;
      default:
        return theme.colors.primary;
    }
  };

  const getColors = () => {
    if (selected) {
      return {
        background: variant === 'default' ? theme.colors.primary : getVariantColor(),
        text: theme.colors.onPrimary,
        border: 'transparent',
      };
    }

    return {
      background: theme.colors.surface,
      text: theme.colors.foreground,
      border: theme.colors.border,
    };
  };

  const colors = getColors();
  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: paddingH,
        paddingVertical: paddingV,
        backgroundColor: colors.background,
        borderRadius,
        borderWidth: selected ? 0 : theme.borders.thin,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
        gap: icon ? sharedSpacing.xs : 0,
      }}
    >
      {icon && <View>{icon}</View>}
      <Text
        style={{
          fontSize,
          color: colors.text,
          fontFamily: theme.fonts.body,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {label}
      </Text>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        activeScale={0.95}
        activeOpacity={0.9}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}
