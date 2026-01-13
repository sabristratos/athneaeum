import React from 'react';
import { View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';

interface StatRowProps {
  label: string;
  value: string | number;
  icon?: IconSvgElement;
  variant?: 'inline' | 'stacked';
}

export function StatRow({ label, value, icon, variant = 'inline' }: StatRowProps) {
  const { theme } = useTheme();

  if (variant === 'stacked') {
    return (
      <View
        style={{ alignItems: 'center', gap: theme.spacing.xs }}
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`${label}: ${value}`}
      >
        {icon && <Icon icon={icon} size={20} color={theme.colors.foregroundMuted} />}
        <Text variant="h3">{value}</Text>
        <Text variant="caption" muted>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
      }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {icon && <Icon icon={icon} size={16} color={theme.colors.foregroundMuted} />}
        <Text variant="body" muted>
          {label}
        </Text>
      </View>
      <Text variant="body">{value}</Text>
    </View>
  );
}
