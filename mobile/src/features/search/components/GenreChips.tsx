import React from 'react';
import { ScrollView, View } from 'react-native';
import { Pressable, Text } from '@/components';
import { useTheme } from '@/themes';
import { GENRE_OPTIONS } from '@/types';

interface GenreChipsProps {
  selected: string[];
  onChange: (genres: string[]) => void;
}

export function GenreChips({ selected, onChange }: GenreChipsProps) {
  const { theme, themeName } = useTheme();

  const isScholar = themeName === 'scholar';
  const safeSelected = selected ?? [];

  const toggleGenre = (genre: string) => {
    if (safeSelected.includes(genre)) {
      onChange(safeSelected.filter((g) => g !== genre));
    } else {
      onChange([...safeSelected, genre]);
    }
  };

  const getChipStyles = (isSelected: boolean) => {
    if (isSelected) {
      return {
        bg: isScholar ? theme.colors.primary : theme.colors.tintPrimary,
        border: theme.colors.primary,
        text: isScholar ? theme.colors.paper : theme.colors.foreground,
      };
    }

    return {
      bg: isScholar ? theme.colors.surfaceAlt : theme.colors.surfaceAlt,
      border: isScholar ? theme.colors.borderMuted : 'transparent',
      text: theme.colors.foregroundMuted,
    };
  };

  const selectedCount = safeSelected.length;

  return (
    <View
      accessible
      accessibilityLabel={`Genres filter${selectedCount > 0 ? `, ${selectedCount} selected` : ''}`}
    >
      <Text variant="label" muted style={{ marginBottom: theme.spacing.xs }}>
        Genres {selectedCount > 0 && `(${selectedCount})`}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={{
          gap: theme.spacing.xs,
          paddingRight: theme.spacing.md,
        }}
        indicatorStyle={isScholar ? 'white' : 'black'}
      >
        {GENRE_OPTIONS.map((option) => {
          const isSelected = safeSelected.includes(option.value);
          const chipStyles = getChipStyles(isSelected);

          return (
            <Pressable
              key={option.value}
              onPress={() => toggleGenre(option.value)}
              haptic="light"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              accessibilityHint={isSelected ? 'Tap to remove genre filter' : 'Tap to filter by this genre'}
            >
              <View
                style={{
                  backgroundColor: chipStyles.bg,
                  borderWidth: isSelected ? 2 : theme.borders.thin,
                  borderColor: chipStyles.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  minHeight: 36,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: chipStyles.text,
                    fontWeight: isSelected ? '600' : (isScholar ? '400' : '600'),
                    textTransform: isScholar ? 'uppercase' : 'none',
                    letterSpacing: isScholar ? 0.5 : 0,
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
