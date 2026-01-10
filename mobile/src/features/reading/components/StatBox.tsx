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
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

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
    >
      <Text
        variant="h2"
        style={{
          color: accent
            ? (isScholar ? theme.colors.paper : '#ffffff')
            : theme.colors.foreground,
          fontSize: 24,
        }}
      >
        {value}
      </Text>
      <Text
        variant="caption"
        style={{
          color: accent
            ? (isScholar ? theme.colors.paper : '#ffffff')
            : theme.colors.foregroundMuted,
          textAlign: 'center',
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
