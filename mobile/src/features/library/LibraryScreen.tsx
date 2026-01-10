import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import {
  Text,
  Card,
  FilterDial,
  AnimatedBookListItem,
  VignetteOverlay,
  SpineGridView,
} from '@/components';
import { useTheme } from '@/themes';
import { useScrollPhysics, buildSectionBoundaries } from '@/hooks';
import { useLibraryController, useSearchLens } from '@/features/library/hooks';
import {
  LibraryEmptyState,
  CoverGridView,
  TBRStackView,
  ViewModeToggle,
  SearchLens,
  SearchLensButton,
  type ViewMode,
} from '@/features/library/components';
import type { UserBook, BookStatus } from '@/types';

const TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'want_to_read', label: 'TBR' },
  { key: 'read', label: 'Read' },
  { key: 'dnf', label: 'DNF' },
];

export function LibraryScreen() {
  const { theme, themeName } = useTheme();
  const {
    activeTab,
    refreshing,
    loading,
    error,
    setActiveTab,
    onRefresh,
    handleBookPress,
    fetchLibrary,
    updateBook,
    moveToEndOfList,
    filteredBooks,
    getTabCount,
  } = useLibraryController();

  // View mode state - default to stack for TBR, list for others
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search lens state
  const searchLens = useSearchLens(filteredBooks);
  const { getMatchScore, isActive: searchIsActive, searchQuery } = searchLens;

  // Determine if we should show stack option (only for TBR tab)
  const showStackOption = activeTab === 'want_to_read';

  // Auto-switch to stack view when TBR tab is selected
  React.useEffect(() => {
    if (activeTab === 'want_to_read' && viewMode !== 'stack') {
      setViewMode('stack');
    } else if (activeTab !== 'want_to_read' && viewMode === 'stack') {
      setViewMode('list');
    }
  }, [activeTab]);

  // Build filter dial options
  const filterOptions = useMemo(
    () =>
      TABS.map((tab) => ({
        key: tab.key,
        label: tab.label,
        count: getTabCount(tab.key),
      })),
    [getTabCount]
  );

  // Build section boundaries for haptic feedback
  const sectionBoundaries = useMemo(
    () => buildSectionBoundaries(filteredBooks),
    [filteredBooks]
  );

  // Scroll physics for list view
  const { scrollHandler, tiltAngle, skewAngle } = useScrollPhysics({
    enableTilt: true,
    enableSkew: true,
    enableSectionHaptics: true,
    sectionBoundaries,
  });

  // Filter books based on search lens
  const displayBooks = useMemo(() => {
    if (!searchIsActive || !searchQuery.trim()) {
      return filteredBooks;
    }
    // When search is active, we still show all books but they'll have
    // different opacity based on match score (handled in render)
    return filteredBooks;
  }, [filteredBooks, searchIsActive, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      fetchLibrary();
    }, [fetchLibrary])
  );

  // Render book item with search match styling
  // Note: tiltAngle and skewAngle are SharedValues accessed via .value in worklets,
  // so they don't need to be in dependencies (they're stable refs)
  const renderBookItem = useCallback(
    ({ item, index }: { item: UserBook; index: number }) => {
      const matchScore = getMatchScore(item);
      const opacity = searchIsActive && searchQuery.trim()
        ? matchScore > 0 ? 1 : 0.2
        : 1;

      return (
        <Animated.View style={{ opacity }}>
          <AnimatedBookListItem
            item={item}
            index={index}
            onPress={handleBookPress}
            tiltAngle={tiltAngle}
            skewAngle={skewAngle}
            enablePhysics={!searchIsActive}
          />
        </Animated.View>
      );
    },
    [handleBookPress, getMatchScore, searchIsActive, searchQuery]
  );

  // Handle start reading from TBR stack
  const handleStartReading = useCallback(
    async (book: UserBook) => {
      try {
        await updateBook(book.id, { status: 'reading' });
      } catch (err) {
        console.error('Failed to start reading:', err);
      }
    },
    [updateBook]
  );

  // Handle read later from TBR stack (push to back of queue)
  const handleReadLater = useCallback(
    (book: UserBook) => {
      moveToEndOfList(book.id);
    },
    [moveToEndOfList]
  );

  // Render the appropriate view based on view mode
  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={[styles.centered, { paddingVertical: theme.spacing.xl }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      );
    }

    if (error) {
      return (
        <Card variant="outlined" padding="lg">
          <Text variant="body" color="danger" style={styles.centerText}>
            {error}
          </Text>
        </Card>
      );
    }

    if (displayBooks.length === 0) {
      return <LibraryEmptyState activeTab={activeTab} />;
    }

    // TBR Stack view
    if (viewMode === 'stack' && activeTab === 'want_to_read') {
      return (
        <TBRStackView
          books={displayBooks}
          onBookPress={handleBookPress}
          onStartReading={handleStartReading}
          onReadLater={handleReadLater}
          ListEmptyComponent={<LibraryEmptyState activeTab={activeTab} />}
        />
      );
    }

    // Spine view
    if (viewMode === 'spines') {
      return (
        <SpineGridView
          books={displayBooks}
          onBookPress={handleBookPress}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showShelves={true}
          ListEmptyComponent={<LibraryEmptyState activeTab={activeTab} />}
        />
      );
    }

    // Grid view
    if (viewMode === 'grid') {
      return (
        <CoverGridView
          books={displayBooks}
          onBookPress={handleBookPress}
          onRefresh={onRefresh}
          refreshing={refreshing}
          numColumns={3}
          showShelves={true}
          ListEmptyComponent={<LibraryEmptyState activeTab={activeTab} />}
        />
      );
    }

    // Default list view
    return (
      <FlashList
        data={displayBooks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBookItem}
        onScroll={scrollHandler as any}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      {/* Vignette overlay for Scholar theme */}
      {themeName === 'scholar' && <VignetteOverlay intensity="light" />}

      <View style={[styles.content, { padding: theme.spacing.lg }]}>
        {/* Header row */}
        <View style={[styles.headerRow, { marginBottom: theme.spacing.md }]}>
          <Text variant="h2">My Library</Text>

          {/* Search button */}
          <SearchLensButton
            onPress={searchLens.toggleLens}
            isActive={searchLens.isActive}
          />
        </View>

        {/* Filter dial */}
        <View style={{ marginBottom: theme.spacing.md }}>
          <FilterDial
            options={filterOptions}
            selected={activeTab}
            onSelect={(key) => setActiveTab(key as BookStatus | 'all')}
            showCounts={true}
          />
        </View>

        {/* Main content */}
        <View style={styles.contentArea}>{renderContent()}</View>
      </View>

      {/* Floating view mode toggle */}
      <View style={[styles.floatingToggle, { bottom: theme.spacing.lg }]}>
        <ViewModeToggle
          currentMode={viewMode}
          onModeChange={setViewMode}
          showStackOption={showStackOption}
        />
      </View>

      {/* Search lens overlay */}
      <SearchLens
        isActive={searchLens.isActive}
        searchQuery={searchLens.searchQuery}
        onSearchChange={searchLens.setSearchQuery}
        onClose={searchLens.closeLens}
        matchingCount={searchLens.matchingCount}
        totalCount={displayBooks.length}
        overlayOpacity={searchLens.overlayOpacity}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contentArea: {
    flex: 1,
  },
  floatingToggle: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  centered: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
