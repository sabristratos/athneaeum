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
import { Text, Icon, Pressable } from '@/components/atoms';
import { Card } from '@/components/organisms/cards';
import { BottomSheet } from '@/components/organisms/modals';
import { UserIcon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import {
  useGroupedPreferences,
  usePreferenceActions,
  useSetPreferenceState,
} from '@/database/hooks/usePreferences';
import { useAuthorSearchQuery } from '@/queries/useAuthors';
import type { PreferenceState } from '@/types/preference';

export interface AuthorPreferenceSectionProps {
  mode: 'onboarding' | 'settings';
  localSelectedAuthors?: string[];
  onLocalAdd?: (author: string) => void;
  onLocalRemove?: (author: string) => void;
  showHeader?: boolean;
  maxSearchResults?: number;
}

export function AuthorPreferenceSection({
  mode,
  localSelectedAuthors = [],
  onLocalAdd,
  onLocalRemove,
  showHeader = true,
  maxSearchResults = 6,
}: AuthorPreferenceSectionProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { grouped } = useGroupedPreferences();
  const { addPreference, removePreferenceByValue } = usePreferenceActions();
  const { set: setPreferenceState } = useSetPreferenceState();

  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedAuthorForSheet, setSelectedAuthorForSheet] = useState<{
    name: string;
    state: PreferenceState;
  } | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useAuthorSearchQuery(
    searchQuery.length >= 2 ? searchQuery : ''
  );

  const favoriteAuthors = useMemo(
    () => grouped.favorite.authors.map((p) => p.value),
    [grouped.favorite.authors]
  );

  const excludedAuthors = useMemo(
    () => grouped.exclude.authors.map((p) => p.value),
    [grouped.exclude.authors]
  );

  const allAuthors = useMemo(() => {
    if (mode === 'onboarding') {
      return localSelectedAuthors.map((name) => ({
        name,
        state: 'favorite' as PreferenceState,
      }));
    }

    return [
      ...favoriteAuthors.map((name) => ({ name, state: 'favorite' as PreferenceState })),
      ...excludedAuthors.map((name) => ({ name, state: 'excluded' as PreferenceState })),
    ];
  }, [mode, localSelectedAuthors, favoriteAuthors, excludedAuthors]);

  const handleSelectAuthor = useCallback(
    async (authorName: string) => {
      Keyboard.dismiss();
      setSearchQuery('');
      setShowResults(false);

      if (mode === 'onboarding') {
        if (!localSelectedAuthors.includes(authorName)) {
          onLocalAdd?.(authorName);
        }
        return;
      }

      try {
        await addPreference('author', 'favorite', authorName);
      } catch {
        Alert.alert('Error', 'Failed to add author');
      }
    },
    [mode, localSelectedAuthors, onLocalAdd, addPreference]
  );

  const handleRemoveAuthor = useCallback(
    async (authorName: string, state: PreferenceState) => {
      if (mode === 'onboarding') {
        onLocalRemove?.(authorName);
        return;
      }

      try {
        const type = state === 'favorite' ? 'favorite' : 'exclude';
        await removePreferenceByValue('author', type, authorName);
      } catch {
        Alert.alert('Error', 'Failed to remove author');
      }
    },
    [mode, onLocalRemove, removePreferenceByValue]
  );

  const handleLongPress = useCallback(
    (authorName: string, state: PreferenceState) => {
      if (mode !== 'settings') return;
      setSelectedAuthorForSheet({ name: authorName, state });
      setSheetVisible(true);
    },
    [mode]
  );

  const handleStateChange = useCallback(
    async (newState: PreferenceState) => {
      if (!selectedAuthorForSheet) return;

      try {
        await setPreferenceState(
          'author',
          selectedAuthorForSheet.name,
          selectedAuthorForSheet.state,
          newState
        );
      } catch {
        Alert.alert('Error', 'Failed to update preference');
      }
      setSheetVisible(false);
      setSelectedAuthorForSheet(null);
    },
    [selectedAuthorForSheet, setPreferenceState]
  );

  const sortedResults = useMemo(() => {
    if (!searchResults?.items) return [];
    return [...searchResults.items]
      .sort((a, b) => (b.work_count || 0) - (a.work_count || 0))
      .slice(0, maxSearchResults);
  }, [searchResults, maxSearchResults]);

  return (
    <View>
      {showHeader && (
        <View style={styles.header}>
          <Icon icon={UserIcon} size={20} color={theme.colors.primary} />
          <Text
            variant="h3"
            style={{ marginLeft: sharedSpacing.sm, color: theme.colors.foreground }}
          >
            Authors
          </Text>
        </View>
      )}

      <Text
        variant="caption"
        style={{ color: theme.colors.foregroundMuted, marginBottom: sharedSpacing.md }}
      >
        {mode === 'onboarding'
          ? 'Search and add your favorite authors (optional)'
          : 'Search to add authors. Long press to change state.'}
      </Text>

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
            placeholder="Search for an author..."
            placeholderTextColor={theme.colors.foregroundMuted}
            style={[
              styles.searchInput,
              { color: theme.colors.foreground, fontFamily: theme.fonts.body },
            ]}
            returnKeyType="search"
            autoCapitalize="words"
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
              sortedResults.map((author) => (
                <RNPressable
                  key={author.key}
                  onPress={() => handleSelectAuthor(author.name)}
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
                      {author.name}
                    </Text>
                    {author.top_work && (
                      <Text
                        variant="caption"
                        style={{ color: theme.colors.foregroundMuted }}
                        numberOfLines={1}
                      >
                        {author.top_work}
                      </Text>
                    )}
                  </View>
                  {author.work_count != null && author.work_count > 0 && (
                    <Text variant="caption" style={{ color: theme.colors.foregroundSubtle }}>
                      {author.work_count} works
                    </Text>
                  )}
                </RNPressable>
              ))
            ) : searchQuery.length >= 2 ? (
              <View style={styles.emptyResults}>
                <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                  No authors found
                </Text>
              </View>
            ) : null}
          </Animated.View>
        )}
      </View>

      {allAuthors.length > 0 && (
        <Card variant="outlined" style={{ marginTop: sharedSpacing.md }}>
          <View style={styles.chipsContainer}>
            {allAuthors.map(({ name, state }) => (
              <PreferenceChip
                key={`${name}-${state}`}
                label={name}
                state={state}
                size="md"
                showStateIcon={mode === 'settings'}
                showRemove
                onRemove={() => handleRemoveAuthor(name, state)}
                onLongPress={() => handleLongPress(name, state)}
              />
            ))}
          </View>
        </Card>
      )}

      {allAuthors.length === 0 && (
        <Card variant="outlined" style={{ marginTop: sharedSpacing.md }}>
          <View style={styles.emptyContainer}>
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              No author preferences set
            </Text>
          </View>
        </Card>
      )}

      {mode === 'settings' && (
        <BottomSheet
          visible={sheetVisible}
          onClose={() => {
            setSheetVisible(false);
            setSelectedAuthorForSheet(null);
          }}
          title={selectedAuthorForSheet?.name || 'Select State'}
        >
          <View style={{ padding: sharedSpacing.md }}>
            <PreferenceStateSelector
              currentState={selectedAuthorForSheet?.state || 'none'}
              onStateChange={handleStateChange}
              supportsExclude
            />
          </View>
        </BottomSheet>
      )}
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
    maxHeight: 300,
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
