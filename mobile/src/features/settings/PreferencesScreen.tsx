import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Text,
  Card,
  IconButton,
  Icon,
  Pressable,
  Button,
  SectionHeader,
} from '@/components';
import { useTheme } from '@/themes';
import { useToast } from '@/stores/toastStore';
import {
  usePreferencesQuery,
  useGenresQuery,
  useAddPreferenceMutation,
  useRemovePreferenceByValueMutation,
} from '@/queries/usePreferences';
import {
  ArrowLeft01Icon,
  Cancel01Icon,
  FavouriteIcon,
  CancelCircleIcon,
  UserIcon,
  BookOpen01Icon,
  Bookmark01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import type { GenreOption, PreferenceType } from '@/types';
import { sharedSpacing } from '@/themes/shared';

type GenreState = 'none' | 'favorite' | 'excluded';

export function PreferencesScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const toast = useToast();
  const isScholar = themeName === 'scholar';

  const { data: preferences, isLoading, refetch, isRefetching } = usePreferencesQuery();
  const { data: genreCategories } = useGenresQuery();
  const addMutation = useAddPreferenceMutation();
  const removeMutation = useRemovePreferenceByValueMutation();

  const getGenreState = (genre: GenreOption): GenreState => {
    if (genre.is_favorite) return 'favorite';
    if (genre.is_excluded) return 'excluded';
    return 'none';
  };

  const handleGenrePress = useCallback(
    async (genre: GenreOption) => {
      const currentState = getGenreState(genre);
      let newState: GenreState;

      if (currentState === 'none') {
        newState = 'favorite';
      } else if (currentState === 'favorite') {
        newState = 'excluded';
      } else {
        newState = 'none';
      }

      try {
        if (currentState === 'favorite') {
          await removeMutation.mutateAsync({
            category: 'genre',
            type: 'favorite',
            value: genre.label,
          });
        } else if (currentState === 'excluded') {
          await removeMutation.mutateAsync({
            category: 'genre',
            type: 'exclude',
            value: genre.label,
          });
        }

        if (newState === 'favorite') {
          await addMutation.mutateAsync({
            category: 'genre',
            type: 'favorite',
            value: genre.label,
          });
        } else if (newState === 'excluded') {
          await addMutation.mutateAsync({
            category: 'genre',
            type: 'exclude',
            value: genre.label,
          });
        }

        refetch();
      } catch {
        toast.danger('Failed to update preference');
      }
    },
    [addMutation, removeMutation, refetch, toast]
  );

  const handleRemoveAuthor = useCallback(
    (value: string, type: PreferenceType) => {
      Alert.alert(
        'Remove Author',
        `Remove "${value}" from ${type === 'favorite' ? 'favorites' : 'excludes'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMutation.mutateAsync({ category: 'author', type, value });
                toast.success('Removed');
              } catch {
                toast.danger('Failed to remove');
              }
            },
          },
        ]
      );
    },
    [removeMutation, toast]
  );

  const handleRemoveSeries = useCallback(
    (value: string, type: PreferenceType) => {
      Alert.alert(
        'Remove Series',
        `Remove "${value}" from ${type === 'favorite' ? 'favorites' : 'excludes'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMutation.mutateAsync({ category: 'series', type, value });
                toast.success('Removed');
              } catch {
                toast.danger('Failed to remove');
              }
            },
          },
        ]
      );
    },
    [removeMutation, toast]
  );

  const renderChip = (
    value: string,
    type: PreferenceType,
    onRemove: () => void
  ) => {
    const isFavorite = type === 'favorite';
    const chipBg = isFavorite ? theme.colors.primarySubtle : theme.colors.dangerSubtle;
    const chipTextColor = isFavorite ? theme.colors.primary : theme.colors.danger;

    return (
      <Pressable key={`${type}-${value}`} onPress={onRemove} haptic="light">
        <View
          style={[
            styles.chip,
            {
              backgroundColor: chipBg,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
            },
          ]}
        >
          <Text style={{ color: chipTextColor, fontFamily: theme.fonts.body, fontSize: 13 }}>
            {value}
          </Text>
          <Icon icon={Cancel01Icon} size={14} color={chipTextColor} />
        </View>
      </Pressable>
    );
  };

  const renderGenreChip = (genre: GenreOption) => {
    const state = getGenreState(genre);
    let chipBg = theme.colors.surfaceAlt;
    let chipTextColor = theme.colors.foreground;
    let borderColor = theme.colors.border;

    if (state === 'favorite') {
      chipBg = theme.colors.primarySubtle;
      chipTextColor = theme.colors.primary;
      borderColor = theme.colors.primary;
    } else if (state === 'excluded') {
      chipBg = theme.colors.dangerSubtle;
      chipTextColor = theme.colors.danger;
      borderColor = theme.colors.danger;
    }

    return (
      <Pressable
        key={genre.value}
        onPress={() => handleGenrePress(genre)}
        haptic="light"
      >
        <View
          style={[
            styles.genreChip,
            {
              backgroundColor: chipBg,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              borderWidth: 1,
              borderColor,
            },
          ]}
        >
          {state === 'favorite' && (
            <Icon icon={FavouriteIcon} size={12} color={chipTextColor} />
          )}
          {state === 'excluded' && (
            <Icon icon={CancelCircleIcon} size={12} color={chipTextColor} />
          )}
          <Text style={{ color: chipTextColor, fontFamily: theme.fonts.body, fontSize: 12 }}>
            {genre.label}
          </Text>
        </View>
      </Pressable>
    );
  };

  if (isLoading && !preferences) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const favoriteAuthors = preferences?.favorites.authors ?? [];
  const excludedAuthors = preferences?.excludes.authors ?? [];
  const favoriteSeries = preferences?.favorites.series ?? [];
  const excludedSeries = preferences?.excludes.series ?? [];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          Favorites & Excludes
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card variant="filled" padding="md" style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
            {isScholar
              ? 'Curate your reading experience. Favorites are prioritized in search, excludes are filtered out.'
              : 'Personalize your discovery! Tap genres to cycle: neutral → favorite → exclude.'}
          </Text>
        </Card>

        {/* Authors Section */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Icon icon={UserIcon} size={20} color={theme.colors.primary} />
            <Text variant="h3" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              Authors
            </Text>
          </View>

          <Card variant="outlined" style={{ marginBottom: theme.spacing.md }}>
            {(favoriteAuthors.length > 0 || excludedAuthors.length > 0) ? (
              <View style={styles.chipsContainer}>
                {favoriteAuthors.map((a) =>
                  renderChip(a, 'favorite', () => handleRemoveAuthor(a, 'favorite'))
                )}
                {excludedAuthors.map((a) =>
                  renderChip(a, 'exclude', () => handleRemoveAuthor(a, 'exclude'))
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text variant="caption" muted style={{ fontStyle: 'italic' }}>
                  No author preferences set
                </Text>
              </View>
            )}
          </Card>

          <Button
            variant="outline"
            onPress={() => navigation.navigate('AuthorIndex')}
          >
            <Icon icon={UserIcon} size={18} color={theme.colors.primary} />
            <Text style={{ marginLeft: 8, color: theme.colors.primary, fontWeight: '600' }}>
              Manage Authors
            </Text>
            <View style={{ flex: 1 }} />
            <Icon icon={ArrowRight01Icon} size={16} color={theme.colors.primary} />
          </Button>
        </View>

        {/* Genres Section */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Icon icon={BookOpen01Icon} size={20} color={theme.colors.primary} />
            <Text variant="h3" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              Genres
            </Text>
          </View>

          <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
            Tap to cycle: neutral → favorite (green) → exclude (red)
          </Text>

          {genreCategories?.map((category) => (
            <Card
              key={category.key}
              variant="outlined"
              style={{ marginBottom: theme.spacing.md }}
            >
              <View style={[styles.categoryHeader, { borderBottomColor: theme.colors.border }]}>
                <Text
                  variant="label"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {category.label}
                </Text>
              </View>
              <View style={styles.genreGrid}>
                {category.genres.map((genre) => renderGenreChip(genre))}
              </View>
            </Card>
          ))}
        </View>

        {/* Series Section */}
        <View style={{ marginBottom: theme.spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Icon icon={Bookmark01Icon} size={20} color={theme.colors.primary} />
            <Text variant="h3" style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
              Series
            </Text>
          </View>

          <Card variant="outlined">
            {(favoriteSeries.length > 0 || excludedSeries.length > 0) ? (
              <View style={styles.chipsContainer}>
                {favoriteSeries.map((s) =>
                  renderChip(s, 'favorite', () => handleRemoveSeries(s, 'favorite'))
                )}
                {excludedSeries.map((s) =>
                  renderChip(s, 'exclude', () => handleRemoveSeries(s, 'exclude'))
                )}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text variant="caption" muted style={{ fontStyle: 'italic' }}>
                  No series preferences set
                </Text>
              </View>
            )}
          </Card>

          <Text variant="caption" muted style={{ marginTop: theme.spacing.sm }}>
            Series preferences can be set from the Series detail screen
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sharedSpacing.md,
  },
  categoryHeader: {
    paddingHorizontal: sharedSpacing.md,
    paddingVertical: sharedSpacing.sm,
    borderBottomWidth: 1,
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
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 6,
  },
  genreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: sharedSpacing.md,
    gap: sharedSpacing.sm,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
});
