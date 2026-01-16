import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SelectableChip, PreferenceChip } from '@/components/molecules/PreferenceChip';
import { PreferenceStateSelector } from '@/components/molecules/PreferenceStateSelector';
import { Text, Icon } from '@/components/atoms';
import { Card } from '@/components/organisms/cards';
import { BottomSheet } from '@/components/organisms/modals';
import { BookOpen01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import {
  usePreferences,
  useCyclePreference,
  useSetPreferenceState,
} from '@/database/hooks/usePreferences';
import { useGenresQuery } from '@/queries/usePreferences';
import type { PreferenceState } from '@/types/preference';
import type { GenreCategory, GenreOption } from '@/types/preference';

export interface GenrePreferenceSectionProps {
  mode: 'onboarding' | 'settings';
  localSelectedGenres?: string[];
  onLocalToggle?: (genre: string) => void;
  showHeader?: boolean;
}

export function GenrePreferenceSection({
  mode,
  localSelectedGenres = [],
  onLocalToggle,
  showHeader = true,
}: GenrePreferenceSectionProps) {
  const { theme } = useTheme();
  const { data: genreCategories, isLoading, refetch } = useGenresQuery();
  const { preferences } = usePreferences();
  const { cycle } = useCyclePreference();
  const { set: setPreferenceState } = useSetPreferenceState();

  const [selectedGenreForSheet, setSelectedGenreForSheet] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const favoriteGenres = useMemo(() => {
    return preferences
      .filter((p) => p.category === 'genre' && p.type === 'favorite')
      .map((p) => p.normalized);
  }, [preferences]);

  const excludedGenres = useMemo(() => {
    return preferences
      .filter((p) => p.category === 'genre' && p.type === 'exclude')
      .map((p) => p.normalized);
  }, [preferences]);

  const getGenreState = useCallback(
    (genreLabel: string): PreferenceState => {
      if (mode === 'onboarding') {
        return localSelectedGenres.includes(genreLabel) ? 'favorite' : 'none';
      }

      const normalized = genreLabel.toLowerCase().trim();
      if (favoriteGenres.includes(normalized)) return 'favorite';
      if (excludedGenres.includes(normalized)) return 'excluded';
      return 'none';
    },
    [mode, localSelectedGenres, favoriteGenres, excludedGenres]
  );

  const handleGenrePress = useCallback(
    async (genreLabel: string) => {
      if (mode === 'onboarding') {
        onLocalToggle?.(genreLabel);
        return;
      }

      const currentState = getGenreState(genreLabel);
      try {
        await cycle('genre', genreLabel, currentState);
      } catch {
        Alert.alert('Error', 'Failed to update preference');
      }
    },
    [mode, onLocalToggle, getGenreState, cycle]
  );

  const handleGenreLongPress = useCallback(
    (genreLabel: string) => {
      if (mode !== 'settings') return;
      setSelectedGenreForSheet(genreLabel);
      setSheetVisible(true);
    },
    [mode]
  );

  const handleStateChange = useCallback(
    async (newState: PreferenceState) => {
      if (!selectedGenreForSheet) return;

      const currentState = getGenreState(selectedGenreForSheet);
      try {
        await setPreferenceState('genre', selectedGenreForSheet, currentState, newState);
      } catch {
        Alert.alert('Error', 'Failed to update preference');
      }
      setSheetVisible(false);
      setSelectedGenreForSheet(null);
    },
    [selectedGenreForSheet, getGenreState, setPreferenceState]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View>
      {showHeader && (
        <View style={styles.header}>
          <Icon icon={BookOpen01Icon} size={20} color={theme.colors.primary} />
          <Text
            variant="h3"
            style={{ marginLeft: sharedSpacing.sm, color: theme.colors.foreground }}
          >
            Genres
          </Text>
        </View>
      )}

      {mode === 'settings' && (
        <Text
          variant="caption"
          style={{ color: theme.colors.foregroundMuted, marginBottom: sharedSpacing.md }}
        >
          Tap to cycle: neutral → favorite → exclude. Long press for direct selection.
        </Text>
      )}

      {mode === 'onboarding' && (
        <Text
          variant="caption"
          style={{ color: theme.colors.foregroundMuted, marginBottom: sharedSpacing.md }}
        >
          Select your favorite genres (optional)
        </Text>
      )}

      {genreCategories?.map((category) => (
        <GenreCategoryCard
          key={category.key}
          category={category}
          mode={mode}
          getGenreState={getGenreState}
          onPress={handleGenrePress}
          onLongPress={handleGenreLongPress}
        />
      ))}

      {mode === 'settings' && (
        <BottomSheet
          visible={sheetVisible}
          onClose={() => {
            setSheetVisible(false);
            setSelectedGenreForSheet(null);
          }}
          title={selectedGenreForSheet || 'Select State'}
        >
          <View style={{ padding: sharedSpacing.md }}>
            <PreferenceStateSelector
              currentState={selectedGenreForSheet ? getGenreState(selectedGenreForSheet) : 'none'}
              onStateChange={handleStateChange}
              supportsExclude
            />
          </View>
        </BottomSheet>
      )}
    </View>
  );
}

interface GenreCategoryCardProps {
  category: GenreCategory;
  mode: 'onboarding' | 'settings';
  getGenreState: (label: string) => PreferenceState;
  onPress: (label: string) => void;
  onLongPress: (label: string) => void;
}

function GenreCategoryCard({
  category,
  mode,
  getGenreState,
  onPress,
  onLongPress,
}: GenreCategoryCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <Card
      variant={mode === 'settings' ? 'outlined' : 'filled'}
      style={{ marginBottom: sharedSpacing.md }}
    >
      {mode === 'settings' && (
        <View
          style={[
            styles.categoryHeader,
            {
              borderBottomColor: theme.colors.border,
              borderBottomWidth: theme.borders.thin,
            },
          ]}
        >
          <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
            {category.label}
          </Text>
        </View>
      )}
      <View style={{ padding: sharedSpacing.md }}>
        {mode === 'onboarding' && (
          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              fontFamily: theme.fonts.body,
              marginBottom: sharedSpacing.sm,
            }}
          >
            {category.label}
          </Text>
        )}
        <View style={styles.chipsContainer}>
          {category.genres.map((genre) => {
            const state = getGenreState(genre.label);

            if (mode === 'onboarding') {
              return (
                <SelectableChip
                  key={genre.value}
                  label={genre.label}
                  selected={state === 'favorite'}
                  onPress={() => onPress(genre.label)}
                  size="sm"
                />
              );
            }

            return (
              <PreferenceChip
                key={genre.value}
                label={genre.label}
                state={state}
                size="sm"
                showStateIcon
                onPress={() => onPress(genre.label)}
                onLongPress={() => onLongPress(genre.label)}
              />
            );
          })}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sharedSpacing.sm,
  },
  categoryHeader: {
    paddingHorizontal: sharedSpacing.md,
    paddingVertical: sharedSpacing.sm + sharedSpacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sharedSpacing.sm,
  },
});
