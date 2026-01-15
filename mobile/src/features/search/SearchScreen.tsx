import React, { useCallback, useState, useRef, useMemo } from 'react';
import {
  View,
  TextInput,
  RefreshControl,
  StyleSheet,
  FlatList,
  Pressable as RNPressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BarcodeScanIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { booksApi } from '@/api/books';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import {
  Text,
  Button,
  Card,
  ManualBookEntryModal,
  BarcodeScannerModal,
  EditionPickerModal,
  SeriesSuggestModal,
  Icon,
  Pressable,
  useTabScreenPadding,
  type ManualBookData,
} from '@/components';
import { useTheme } from '@/themes';
import {
  SearchFilterPanel,
  SearchResultCard,
  LoadMoreFooter,
  SearchResultSkeletonList,
  RecentSearches,
  type AuthorPreferenceStatus,
} from '@/features/search/components';
import { useSearchController } from '@/features/search/hooks';
import { useAddToLibrary } from '@/database/hooks/useLibrary';
import { useToast } from '@/stores/toastStore';
import { useBookEditionsQuery } from '@/queries';
import { useFavoriteAuthors, useExcludedAuthors } from '@/database/hooks';
import type { SearchResult, BookStatus, UserBook } from '@/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function SearchScreen() {
  const { theme } = useTheme();
  const tabPadding = useTabScreenPadding();
  const navigation = useNavigation<NavigationProp>();
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [editionPickerBook, setEditionPickerBook] = useState<SearchResult | null>(null);
  const [editionPickerStatus, setEditionPickerStatus] = useState<BookStatus>('want_to_read');
  const { addBook } = useAddToLibrary();
  const toast = useToast();
  const handleNavigateToBook = useCallback(
    (userBook: UserBook) => {
      navigation.navigate('BookDetail', { userBook });
    },
    [navigation]
  );
  const controllerData = useSearchController({
    onNavigateToBook: handleNavigateToBook,
  });
  const searchInputRef = useRef<TextInput>(null);

  const {
    query,
    setQuery,
    addingId,
    addedIds,
    libraryMap,
    activeFilterCount,
    results,
    meta,
    loading,
    loadingMore,
    error,
    filters,
    handleAddToLibrary,
    handleFiltersChange,
    handleEndReached,
    refresh,
    pendingSeriesSuggestion,
    clearSeriesSuggestion,
  } = controllerData;

  const {
    data: editions = [],
    isLoading: editionsLoading,
    error: editionsError,
  } = useBookEditionsQuery(
    editionPickerBook?.title ?? '',
    editionPickerBook?.author ?? '',
    { enabled: editionPickerBook !== null }
  );

  const { authors: favoriteAuthorPrefs } = useFavoriteAuthors();
  const { authors: excludedAuthorPrefs } = useExcludedAuthors();

  const authorPreferenceMap = useMemo(() => {
    const map: Record<string, AuthorPreferenceStatus> = {};
    favoriteAuthorPrefs.forEach((pref) => {
      map[pref.value.toLowerCase()] = 'favorite';
    });
    excludedAuthorPrefs.forEach((pref) => {
      map[pref.value.toLowerCase()] = 'excluded';
    });
    return map;
  }, [favoriteAuthorPrefs, excludedAuthorPrefs]);

  const getAuthorPreference = useCallback(
    (author: string): AuthorPreferenceStatus => {
      if (!author) return 'none';
      return authorPreferenceMap[author.toLowerCase()] ?? 'none';
    },
    [authorPreferenceMap]
  );

  const handleAddWithEditionCheck = useCallback(
    (book: SearchResult, status: BookStatus) => {
      if (book.edition_count != null && book.edition_count > 1) {
        setEditionPickerBook(book);
        setEditionPickerStatus(status);
      } else {
        handleAddToLibrary(book, status);
      }
    },
    [handleAddToLibrary]
  );

  const handleEditionSelect = useCallback(
    (edition: SearchResult, status: BookStatus) => {
      handleAddToLibrary(edition, status);
      setEditionPickerBook(null);
    },
    [handleAddToLibrary]
  );

  const handleManualSubmit = useCallback(
    async (data: ManualBookData) => {
      await addBook(
        {
          externalId: `manual-${Date.now()}`,
          externalProvider: 'manual',
          title: data.title,
          author: data.author,
          pageCount: data.page_count,
          isbn: data.isbn,
        },
        data.status
      );
      toast.success('Book added to library');
    },
    [addBook, toast]
  );

  const handleBarcodeScan = useCallback(
    (isbn: string) => {
      setQuery(isbn);
    },
    [setQuery]
  );

  const handleCardPress = useCallback(
    async (_item: SearchResult, userBookId?: number) => {
      if (!userBookId) {
        return;
      }
      try {
        const userBook = await booksApi.getUserBook(userBookId);
        navigation.navigate('BookDetail', { userBook });
      } catch {
        toast.danger('Failed to open book details');
      }
    },
    [navigation, toast]
  );

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => {
      if (!item) return null;
      return (
        <SearchResultCard
          item={item}
          onAddToLibrary={handleAddWithEditionCheck}
          onPress={handleCardPress}
          isAdding={addingId === item.external_id}
          isAdded={addedIds.has(item.external_id)}
          libraryInfo={libraryMap?.[item.external_id]}
          authorPreference={getAuthorPreference(item.author)}
        />
      );
    },
    [handleAddWithEditionCheck, handleCardPress, addingId, addedIds, libraryMap, getAuthorPreference]
  );

  const ListFooterComponent = useCallback(
    () => (
      <LoadMoreFooter
        loading={loadingMore}
        hasMore={meta?.has_more ?? false}
      />
    ),
    [loadingMore, meta]
  );

  const ListEmptyComponent = useCallback(() => {
    if (loading) {
      return <SearchResultSkeletonList count={5} />;
    }

    if (error) {
      return (
        <Card variant="outlined" padding="lg">
          <Text
            variant="body"
            color="danger"
            style={styles.centerText}
          >
            {error}
          </Text>
          <View style={{ marginTop: theme.spacing.md }}>
            <Button variant="secondary" size="sm" onPress={refresh} fullWidth>
              Retry
            </Button>
          </View>
        </Card>
      );
    }

    if (query.trim()) {
      return (
        <View
          style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}
        >
          <Text variant="body" muted>
            No books found
          </Text>
          <Text
            variant="caption"
            muted
            style={{ marginTop: theme.spacing.xs, marginBottom: theme.spacing.lg }}
          >
            Try adjusting your search or filters
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setShowManualEntry(true)}
          >
            Add Book Manually
          </Button>
        </View>
      );
    }

    return (
      <View style={{ paddingVertical: theme.spacing.md }}>
        <RecentSearches onSelectSearch={setQuery} />

        <View style={{ alignItems: 'center', paddingVertical: theme.spacing.lg }}>
          <Text variant="h3" muted>
            Find Your Next Read
          </Text>
          <Text
            variant="body"
            muted
            style={[styles.centerText, { marginTop: theme.spacing.sm }]}
          >
            Search for books by title, author, or ISBN to add them to your
            library.
          </Text>
        </View>
      </View>
    );
  }, [loading, error, query, theme, refresh, setQuery]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View style={[styles.content, { padding: theme.spacing.lg }]}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>
          Search Books
        </Text>

        <View style={[styles.searchRow, { marginBottom: theme.spacing.sm, gap: theme.spacing.sm }]}>
          <View style={{ flex: 1, position: 'relative' }}>
            <TextInput
              ref={searchInputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by title, author, or ISBN..."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.md,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingRight: query.length > 0 ? 44 : theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                fontSize: 16,
                fontFamily: theme.fonts.body,
                color: theme.colors.foreground,
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (query.trim().length >= 2) {
                  refresh();
                }
              }}
              accessibilityLabel="Search books"
              accessibilityHint="Enter book title, author name, or ISBN to search"
            />
            {query.length > 0 && (
              <RNPressable
                onPress={() => {
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                style={{
                  position: 'absolute',
                  right: theme.spacing.sm,
                  top: 0,
                  bottom: 0,
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.xs,
                }}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon icon={Cancel01Icon} size={20} color={theme.colors.foregroundMuted} />
              </RNPressable>
            )}
          </View>
          <Pressable
            onPress={() => setShowBarcodeScanner(true)}
            style={{
              flexShrink: 0,
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              padding: theme.spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
              width: 48,
              height: 48,
            }}
            accessibilityLabel="Scan barcode"
            accessibilityHint="Open camera to scan book ISBN barcode"
            accessibilityRole="button"
          >
            <Icon icon={BarcodeScanIcon} size={24} color={theme.colors.foreground} />
          </Pressable>
        </View>

        <SearchFilterPanel
          filters={filters}
          onFiltersChange={handleFiltersChange}
          activeFilterCount={activeFilterCount}
        />

        {!loading && meta && results.length > 0 && (
          <View
            style={[styles.metaRow, { marginBottom: theme.spacing.sm }]}
          >
            <Text variant="caption" muted>
              {results.length} of {meta.total.toLocaleString()} result
              {meta.total !== 1 ? 's' : ''}
            </Text>
            <Text variant="caption" muted>
              via {meta.provider.replace('_', ' ')}
            </Text>
          </View>
        )}

        <FlatList
          data={results ?? []}
          keyExtractor={(item, index) =>
            item?.external_id ?? `manual-${item?.title ?? 'unknown'}-${index}`
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: tabPadding.bottom,
          }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={results.length > 0 ? ListFooterComponent : null}
          ListEmptyComponent={ListEmptyComponent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refresh}
              tintColor={theme.colors.primary}
            />
          }
        />
      </View>

      <ManualBookEntryModal
        visible={showManualEntry}
        onClose={() => setShowManualEntry(false)}
        onSubmit={handleManualSubmit}
        initialQuery={query}
      />

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={handleBarcodeScan}
      />

      <EditionPickerModal
        visible={editionPickerBook !== null}
        onClose={() => setEditionPickerBook(null)}
        onSelect={handleEditionSelect}
        editions={editions}
        loading={editionsLoading}
        error={editionsError ? 'Failed to load editions' : null}
        bookTitle={editionPickerBook?.title ?? ''}
        initialStatus={editionPickerStatus}
      />

      {pendingSeriesSuggestion && (
        <SeriesSuggestModal
          visible={true}
          onClose={clearSeriesSuggestion}
          seriesName={pendingSeriesSuggestion.seriesName}
          volumeNumber={pendingSeriesSuggestion.volumeNumber}
          bookId={pendingSeriesSuggestion.bookId}
          bookTitle={pendingSeriesSuggestion.bookTitle}
          bookAuthor={pendingSeriesSuggestion.bookAuthor}
        />
      )}
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
  centerText: {
    textAlign: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
