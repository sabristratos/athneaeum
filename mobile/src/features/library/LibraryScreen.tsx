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
  Chip,
  Pressable,
  Icon,
  FilterDial,
  AnimatedBookListItem,
  VignetteOverlay,
  SpineGridView,
  TagFilterBar,
  SwipeableViewContainer,
  useTabScreenPadding,
} from '@/components';
import { Cancel01Icon, Layers01Icon, ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { useScrollPhysics, buildSectionBoundaries, useNavBarScrollHandler } from '@/hooks';
import { useLibraryController, useSearchLens } from '@/features/library/hooks';
import {
  LibraryEmptyState,
  CoverGridView,
  TBRStackView,
  ViewModeToggle,
  SearchLens,
  SearchLensButton,
  SeriesGroupView,
  type ViewMode,
} from '@/features/library/components';
import type { UserBook, BookStatus } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as any;

const TABS: { key: BookStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reading', label: 'Reading' },
  { key: 'want_to_read', label: 'TBR' },
  { key: 'read', label: 'Read' },
  { key: 'dnf', label: 'DNF' },
];

export function LibraryScreen() {
  const { theme, themeName } = useTheme();
  const tabPadding = useTabScreenPadding();
  const {
    activeTab,
    refreshing,
    loading,
    error,
    setActiveTab,
    onRefresh,
    handleBookPress,
    handleSeriesPress,
    fetchLibrary,
    updateBook,
    moveToEndOfList,
    filteredBooks,
    getTabCount,
    tags,
    selectedTagFilters,
    filterMode,
    toggleTagFilter,
    clearTagFilters,
    toggleFilterMode,
    navigateToTagManagement,
    filteredCount,
    totalCount,
    genreFilter,
    genreFilterName,
    clearGenreFilter,
  } = useLibraryController();

  // View mode state - persisted per user preference
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Search lens state
  const searchLens = useSearchLens(filteredBooks);
  const { getMatchScore, isActive: searchIsActive, searchQuery } = searchLens;

  // Determine if we should show stack option (only for TBR tab)
  const showStackOption = activeTab === 'want_to_read';

  // When leaving TBR tab, reset from stack view to list (stack only makes sense for TBR)
  React.useEffect(() => {
    if (activeTab !== 'want_to_read' && viewMode === 'stack') {
      setViewMode('list');
    }
  }, [activeTab, viewMode]);

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
  const { scrollHandler: physicsScrollHandler, tiltAngle, skewAngle } = useScrollPhysics({
    enableTilt: true,
    enableSkew: true,
    enableSectionHaptics: true,
    sectionBoundaries,
  });

  // Nav bar hide/show on scroll
  const { onScroll: navBarOnScroll } = useNavBarScrollHandler();

  // Combined scroll handler
  const scrollHandler = useCallback(
    (event: any) => {
      physicsScrollHandler(event);
      navBarOnScroll(event);
    },
    [physicsScrollHandler, navBarOnScroll]
  );

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
      } catch {
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

  // Check if any books have series
  const hasSeriesBooks = useMemo(() => {
    return filteredBooks.some((ub) => ub.book.series_id);
  }, [filteredBooks]);

  // Available view modes for the current tab
  const availableViewModes = useMemo((): ViewMode[] => {
    const modes: ViewMode[] = ['list', 'grid', 'spines'];
    if (hasSeriesBooks) {
      modes.push('series');
    }
    if (activeTab === 'want_to_read') {
      modes.push('stack');
    }
    return modes;
  }, [activeTab, hasSeriesBooks]);

  // Handle swipe to change view mode
  const handleSwipeToNextView = useCallback(() => {
    const currentIndex = availableViewModes.indexOf(viewMode);
    const nextIndex = (currentIndex + 1) % availableViewModes.length;
    setViewMode(availableViewModes[nextIndex]);
  }, [viewMode, availableViewModes]);

  const handleSwipeToPrevView = useCallback(() => {
    const currentIndex = availableViewModes.indexOf(viewMode);
    const prevIndex = currentIndex === 0 ? availableViewModes.length - 1 : currentIndex - 1;
    setViewMode(availableViewModes[prevIndex]);
  }, [viewMode, availableViewModes]);

  // Disable view swipe when in stack mode (TBR has its own horizontal swipes)
  const swipeEnabled = viewMode !== 'stack';

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

    // Series view
    if (viewMode === 'series') {
      return (
        <SeriesGroupView
          books={displayBooks}
          onBookPress={handleBookPress}
          onSeriesPress={handleSeriesPress}
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
      <AnimatedFlashList
        data={displayBooks}
        keyExtractor={(item: UserBook) => item.id.toString()}
        renderItem={renderBookItem}
        estimatedItemSize={140}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabPadding.bottom }}
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
        <View style={{ marginBottom: theme.spacing.sm }}>
          <FilterDial
            options={filterOptions}
            selected={activeTab}
            onSelect={(key) => setActiveTab(key as BookStatus | 'all')}
            showCounts={true}
          />
        </View>

        {/* Genre filter chip */}
        {genreFilter && genreFilterName && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.xs }}>
            <Icon icon={Layers01Icon} size={16} color={theme.colors.foregroundMuted} />
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              Filtered by:
            </Text>
            <Chip
              label={genreFilterName}
              variant="primary"
              size="sm"
              selected
              onPress={clearGenreFilter}
              icon={<Icon icon={Cancel01Icon} size={12} color={theme.colors.onPrimary} />}
            />
          </View>
        )}

        {/* Tag filter bar */}
        {tags && tags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <TagFilterBar
              tags={tags}
              selectedSlugs={selectedTagFilters}
              onToggle={toggleTagFilter}
              onClear={clearTagFilters}
              onManageTags={navigateToTagManagement}
              filterMode={filterMode}
              onToggleFilterMode={toggleFilterMode}
              filteredCount={filteredCount}
              totalCount={totalCount}
            />
          </View>
        )}

        {/* View mode toggle - inline */}
        <View style={{ marginBottom: theme.spacing.sm }}>
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={setViewMode}
            showStackOption={showStackOption}
            showSeriesOption={hasSeriesBooks}
            variant="inline"
          />
        </View>

        {/* Swipe hint */}
        {swipeEnabled && availableViewModes.length > 1 && (
          <View style={styles.swipeHint}>
            <Icon icon={ArrowLeft02Icon} size={12} color={theme.colors.foregroundSubtle} />
            <Text
              variant="caption"
              emphatic
              style={{ color: theme.colors.foregroundSubtle, marginHorizontal: theme.spacing.xs }}
            >
              Swipe to switch views
            </Text>
            <Icon icon={ArrowRight02Icon} size={12} color={theme.colors.foregroundSubtle} />
          </View>
        )}

        {/* Main content with swipe gesture for view switching */}
        <SwipeableViewContainer
          onSwipeLeft={handleSwipeToNextView}
          onSwipeRight={handleSwipeToPrevView}
          enabled={swipeEnabled}
        >
          <View style={styles.contentArea}>{renderContent()}</View>
        </SwipeableViewContainer>
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
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  contentArea: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
});
