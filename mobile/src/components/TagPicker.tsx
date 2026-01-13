import React, { useState, useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { BottomSheet } from '@/components/organisms';
import { Text, Button, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { Tick02Icon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import type { Tag, TagColor } from '@/types/tag';

interface TagPickerProps {
  visible: boolean;
  onClose: () => void;
  tags: Tag[];
  selectedTagIds: number[];
  onSave: (tagIds: number[]) => void;
  onCreateTag?: (name: string, color: TagColor) => Promise<Tag | void>;
  recentlyUsedTags?: Tag[];
}

const DEFAULT_COLORS: TagColor[] = ['primary', 'gold', 'green', 'purple', 'blue'];

export function TagPicker({
  visible,
  onClose,
  tags,
  selectedTagIds,
  onSave,
  onCreateTag,
  recentlyUsedTags = [],
}: TagPickerProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const safeTags = tags ?? [];
  const [localSelected, setLocalSelected] = useState<number[]>(selectedTagIds);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState<TagColor>('primary');

  React.useEffect(() => {
    if (visible) {
      setLocalSelected(selectedTagIds);
      setSearchQuery('');
      setIsCreating(false);
    }
  }, [visible, selectedTagIds]);

  const systemTags = useMemo(() => safeTags.filter((t) => t.is_system), [safeTags]);
  const userTags = useMemo(() => safeTags.filter((t) => !t.is_system), [safeTags]);

  const filteredSystemTags = useMemo(() => {
    if (!searchQuery.trim()) return systemTags;
    const query = searchQuery.toLowerCase();
    return systemTags.filter((t) => t.name.toLowerCase().includes(query));
  }, [systemTags, searchQuery]);

  const filteredUserTags = useMemo(() => {
    if (!searchQuery.trim()) return userTags;
    const query = searchQuery.toLowerCase();
    return userTags.filter((t) => t.name.toLowerCase().includes(query));
  }, [userTags, searchQuery]);

  const filteredRecentTags = useMemo(() => {
    if (!searchQuery.trim()) return recentlyUsedTags;
    const query = searchQuery.toLowerCase();
    return recentlyUsedTags.filter((t) => t.name.toLowerCase().includes(query));
  }, [recentlyUsedTags, searchQuery]);

  const showNoResults = searchQuery.trim() &&
    filteredSystemTags.length === 0 &&
    filteredUserTags.length === 0 &&
    filteredRecentTags.length === 0;

  const canCreateFromSearch = searchQuery.trim() &&
    !safeTags.some((t) => t.name.toLowerCase() === searchQuery.trim().toLowerCase());

  const toggleTag = (tagId: number) => {
    setLocalSelected((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  const saveButtonLabel = `Save (${localSelected.length} selected)`;

  const handleCreateInline = useCallback(async () => {
    if (!onCreateTag || !searchQuery.trim()) return;

    setIsCreating(true);
    try {
      const newTag = await onCreateTag(searchQuery.trim(), newTagColor);
      if (newTag && 'id' in newTag) {
        setLocalSelected((prev) => [...prev, newTag.id]);
        setSearchQuery('');
      }
    } finally {
      setIsCreating(false);
    }
  }, [onCreateTag, searchQuery, newTagColor]);

  const renderColorDot = (color: TagColor, isSelected: boolean) => {
    const tagColor = theme.tagColors[color] || theme.tagColors.primary;
    return (
      <TouchableOpacity
        key={color}
        onPress={() => setNewTagColor(color)}
        style={[
          styles.colorDot,
          {
            backgroundColor: tagColor.bg,
            borderWidth: isSelected ? 2 : 0,
            borderColor: theme.colors.foreground,
          },
        ]}
        accessibilityRole="radio"
        accessibilityLabel={`${color} color`}
        accessibilityState={{ checked: isSelected }}
      />
    );
  };

  const renderTagItem = (tag: Tag) => {
    const isSelected = localSelected.includes(tag.id);
    const tagColor = theme.tagColors[tag.color] || theme.tagColors.primary;

    return (
      <TouchableOpacity
        key={tag.id}
        onPress={() => toggleTag(tag.id)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing.md,
          marginBottom: theme.spacing.xs,
          backgroundColor: isSelected ? tagColor.bg : theme.colors.surface,
          borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
          borderWidth: theme.borders.thin,
          borderColor: isSelected ? tagColor.bg : theme.colors.border,
        }}
        accessibilityRole="checkbox"
        accessibilityLabel={tag.name}
        accessibilityState={{ checked: isSelected }}
        accessibilityHint={isSelected ? `Tap to deselect ${tag.name}` : `Tap to select ${tag.name}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: tagColor.bg,
              marginRight: theme.spacing.sm,
            }}
          />
          <Text
            variant="body"
            style={{
              color: isSelected ? tagColor.text : theme.colors.foreground,
            }}
          >
            {tag.name}
          </Text>
        </View>
        {isSelected && (
          <Icon icon={Tick02Icon} size={20} color={tagColor.text} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'Select Labels' : 'Select Tags'}
      showCloseButton
    >
      {/* Search Input */}
      <View
        style={[
          styles.searchContainer,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <Icon
          icon={Search01Icon}
          size={18}
          color={theme.colors.foregroundMuted}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={isScholar ? 'Search labels...' : 'Search tags...'}
          placeholderTextColor={theme.colors.foregroundSubtle}
          style={[
            styles.searchInput,
            {
              color: theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={50}
          accessibilityLabel={isScholar ? 'Search labels' : 'Search tags'}
          accessibilityHint="Type to filter the list of tags"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Icon
              icon={Cancel01Icon}
              size={18}
              color={theme.colors.foregroundMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {safeTags.length === 0 && !searchQuery && (
          <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
            <Text
              variant="body"
              style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
            >
              {isScholar ? 'No labels available' : 'No tags available'}
            </Text>
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundMuted, textAlign: 'center', marginTop: theme.spacing.xs }}
            >
              Create your first one below
            </Text>
          </View>
        )}

        {/* Recently Used Section */}
        {!searchQuery && filteredRecentTags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              Recently Used
            </Text>
            <View>
              {filteredRecentTags.map(renderTagItem)}
            </View>
          </View>
        )}

        {filteredSystemTags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'System Labels' : 'System Tags'}
            </Text>
            <View>
              {filteredSystemTags.map(renderTagItem)}
            </View>
          </View>
        )}

        {filteredUserTags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'My Labels' : 'My Tags'}
            </Text>
            <View>
              {filteredUserTags.map(renderTagItem)}
            </View>
          </View>
        )}

        {/* No Results / Create Inline */}
        {showNoResults && (
          <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
            <Text
              variant="body"
              style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
            >
              No matching {isScholar ? 'labels' : 'tags'} found
            </Text>
          </View>
        )}

        {/* Inline Create from Search */}
        {canCreateFromSearch && onCreateTag && (
          <View
            style={[
              styles.inlineCreateContainer,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            <View style={styles.inlineCreateHeader}>
              <Text
                variant="body"
                style={{ color: theme.colors.foreground }}
              >
                Create "{searchQuery.trim()}"
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.colors.foregroundMuted,
                  fontFamily: theme.fonts.body,
                }}
              >
                {searchQuery.trim().length}/50
              </Text>
            </View>
            <View style={styles.colorDotsRow}>
              {DEFAULT_COLORS.map((color) => renderColorDot(color, color === newTagColor))}
            </View>
            <View style={{ marginTop: theme.spacing.sm }}>
              <Button
                onPress={handleCreateInline}
                variant="primary"
                size="sm"
                loading={isCreating}
                disabled={isCreating}
              >
                Create & Add
              </Button>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={{ marginTop: theme.spacing.lg }}>
        <Button onPress={handleSave} variant="primary" fullWidth>
          {saveButtonLabel}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    maxHeight: 350,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sharedSpacing.md,
    paddingVertical: sharedSpacing.sm,
    gap: sharedSpacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  inlineCreateContainer: {
    gap: sharedSpacing.sm,
  },
  inlineCreateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorDotsRow: {
    flexDirection: 'row',
    gap: sharedSpacing.sm,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});
