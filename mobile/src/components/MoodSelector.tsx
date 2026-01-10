import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import { MOOD_OPTIONS, type QuoteMood } from '@/types/quote';

interface MoodSelectorProps {
  value?: QuoteMood;
  onChange: (mood: QuoteMood | undefined) => void;
}

export function MoodSelector({ value, onChange }: MoodSelectorProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handlePress = (mood: QuoteMood) => {
    if (value === mood) {
      onChange(undefined);
    } else {
      onChange(mood);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
      }}
    >
      {MOOD_OPTIONS.map((option) => {
        const isSelected = value === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => handlePress(option.value)}
            activeOpacity={0.7}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingVertical: theme.spacing.xs,
              paddingHorizontal: theme.spacing.sm,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              backgroundColor: isSelected
                ? theme.colors.tintPrimary
                : theme.colors.surface,
              borderWidth: theme.borders.thin,
              borderColor: isSelected
                ? theme.colors.primary
                : theme.colors.border,
            }}
          >
            <Text style={{ fontSize: 14 }}>{option.emoji}</Text>
            <Text
              variant="caption"
              style={{
                color: isSelected
                  ? theme.colors.primary
                  : theme.colors.foregroundMuted,
                fontWeight: isSelected ? '600' : '400',
              }}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
