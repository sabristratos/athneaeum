import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { TagChip } from '@/components/molecules';
import { Text, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import type { Tag } from '@/types/tag';

interface TagListProps {
  tags: Tag[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  onTagPress?: (tag: Tag) => void;
  onTagLongPress?: (tag: Tag) => void;
  onMorePress?: () => void;
  showRemove?: boolean;
  onRemoveTag?: (tag: Tag) => void;
}

export function TagList({
  tags,
  maxDisplay,
  size = 'md',
  onTagPress,
  onTagLongPress,
  onMorePress,
  showRemove = false,
  onRemoveTag,
}: TagListProps) {
  const { theme } = useTheme();
  const safeTags = tags ?? [];

  const sortedTags = useMemo(() => {
    return [...safeTags].sort((a, b) => {
      if (a.is_system === b.is_system) return 0;
      return a.is_system ? 1 : -1;
    });
  }, [safeTags]);

  if (sortedTags.length === 0) {
    return null;
  }

  const displayTags = maxDisplay ? sortedTags.slice(0, maxDisplay) : sortedTags;
  const remainingCount = maxDisplay ? sortedTags.length - maxDisplay : 0;

  return (
    <View style={styles.container}>
      {displayTags.map((tag) => (
        <TagChip
          key={tag.id}
          tag={tag}
          size={size}
          onPress={onTagPress ? () => onTagPress(tag) : undefined}
          onLongPress={onTagLongPress ? () => onTagLongPress(tag) : undefined}
          showRemove={showRemove}
          onRemove={onRemoveTag ? () => onRemoveTag(tag) : undefined}
        />
      ))}
      {remainingCount > 0 && (
        <Pressable key="more-tags" onPress={onMorePress} haptic="light">
          <View
            style={[
              styles.moreChip,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radii.full,
                paddingHorizontal: sharedSpacing.sm,
                paddingVertical: sharedSpacing.xs,
              },
            ]}
          >
            <Text
              style={{
                fontSize: size === 'sm' ? 12 : 14,
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
              }}
            >
              +{remainingCount}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sharedSpacing.xs,
    alignItems: 'flex-start',
  },
  moreChip: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
