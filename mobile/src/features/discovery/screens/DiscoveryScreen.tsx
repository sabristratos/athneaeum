import React, { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, VignetteOverlay } from '@/components';
import { useTheme } from '@/themes';
import { useTabScreenPadding } from '@/components/layout/TabScreenLayout';
import { useDiscoveryController } from '../hooks';
import {
  DiscoveryHeader,
  DiscoverySection,
  DiscoverySkeleton,
  HeroSection,
  MoodFilter,
  SurpriseMeCard,
  QuickActionsSheet,
} from '../components';
import type { DiscoverySection as DiscoverySectionType, CatalogBook } from '@/types/discovery';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function DiscoveryScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const tabPadding = useTabScreenPadding();
  const isScholar = themeName === 'scholar';

  const [quickActionsBook, setQuickActionsBook] = useState<CatalogBook | null>(null);
  const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(false);

  const {
    sections,
    heroBook,
    allBooks,
    isLoading,
    isSearching,
    error,
    searchResults,
    selectedMoods,
    searchQuery,
    isSearchActive,
    recentSearches,
    refetch,
    handleBookClick,
    handleAddToLibrary,
    handleDismiss,
    handleMoodToggle,
    handleClearMoods,
    handleSearch,
    handleSearchFocus,
    handleSearchBlur,
    handleRecentSearchPress,
    handleClearRecentSearches,
  } = useDiscoveryController();

  const handleBookPress = useCallback(
    (book: CatalogBook) => {
      handleBookClick(book);
      navigation.navigate('CatalogBookDetail', { catalogBook: book });
    },
    [handleBookClick, navigation]
  );

  const handleBookLongPress = useCallback((book: CatalogBook) => {
    setQuickActionsBook(book);
    setIsQuickActionsVisible(true);
  }, []);

  const handleCloseQuickActions = useCallback(() => {
    setIsQuickActionsVisible(false);
    setTimeout(() => setQuickActionsBook(null), 300);
  }, []);

  const handleQuickAddToLibrary = useCallback(
    (book: CatalogBook) => {
      handleAddToLibrary(book);
    },
    [handleAddToLibrary]
  );

  const handleQuickSaveForLater = useCallback((book: CatalogBook) => {
    handleAddToLibrary(book);
  }, [handleAddToLibrary]);

  const handleQuickDismiss = useCallback(
    (book: CatalogBook) => {
      handleDismiss(book);
    },
    [handleDismiss]
  );

  const handleQuickShare = useCallback((book: CatalogBook) => {
    // TODO: Implement share functionality
  }, []);

  const renderSection = useCallback(
    (section: DiscoverySectionType, index: number) => {
      if (heroBook && section.data[0]?.id === heroBook.id) {
        const filteredData = section.data.slice(1);
        if (filteredData.length === 0) return null;
        return (
          <DiscoverySection
            key={`${section.type}-${section.title}`}
            section={{ ...section, data: filteredData }}
            onBookPress={handleBookPress}
            onBookLongPress={handleBookLongPress}
            index={index}
          />
        );
      }
      return (
        <DiscoverySection
          key={`${section.type}-${section.title}`}
          section={section}
          onBookPress={handleBookPress}
          onBookLongPress={handleBookLongPress}
          index={index}
        />
      );
    },
    [handleBookPress, handleBookLongPress, heroBook]
  );

  const showSearchResults = isSearchActive && searchQuery.length >= 2;

  const renderSearchResults = useCallback(() => {
    if (isSearching) {
      return (
        <View style={styles.searchingContainer}>
          <Text variant="body" muted>
            Searching...
          </Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Text variant="body" muted>
            No books found for "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <DiscoverySection
        section={{
          type: 'personalized',
          title: `Results for "${searchQuery}"`,
          data: searchResults,
        }}
        onBookPress={handleBookPress}
        onBookLongPress={handleBookLongPress}
      />
    );
  }, [isSearching, searchResults, searchQuery, handleBookPress, handleBookLongPress]);

  if (isLoading && sections.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        {isScholar && <VignetteOverlay intensity="light" />}
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <DiscoveryHeader
            onSearch={handleSearch}
            onSearchFocus={handleSearchFocus}
            onSearchBlur={handleSearchBlur}
            recentSearches={recentSearches}
            onRecentSearchPress={handleRecentSearchPress}
            onClearRecentSearches={handleClearRecentSearches}
          />
        </View>
        <DiscoverySkeleton />
      </SafeAreaView>
    );
  }

  if (error && sections.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        {isScholar && <VignetteOverlay intensity="light" />}
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <DiscoveryHeader
            onSearch={handleSearch}
            onSearchFocus={handleSearchFocus}
            onSearchBlur={handleSearchBlur}
            recentSearches={recentSearches}
            onRecentSearchPress={handleRecentSearchPress}
            onClearRecentSearches={handleClearRecentSearches}
          />
        </View>
        <View style={styles.errorContainer}>
          <Text variant="body" style={{ color: theme.colors.foregroundMuted }}>
            Unable to load recommendations.
          </Text>
          <Text
            variant="body"
            onPress={refetch}
            style={{ color: theme.colors.primary, marginTop: 8 }}
          >
            Tap to retry
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sections.length === 0 && !heroBook) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        {isScholar && <VignetteOverlay intensity="light" />}
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <DiscoveryHeader
            onSearch={handleSearch}
            onSearchFocus={handleSearchFocus}
            onSearchBlur={handleSearchBlur}
            recentSearches={recentSearches}
            onRecentSearchPress={handleRecentSearchPress}
            onClearRecentSearches={handleClearRecentSearches}
          />
        </View>
        <View style={styles.emptyContainer}>
          <Text variant="body" style={{ color: theme.colors.foregroundMuted }}>
            No recommendations available yet.
          </Text>
          <Text
            variant="caption"
            style={{ color: theme.colors.foregroundMuted, marginTop: 8 }}
          >
            Start reading to get personalized recommendations.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      {isScholar && <VignetteOverlay intensity="light" />}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: tabPadding.bottom + theme.spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
        <DiscoveryHeader
          onSearch={handleSearch}
          onSearchFocus={handleSearchFocus}
          onSearchBlur={handleSearchBlur}
          recentSearches={recentSearches}
          onRecentSearchPress={handleRecentSearchPress}
          onClearRecentSearches={handleClearRecentSearches}
        />

        {showSearchResults ? (
          renderSearchResults()
        ) : (
          <>
            {heroBook && (
              <HeroSection
                book={heroBook}
                onPress={handleBookPress}
                onAddToLibrary={handleQuickAddToLibrary}
              />
            )}

            <MoodFilter
              selectedMoods={selectedMoods}
              onMoodToggle={handleMoodToggle}
              onClearMoods={handleClearMoods}
            />

            {sections.map(renderSection)}

            {allBooks.length > 0 && (
              <SurpriseMeCard
                books={allBooks}
                onBookPress={handleBookPress}
                onAddToLibrary={handleQuickAddToLibrary}
              />
            )}
          </>
        )}
      </ScrollView>

      <QuickActionsSheet
        book={quickActionsBook}
        visible={isQuickActionsVisible}
        onClose={handleCloseQuickActions}
        onAddToLibrary={handleQuickAddToLibrary}
        onSaveForLater={handleQuickSaveForLater}
        onDismiss={handleQuickDismiss}
        onShare={handleQuickShare}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  searchingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noResultsContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
});
