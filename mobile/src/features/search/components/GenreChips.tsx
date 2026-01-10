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

  const toggleGenre = (genre: string) => {
    if (selected.includes(genre)) {
      onChange(selected.filter((g) => g !== genre));
    } else {
      onChange([...selected, genre]);
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
      bg: isScholar ? 'transparent' : theme.colors.surfaceAlt,
      border: isScholar ? theme.colors.border : 'transparent',
      text: theme.colors.foregroundMuted,
    };
  };

  return (
    <View>
      <Text variant="label" muted style={{ marginBottom: theme.spacing.xs }}>
        Genres
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.xs,
          paddingRight: theme.spacing.md,
        }}
      >
        {GENRE_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          const styles = getChipStyles(isSelected);

          return (
            <Pressable
              key={option.value}
              onPress={() => toggleGenre(option.value)}
              haptic="light"
            >
              <View
                style={{
                  backgroundColor: styles.bg,
                  borderWidth: theme.borders.thin,
                  borderColor: styles.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: styles.text,
                    fontWeight: isScholar ? '400' : '600',
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
