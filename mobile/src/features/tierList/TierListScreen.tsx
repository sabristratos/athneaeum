import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft02Icon, Share01Icon, Analytics01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Text, IconButton, Icon, Chip } from '@/components';
import { useTheme } from '@/themes';
import { useTierListController } from './hooks/useTierListController';
import { TierRow } from './components/TierRow';
import { TierActionModal } from './components/TierActionModal';
import { ShareableTierList } from './components/ShareableTierList';
import { TIER_DEFINITIONS, type TierListBook, type TierName } from '@/types/tierList';

export function TierListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    tiers,
    isLoading,
    isEmpty,
    shareableRef,
    availableFilters,
    selectedFilters,
    handleReorder,
    handleMoveBook,
    handleRemoveBook,
    handleToggleFilter,
    handleClearFilters,
    handleShare,
  } = useTierListController();

  const [selectedBook, setSelectedBook] = useState<TierListBook | null>(null);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const hasFilters = selectedFilters.length > 0;

  const handleBookPress = useCallback((book: TierListBook, tierName: TierName) => {
    setSelectedBook(book);
    setSelectedTier(tierName);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedBook(null);
    setSelectedTier(null);
  }, []);

  const handleMoveTo = useCallback((toTier: TierName) => {
    if (selectedBook && selectedTier) {
      handleMoveBook(selectedBook.id, selectedTier, toTier);
    }
    handleCloseModal();
  }, [selectedBook, selectedTier, handleMoveBook, handleCloseModal]);

  const handleRemove = useCallback(() => {
    if (selectedBook && selectedTier) {
      handleRemoveBook(selectedBook.id, selectedTier);
    }
    handleCloseModal();
  }, [selectedBook, selectedTier, handleRemoveBook, handleCloseModal]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top']}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: theme.borders.thin,
          borderBottomColor: theme.colors.border,
        }}
      >
        <IconButton
          icon={ArrowLeft02Icon}
          variant="ghost"
          size="md"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          My Tier List
        </Text>
        <IconButton
          icon={Share01Icon}
          variant="ghost"
          size="md"
          onPress={handleShare}
          accessibilityLabel="Share tier list"
        />
      </View>

      {availableFilters.length > 0 && (
        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs }}>
            <Text variant="caption" muted style={{ flex: 1 }}>
              Filter by genre or tag
            </Text>
            {hasFilters && (
              <Pressable onPress={handleClearFilters}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Icon icon={Cancel01Icon} size={12} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                    Clear
                  </Text>
                </View>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {availableFilters.map((filter) => (
              <Chip
                key={filter.id}
                label={filter.label}
                selected={selectedFilters.includes(filter.id)}
                onPress={() => handleToggleFilter(filter.id)}
                size="sm"
                variant={filter.type === 'genre' ? 'default' : 'muted'}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : isEmpty ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: theme.spacing.xl,
          }}
        >
          <Icon icon={Analytics01Icon} size={64} color={theme.colors.foregroundMuted} />
          <Text
            variant="h3"
            style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}
          >
            {hasFilters ? 'No Matching Books' : 'No Rated Books Yet'}
          </Text>
          <Text
            variant="body"
            muted
            style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}
          >
            {hasFilters
              ? 'No rated books match the selected filters. Try different options.'
              : 'Rate some books in your library to generate your tier list automatically.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.md }}
        >
          <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
            Long press to drag • Tap to move or remove
          </Text>
          {TIER_DEFINITIONS.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              books={tiers[tier.id]}
              onReorder={handleReorder}
              onBookPress={handleBookPress}
            />
          ))}
        </ScrollView>
      )}

      <View style={{ position: 'absolute', left: -9999, top: 0 }}>
        <ShareableTierList ref={shareableRef} tiers={tiers} />
      </View>

      <TierActionModal
        visible={modalVisible}
        book={selectedBook}
        currentTier={selectedTier}
        onClose={handleCloseModal}
        onMoveTo={handleMoveTo}
        onRemove={handleRemove}
      />
    </SafeAreaView>
  );
}
