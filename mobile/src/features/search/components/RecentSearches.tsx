import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clock01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, Pressable, ConfirmModal } from '@/components';
import { useTheme } from '@/themes';
import { useRecentSearches, useRecentSearchActions } from '@/stores/recentSearchesStore';

interface RecentSearchesProps {
  onSelectSearch: (query: string) => void;
}

export function RecentSearches({ onSelectSearch }: RecentSearchesProps) {
  const { theme } = useTheme();
  const rawSearches = useRecentSearches();
  const { removeSearch, clearSearches } = useRecentSearchActions();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const searches = Array.isArray(rawSearches) ? rawSearches : [];

  if (searches.length === 0) {
    return null;
  }

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    clearSearches();
    setShowClearConfirm(false);
  };

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <View style={[styles.header, { marginBottom: theme.spacing.sm }]}>
        <View style={styles.headerLeft}>
          <Icon icon={Clock01Icon} size={16} color={theme.colors.foregroundMuted} />
          <Text variant="label" muted>
            Recent Searches
          </Text>
        </View>
        <Pressable
          onPress={handleClearAll}
          haptic="light"
          style={{ flexShrink: 0 }}
          accessibilityLabel="Clear all recent searches"
          accessibilityHint="Removes all saved recent searches"
          accessibilityRole="button"
        >
          <Text variant="caption" color="primary">
            Clear All
          </Text>
        </Pressable>
      </View>

      <View
        style={[styles.searchList, { gap: theme.spacing.xs }]}
        accessibilityRole="list"
        accessibilityLabel="Recent searches"
      >
        {searches.map((search) => (
          <View
            key={search}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.md,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              paddingVertical: theme.spacing.sm,
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.sm,
              minHeight: 48,
            }}
          >
            <Pressable
              onPress={() => onSelectSearch(search)}
              haptic="light"
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${search}`}
              accessibilityHint="Tap to search again"
            >
              <Text variant="body" numberOfLines={1}>
                {search}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => removeSearch(search)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              haptic="light"
              style={{ padding: 8 }}
              accessibilityLabel={`Remove ${search} from recent searches`}
              accessibilityRole="button"
            >
              <Icon
                icon={Cancel01Icon}
                size={16}
                color={theme.colors.foregroundMuted}
              />
            </Pressable>
          </View>
        ))}
      </View>

      <ConfirmModal
        visible={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Recent Searches?"
        message="This will remove all your recent searches. This action cannot be undone."
        status="warning"
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        onConfirm={confirmClearAll}
        confirmDestructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  searchList: {
    flexDirection: 'column',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'nowrap',
  },
});
