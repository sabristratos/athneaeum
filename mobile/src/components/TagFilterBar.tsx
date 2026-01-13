import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { TagChip } from '@/components/molecules';
import { Pressable, Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { FilterIcon, Cancel01Icon, Settings02Icon } from '@hugeicons/core-free-icons';
import type { Tag } from '@/types/tag';
import type { TagFilterMode } from '@/types/tag';

interface TagFilterBarProps {
  tags: Tag[];
  selectedSlugs: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  onManageTags?: () => void;
  filterMode?: TagFilterMode;
  onToggleFilterMode?: () => void;
  filteredCount?: number;
  totalCount?: number;
}

export function TagFilterBar({
  tags,
  selectedSlugs,
  onToggle,
  onClear,
  onManageTags,
  filterMode = 'any',
  onToggleFilterMode,
  filteredCount,
  totalCount,
}: TagFilterBarProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const safeSelectedSlugs = selectedSlugs ?? [];
  const hasActiveFilters = safeSelectedSlugs.length > 0;

  // Sort tags: user-defined first, then system tags
  const sortedTags = useMemo(() => {
    const safeTags = tags ?? [];
    return [...safeTags].sort((a, b) => {
      if (a.is_system === b.is_system) return 0;
      return a.is_system ? 1 : -1;
    });
  }, [tags]);

  if (sortedTags.length === 0) {
    return null;
  }

  const showFilterCount = hasActiveFilters && filteredCount !== undefined;

  return (
    <View style={styles.container}>
      {/* Settings Icon - Leftmost for Tag Management */}
      {onManageTags && (
        <Pressable onPress={onManageTags} haptic="light">
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.sm,
            }}
          >
            <Icon
              icon={Settings02Icon}
              size={18}
              color={theme.colors.foregroundMuted}
            />
          </View>
        </Pressable>
      )}

      {/* Filter Icon with Mode Toggle - Only show when 2+ tags selected */}
      {safeSelectedSlugs.length >= 2 && onToggleFilterMode && (
        <Pressable onPress={onToggleFilterMode} haptic="light">
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: theme.spacing.sm,
            }}
          >
            <Icon
              icon={FilterIcon}
              size={18}
              color={theme.colors.primary}
            />
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: '700',
                  color: theme.colors.onPrimary,
                  fontFamily: theme.fonts.body,
                }}
              >
                {filterMode === 'any' ? 'OR' : 'AND'}
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedTags.map((tag) => {
          const isSelected = safeSelectedSlugs.includes(tag.slug);
          return (
            <TagChip
              key={tag.id}
              tag={tag}
              selected={isSelected}
              onPress={() => onToggle(tag.slug)}
              size="sm"
              showCount
            />
          );
        })}
      </ScrollView>

      {/* Filter Count Badge */}
      {showFilterCount && (
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor: theme.colors.tintPrimary,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
            },
          ]}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '600',
              color: theme.colors.primary,
              fontFamily: theme.fonts.body,
            }}
          >
            {filteredCount}{totalCount !== undefined ? `/${totalCount}` : ''}
          </Text>
        </View>
      )}

      {hasActiveFilters && (
        <Pressable
          onPress={onClear}
          haptic="light"
          style={styles.clearButton}
        >
          <Icon
            icon={Cancel01Icon}
            size={16}
            color={theme.colors.foregroundMuted}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: sharedSpacing.xs,
  },
  modeBadge: {
    position: 'absolute',
    bottom: -4,
    right: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: sharedSpacing.xs,
    paddingRight: sharedSpacing.sm,
  },
  countBadge: {
    paddingHorizontal: sharedSpacing.sm,
    paddingVertical: sharedSpacing.xxs,
    marginLeft: sharedSpacing.xs,
  },
  clearButton: {
    paddingLeft: sharedSpacing.sm,
  },
});
