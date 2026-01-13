import React from 'react';
import { View } from 'react-native';
import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import type { ThemeName } from '@/types/theme';

interface ThemeToggleProps {
  showLabels?: boolean;
}

const themeOptions: { name: ThemeName; label: string }[] = [
  { name: 'scholar', label: 'Dark' },
  { name: 'dreamer', label: 'Cozy' },
  { name: 'wanderer', label: 'Adventure' },
];

export function ThemeToggle({ showLabels = true }: ThemeToggleProps) {
  const { themeName, setTheme, theme } = useTheme();

  const currentLabel = themeOptions.find(t => t.name === themeName)?.label ?? 'Scholar';
  const modeName = themeName.charAt(0).toUpperCase() + themeName.slice(1);

  return (
    <View className="items-center gap-3">
      {showLabels && (
        <Text variant="label" muted>
          {modeName} Mode
        </Text>
      )}

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.full,
          padding: sharedSpacing.xs,
        }}
        accessibilityRole="radiogroup"
        accessibilityLabel="Theme selection"
      >
        {themeOptions.map((option) => {
          const isActive = themeName === option.name;

          return (
            <Pressable
              key={option.name}
              onPress={() => setTheme(option.name)}
              haptic="light"
              style={{
                paddingHorizontal: sharedSpacing.md - sharedSpacing.xxs,
                paddingVertical: sharedSpacing.sm,
                borderRadius: theme.radii.full,
                backgroundColor: isActive ? theme.colors.primary : 'transparent',
              }}
              accessibilityRole="radio"
              accessibilityLabel={`${option.label} theme`}
              accessibilityState={{ checked: isActive }}
            >
              <Text
                variant="caption"
                style={{
                  color: isActive ? theme.colors.paper : theme.colors.foregroundMuted,
                  fontWeight: isActive ? '600' : '400',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
