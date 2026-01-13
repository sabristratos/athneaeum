import React, { memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';

export type ProgressMode = 'pages' | 'percentage';

interface ProgressModeToggleProps {
  value: ProgressMode;
  onChange: (mode: ProgressMode) => void;
  size?: 'sm' | 'md';
}

export const ProgressModeToggle = memo(function ProgressModeToggle({
  value,
  onChange,
  size = 'md',
}: ProgressModeToggleProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const isSmall = size === 'sm';
  const paddingV = isSmall ? 6 : 8;
  const paddingH = isSmall ? 12 : 16;
  const fontSize = isSmall ? 12 : 13;
  const containerPadding = isSmall ? 3 : 4;

  const handlePress = (mode: ProgressMode) => {
    if (mode !== value) {
      triggerHaptic('light');
      onChange(mode);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
        padding: containerPadding,
        borderWidth: theme.borders.thin,
        borderColor: theme.colors.border,
      }}
    >
      <TouchableOpacity
        onPress={() => handlePress('pages')}
        activeOpacity={0.7}
        style={{
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          backgroundColor: value === 'pages' ? theme.colors.primary : 'transparent',
          borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
        }}
      >
        <Text
          variant="label"
          style={{
            color: value === 'pages' ? theme.colors.onPrimary : theme.colors.foregroundMuted,
            fontSize,
            fontWeight: '600',
            letterSpacing: isScholar ? 0.5 : 0,
          }}
        >
          Pages
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handlePress('percentage')}
        activeOpacity={0.7}
        style={{
          paddingVertical: paddingV,
          paddingHorizontal: paddingH,
          backgroundColor: value === 'percentage' ? theme.colors.primary : 'transparent',
          borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
        }}
      >
        <Text
          variant="label"
          style={{
            color: value === 'percentage' ? theme.colors.onPrimary : theme.colors.foregroundMuted,
            fontSize,
            fontWeight: '600',
            letterSpacing: isScholar ? 0.5 : 0,
          }}
        >
          %
        </Text>
      </TouchableOpacity>
    </View>
  );
});
