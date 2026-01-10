import React from 'react';
import { TouchableOpacity } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';

interface QuickActionButtonProps {
  icon: IconSvgElement;
  label: string;
  onPress: () => void;
  variant?: 'default' | 'danger';
}

export function QuickActionButton({
  icon,
  label,
  onPress,
  variant = 'default',
}: QuickActionButtonProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const iconColor =
    variant === 'danger'
      ? theme.colors.danger
      : theme.colors.foreground;

  const textColor =
    variant === 'danger'
      ? theme.colors.danger
      : theme.colors.foreground;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.borders.thin,
        borderColor: variant === 'danger' ? theme.colors.danger : theme.colors.border,
        ...(!isScholar && {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }),
      }}
    >
      <Icon icon={icon} size={18} color={iconColor} />
      <Text
        variant="caption"
        style={{
          textTransform: 'uppercase',
          letterSpacing: theme.letterSpacing.wide,
          color: textColor,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
