import React, { useCallback } from 'react';
import { View, TextInput, RefreshControl, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button, Card, ConfirmModal } from '@/components';
import { useTheme } from '@/themes';
import {
  SearchFilterPanel,
  SearchResultCard,
  LoadMoreFooter,
  SearchResultSkeletonList,
} from '@/features/search/components';
import { useSearchController } from '@/features/search/hooks';
import type { SearchResult } from '@/types';

export function SearchScreen() {
  const { theme } = useTheme();
  const {
    query,
    setQuery,
    addingId,
    addedIds,
    errorModal,
    closeErrorModal,
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
  } = useSearchController();

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <SearchResultCard
        item={item}
        onAddToLibrary={handleAddToLibrary}
        isAdding={addingId === item.external_id}
        isAdded={addedIds.has(item.external_id)}
      />
    ),
    [handleAddToLibrary, addingId, addedIds]
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
            style={{ marginTop: theme.spacing.xs }}
          >
            Try adjusting your search or filters
          </Text>
        </View>
      );
    }

    return (
      <View
        style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}
      >
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
    );
  }, [loading, error, query, theme, refresh]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View style={[styles.content, { padding: theme.spacing.lg }]}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.md }}>
          Search Books
        </Text>

        <View style={{ marginBottom: theme.spacing.sm }}>
          <TextInput
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
              paddingVertical: theme.spacing.sm,
              fontSize: 16,
              fontFamily: theme.fonts.body,
              color: theme.colors.foreground,
            }}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
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

        <FlashList
          data={results}
          keyExtractor={(item) => item.external_id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: theme.spacing.xl,
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

      <ConfirmModal
        visible={errorModal.visible}
        onClose={closeErrorModal}
        title="Error"
        message={errorModal.message}
        status="error"
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
  centerText: {
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
