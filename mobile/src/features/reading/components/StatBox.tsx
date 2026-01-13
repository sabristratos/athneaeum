import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components';
import { useTheme } from '@/themes';

interface StatBoxProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

export function StatBox({ label, value, accent = false }: StatBoxProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent ? theme.colors.primary : theme.colors.surface,
        borderRadius: theme.radii.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        minWidth: 80,
      }}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text
        variant="h2"
        style={{
          color: accent ? theme.colors.onPrimary : theme.colors.foreground,
          fontSize: 24,
        }}
      >
        {value}
      </Text>
      <Text
        variant="caption"
        style={{
          color: accent ? theme.colors.onPrimary : theme.colors.foregroundMuted,
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
