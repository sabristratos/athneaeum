import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable as RNPressable,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PreferenceChip } from '@/components/molecules/PreferenceChip';
import { PreferenceStateSelector } from '@/components/molecules/PreferenceStateSelector';
import { Text, Icon, Pressable, Button } from '@/components/atoms';
import { Card } from '@/components/organisms/cards';
import { BottomSheet } from '@/components/organisms/modals';
import { Bookmark01Icon, Search01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import {
  useGroupedPreferences,
  usePreferenceActions,
  useSetPreferenceState,
} from '@/database/hooks/usePreferences';
import { useSeriesQuery } from '@/queries/useSeries';
import type { PreferenceState } from '@/types/preference';

export interface SeriesPreferenceSectionProps {
  showHeader?: boolean;
  maxSearchResults?: number;
}

export function SeriesPreferenceSection({
  showHeader = true,
  maxSearchResults = 5,
}: SeriesPreferenceSectionProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { grouped } = useGroupedPreferences();
  const { addPreference, removePreferenceByValue } = usePreferenceActions();
  const { set: setPreferenceState } = useSetPreferenceState();

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedSeriesForSheet, setSelectedSeriesForSheet] = useState<{
    name: string;
    state: PreferenceState;
  } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useSeriesQuery(
    searchQuery.length >= 2 ? searchQuery : undefined
  );

  const favoriteSeries = useMemo(
    () => grouped.favorite.series.map((p) => p.value),
    [grouped.favorite.series]
  );

  const excludedSeries = useMemo(
    () => grouped.exclude.series.map((p) => p.value),
    [grouped.exclude.series]
  );

  const allSeries = useMemo(() => {
    return [
      ...favoriteSeries.map((name) => ({ name, state: 'favorite' as PreferenceState })),
      ...excludedSeries.map((name) => ({ name, state: 'excluded' as PreferenceState })),
    ];
  }, [favoriteSeries, excludedSeries]);

  const handleAddSeries = useCallback(
    async (seriesTitle: string, type: 'favorite' | 'exclude') => {
      Keyboard.dismiss();
      setSearchQuery('');
      setShowResults(false);
      setShowSearch(false);

      try {
        await addPreference('series', type, seriesTitle);
      } catch {
        Alert.alert('Error', 'Failed to add series');
      }
    },
    [addPreference]
  );

  const handleRemoveSeries = useCallback(
    async (seriesName: string, state: PreferenceState) => {
      try {
        const type = state === 'favorite' ? 'favorite' : 'exclude';
        await removePreferenceByValue('series', type, seriesName);
      } catch {
        Alert.alert('Error', 'Failed to remove series');
      }
    },
    [removePreferenceByValue]
  );

  const handleLongPress = useCallback((seriesName: string, state: PreferenceState) => {
    setSelectedSeriesForSheet({ name: seriesName, state });
    setSheetVisible(true);
  }, []);

  const handleStateChange = useCallback(
    async (newState: PreferenceState) => {
      if (!selectedSeriesForSheet) return;

      try {
        await setPreferenceState(
          'series',
          selectedSeriesForSheet.name,
          selectedSeriesForSheet.state,
          newState
        );
      } catch {
        Alert.alert('Error', 'Failed to update preference');
      }
      setSheetVisible(false);
      setSelectedSeriesForSheet(null);
    },
    [selectedSeriesForSheet, setPreferenceState]
  );

  const sortedResults = useMemo(() => {
    if (!searchResults) return [];
    return searchResults.slice(0, maxSearchResults);
  }, [searchResults, maxSearchResults]);

  return (
    <View>
      <View style={styles.header}>
        {showHeader && (
          <>
            <Icon icon={Bookmark01Icon} size={20} color={theme.colors.primary} />
            <Text
              variant="h3"
              style={{ marginLeft: sharedSpacing.sm, flex: 1, color: theme.colors.foreground }}
            >
              Series
            </Text>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setShowSearch(!showSearch)}
        >
          <Icon icon={Add01Icon} size={18} color={theme.colors.primary} />
        </Button>
      </View>

      <Text
        variant="caption"
        style={{ color: theme.colors.foregroundMuted, marginBottom: sharedSpacing.md }}
      >
        Search to add series. Tap result for favorite, hold for exclude.
      </Text>

      {showSearch && (
        <View style={styles.searchWrapper}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                borderColor: showResults ? theme.colors.primary : theme.colors.border,
                borderWidth: theme.borders.thin,
              },
            ]}
          >
            <Icon icon={Search01Icon} size={18} color={theme.colors.foregroundMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowResults(text.length >= 2);
              }}
              placeholder="Search for a series..."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[
                styles.searchInput,
                { color: theme.colors.foreground, fontFamily: theme.fonts.body },
              ]}
              returnKeyType="search"
              autoCapitalize="words"
              autoFocus
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearchQuery('');
                  setShowResults(false);
                }}
                haptic="light"
                hitSlop={8}
              >
                <Icon icon={Cancel01Icon} size={16} color={theme.colors.foregroundMuted} />
              </Pressable>
            )}
          </View>

          {showResults && (
            <Animated.View
              entering={FadeIn.duration(150)}
              exiting={FadeOut.duration(100)}
              style={[
                styles.resultsContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  borderColor: theme.colors.border,
                  borderWidth: theme.borders.thin,
                  shadowColor: theme.colors.shadow,
                },
              ]}
            >
              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              ) : sortedResults.length > 0 ? (
                sortedResults.map((series) => (
                  <RNPressable
                    key={series.id}
                    onPress={() => handleAddSeries(series.title, 'favorite')}
                    onLongPress={() => handleAddSeries(series.title, 'exclude')}
                    style={({ pressed }) => [
                      styles.resultItem,
                      {
                        borderBottomColor: theme.colors.border,
                        backgroundColor: pressed ? theme.colors.surfaceAlt : 'transparent',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.colors.foreground, fontWeight: '500' }}>
                        {series.title}
                      </Text>
                      {series.author && (
                        <Text
                          variant="caption"
                          style={{ color: theme.colors.foregroundMuted }}
                          numberOfLines={1}
                        >
                          by {series.author}
                        </Text>
                      )}
                    </View>
                    {series.total_volumes && (
                      <Text variant="caption" style={{ color: theme.colors.foregroundSubtle }}>
                        {series.total_volumes} books
                      </Text>
                    )}
                  </RNPressable>
                ))
              ) : searchQuery.length >= 2 ? (
                <View style={styles.emptyResults}>
                  <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                    No series found
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          )}
        </View>
      )}

      <Card variant="outlined" style={{ marginTop: showSearch ? sharedSpacing.md : 0 }}>
        {allSeries.length > 0 ? (
          <View style={styles.chipsContainer}>
            {allSeries.map(({ name, state }) => (
              <PreferenceChip
                key={`${name}-${state}`}
                label={name}
                state={state}
                size="md"
                showStateIcon
                showRemove
                onRemove={() => handleRemoveSeries(name, state)}
                onLongPress={() => handleLongPress(name, state)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundMuted, fontWeight: '500' }}
            >
              No series preferences set
            </Text>
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundSubtle, marginTop: sharedSpacing.xs }}
            >
              Tap + to search and add series
            </Text>
          </View>
        )}
      </Card>

      <BottomSheet
        visible={sheetVisible}
        onClose={() => {
          setSheetVisible(false);
          setSelectedSeriesForSheet(null);
        }}
        title={selectedSeriesForSheet?.name || 'Select State'}
      >
        <View style={{ padding: sharedSpacing.md }}>
          <PreferenceStateSelector
            currentState={selectedSeriesForSheet?.state || 'none'}
            onStateChange={handleStateChange}
            supportsExclude
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sharedSpacing.sm,
  },
  searchWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sharedSpacing.sm + sharedSpacing.xs,
    paddingVertical: sharedSpacing.sm + sharedSpacing.xs,
    gap: sharedSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: sharedSpacing.xs,
    maxHeight: 250,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    paddingVertical: sharedSpacing.lg,
    alignItems: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sharedSpacing.md,
    paddingVertical: sharedSpacing.sm + sharedSpacing.xs,
    borderBottomWidth: 1,
    gap: sharedSpacing.sm,
  },
  emptyResults: {
    paddingVertical: sharedSpacing.lg,
    alignItems: 'center',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: sharedSpacing.md,
    gap: sharedSpacing.sm,
  },
  emptyContainer: {
    padding: sharedSpacing.lg,
    alignItems: 'center',
  },
});
