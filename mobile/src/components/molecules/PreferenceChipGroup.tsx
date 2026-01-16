import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { PreferenceChip } from './PreferenceChip';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import type { PreferenceState } from '@/types/preference';

export interface PreferenceItem {
  key: string;
  label: string;
  state: PreferenceState;
}

export interface PreferenceChipGroupProps {
  items: PreferenceItem[];
  onItemPress: (key: string, currentState: PreferenceState) => void;
  onItemLongPress?: (key: string) => void;
  onItemRemove?: (key: string) => void;
  scrollable?: boolean;
  size?: 'sm' | 'md';
  showStateIcon?: boolean;
  showRemove?: boolean;
  emptyMessage?: string;
}

export function PreferenceChipGroup({
  items,
  onItemPress,
  onItemLongPress,
  onItemRemove,
  scrollable = false,
  size = 'md',
  showStateIcon = true,
  showRemove = false,
  emptyMessage = 'No items',
}: PreferenceChipGroupProps) {
  const { theme } = useTheme();

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  const chips = items.map((item) => (
    <PreferenceChip
      key={item.key}
      label={item.label}
      state={item.state}
      size={size}
      showStateIcon={showStateIcon}
      showRemove={showRemove && item.state !== 'none'}
      onPress={() => onItemPress(item.key, item.state)}
      onLongPress={onItemLongPress ? () => onItemLongPress(item.key) : undefined}
      onRemove={onItemRemove ? () => onItemRemove(item.key) : undefined}
    />
  ));

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: sharedSpacing.sm,
          paddingRight: sharedSpacing.md,
        }}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={styles.grid}>{chips}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sharedSpacing.sm,
  },
  emptyContainer: {
    paddingVertical: sharedSpacing.md,
    alignItems: 'center',
  },
});
