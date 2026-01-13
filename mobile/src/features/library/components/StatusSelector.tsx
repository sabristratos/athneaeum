import React, { memo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';

interface StatusOption {
  key: string;
  label: string;
}

interface StatusSelectorProps {
  options: StatusOption[];
  selected: string;
  onSelect: (status: string) => void;
}

export const StatusSelector = memo(function StatusSelector({
  options,
  selected,
  onSelect,
}: StatusSelectorProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: 'row',
        gap: theme.spacing.sm,
      }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Book status"
    >
      {options.map((option) => {
        const isActive = selected === option.key;

        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            haptic="light"
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            accessibilityLabel={option.label}
          >
            <View
              style={{
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.md,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                backgroundColor: isActive
                  ? theme.colors.primary
                  : 'transparent',
                borderWidth: theme.borders.thin,
                borderColor: isActive
                  ? theme.colors.primary
                  : theme.colors.border,
              }}
            >
              <Text
                variant="caption"
                style={{
                  color: isActive
                    ? theme.colors.onPrimary
                    : theme.colors.foregroundMuted,
                  fontWeight: isActive ? '600' : '400',
                  textTransform: 'uppercase',
                  letterSpacing: theme.letterSpacing.wide,
                }}
              >
                {option.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
});
