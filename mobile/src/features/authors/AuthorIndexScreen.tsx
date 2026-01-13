import React from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TypedFlashList = FlashList as any;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  ArrowLeft01Icon,
  Search01Icon,
  Cancel01Icon,
  FavouriteIcon,
  SortingAZ02Icon,
  SortingZA01Icon,
} from '@hugeicons/core-free-icons';
import { Text, IconButton, Icon, SegmentedControl, Card, Chip, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { useAuthorIndexController, SORT_OPTIONS } from './hooks/useAuthorIndexController';
import {
  LibraryAuthorCard,
  OpenLibraryAuthorCard,
  AuthorDetailSheet,
} from './components';
import type { LibraryAuthor, LibraryAuthorFilter, LibraryAuthorSort, OpenLibraryAuthor } from '@/types';

const FILTER_OPTIONS: { key: LibraryAuthorFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'excluded', label: 'Excluded' },
];

export function AuthorIndexScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation();
  const isScholar = themeName === 'scholar';

  const {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    searchMode,
    toggleSearchMode,
    searchQuery,
    setSearchQuery,
    localSearchQuery,
    setLocalSearchQuery,
    clearLocalSearch,
    libraryAuthors,
    searchResults,
    loadingLibrary,
    loadingSearch,
    refreshingLibrary,
    refetchLibrary,
    libraryError,
    searchError,
    handleToggleFavorite,
    handleToggleExclude,
    handleSelectOpenLibraryAuthor,
    selectedAuthor,
    closeSheet,
    handleSheetFavorite,
    handleSheetExclude,
  } = useAuthorIndexController();

  const renderLibraryItem = ({ item }: { item: LibraryAuthor }) => (
    <LibraryAuthorCard
      author={item}
      onToggleFavorite={() => handleToggleFavorite(item)}
      onToggleExclude={() => handleToggleExclude(item)}
    />
  );

  const renderSearchItem = ({ item }: { item: OpenLibraryAuthor }) => (
    <OpenLibraryAuthorCard
      author={item}
      onPress={() => handleSelectOpenLibraryAuthor(item)}
    />
  );

  const renderEmptyLibrary = () => (
    <Card variant="filled" style={{ margin: theme.spacing.lg, padding: theme.spacing.xl }}>
      <View style={{ alignItems: 'center' }}>
        <Icon icon={FavouriteIcon} size={48} color={theme.colors.foregroundSubtle} />
        <Text
          variant="body"
          muted
          style={{ marginTop: theme.spacing.md, textAlign: 'center' }}
        >
          {filter === 'all'
            ? 'No authors in your library yet.\nAdd some books to see authors here!'
            : filter === 'favorites'
            ? 'No favorite authors yet.\nTap the heart icon to add favorites.'
            : 'No excluded authors.\nExcluded authors won\'t appear in search results.'}
        </Text>
      </View>
    </Card>
  );

  const renderEmptySearch = () => (
    <Card variant="filled" style={{ margin: theme.spacing.lg, padding: theme.spacing.xl }}>
      <View style={{ alignItems: 'center' }}>
        <Icon icon={Search01Icon} size={48} color={theme.colors.foregroundSubtle} />
        <Text
          variant="body"
          muted
          style={{ marginTop: theme.spacing.md, textAlign: 'center' }}
        >
          {searchQuery.length < 2
            ? 'Type at least 2 characters to search'
            : 'No authors found.\nTry a different search term.'}
        </Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          Authors
        </Text>
        <IconButton
          icon={searchMode ? Cancel01Icon : Search01Icon}
          onPress={toggleSearchMode}
          variant={searchMode ? 'primary' : 'ghost'}
          accessibilityLabel={searchMode ? 'Close search' : 'Search authors'}
        />
      </View>

      {searchMode ? (
        <View style={{ paddingHorizontal: theme.spacing.md }}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon icon={Search01Icon} size={18} color={theme.colors.foregroundMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search OpenLibrary..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.searchInput,
                { color: theme.colors.foreground, fontFamily: theme.fonts.body },
              ]}
              autoCapitalize="words"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <IconButton
                icon={Cancel01Icon}
                size="sm"
                variant="ghost"
                onPress={() => setSearchQuery('')}
                accessibilityLabel="Clear search"
              />
            )}
          </View>

          {searchError && (
            <Card variant="outlined" padding="lg" style={{ marginVertical: theme.spacing.md }}>
              <Text variant="body" color="danger" style={{ textAlign: 'center' }}>
                {searchError}
              </Text>
            </Card>
          )}

          {loadingSearch ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text variant="caption" muted style={{ marginTop: theme.spacing.sm }}>
                Searching OpenLibrary...
              </Text>
            </View>
          ) : (
            <TypedFlashList
              data={searchResults}
              renderItem={renderSearchItem}
              keyExtractor={(item: OpenLibraryAuthor) => item.key}
              estimatedItemSize={80}
              contentContainerStyle={{ paddingVertical: theme.spacing.md }}
              ListEmptyComponent={renderEmptySearch}
            />
          )}
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.border,
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              <Icon icon={Search01Icon} size={18} color={theme.colors.foregroundMuted} />
              <TextInput
                value={localSearchQuery}
                onChangeText={setLocalSearchQuery}
                placeholder="Filter by author name..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                style={[
                  styles.searchInput,
                  { color: theme.colors.foreground, fontFamily: theme.fonts.body },
                ]}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
              />
              {localSearchQuery.length > 0 && (
                <IconButton
                  icon={Cancel01Icon}
                  size="sm"
                  variant="ghost"
                  onPress={clearLocalSearch}
                  accessibilityLabel="Clear filter"
                />
              )}
            </View>
            <SegmentedControl
              options={FILTER_OPTIONS}
              selected={filter}
              onSelect={(key) => setFilter(key as LibraryAuthorFilter)}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: theme.spacing.md,
              paddingBottom: theme.spacing.sm,
              gap: theme.spacing.xs,
            }}
          >
            <Text variant="caption" muted style={{ marginRight: theme.spacing.xs }}>
              Sort:
            </Text>
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={sortBy === option.key}
                onPress={() => setSortBy(option.key)}
                size="sm"
              />
            ))}
            <View style={{ flex: 1 }} />
            <IconButton
              icon={sortOrder === 'desc' ? SortingZA01Icon : SortingAZ02Icon}
              size="sm"
              variant="ghost"
              onPress={toggleSortOrder}
              accessibilityLabel={sortOrder === 'desc' ? 'Sort descending' : 'Sort ascending'}
            />
          </View>

          {libraryError && (
            <Card variant="outlined" padding="lg" style={{ marginHorizontal: theme.spacing.md, marginBottom: theme.spacing.md }}>
              <Text variant="body" color="danger" style={{ textAlign: 'center' }}>
                {libraryError}
              </Text>
            </Card>
          )}

          {loadingLibrary && !refreshingLibrary ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <TypedFlashList
              data={libraryAuthors}
              renderItem={renderLibraryItem}
              keyExtractor={(item: LibraryAuthor) => item.normalized}
              estimatedItemSize={80}
              contentContainerStyle={{
                paddingHorizontal: theme.spacing.md,
                paddingBottom: 100,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingLibrary}
                  onRefresh={() => refetchLibrary()}
                  tintColor={theme.colors.primary}
                />
              }
              ListEmptyComponent={renderEmptyLibrary}
            />
          )}
        </>
      )}

      {selectedAuthor && (
        <AuthorDetailSheet
          visible={!!selectedAuthor}
          onClose={closeSheet}
          authorKey={selectedAuthor.key}
          authorName={selectedAuthor.name}
          isFavorite={selectedAuthor.isFavorite}
          isExcluded={selectedAuthor.isExcluded}
          onFavorite={handleSheetFavorite}
          onExclude={handleSheetExclude}
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
});
