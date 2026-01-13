import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  Card,
  TagEditor,
  FloatingActionButton,
  SwipeableRow,
  IconButton,
  Icon,
  Pressable,
} from '@/components';
import { useTheme } from '@/themes';
import { useTags, useTagActions } from '@/database/hooks';
import { useToast } from '@/stores/toastStore';
import { Add01Icon, ArrowLeft01Icon, Search01Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import type { TagColor } from '@/types/tag';
import type { Tag } from '@/database/models/Tag';
import { sharedSpacing } from '@/themes/shared';

export function TagManagementScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const isScholar = themeName === 'scholar';

  const { tags, loading } = useTags();
  const { createTag, updateTag, deleteTag, loading: actionLoading } = useTagActions();

  const [refreshing, setRefreshing] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletedTagInfo, setDeletedTagInfo] = useState<{ tag: Tag; name: string; color: string } | null>(null);

  const systemTags = useMemo(() => tags.filter((t) => t.isSystem), [tags]);
  const userTags = useMemo(() => tags.filter((t) => !t.isSystem), [tags]);

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

  const existingNames = useMemo(() => tags.map((t) => t.name), [tags]);

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  };

  const handleCreateTag = () => {
    setEditingTag(undefined);
    setEditorVisible(true);
  };

  const handleEditTag = (tag: Tag) => {
    if (tag.isSystem) return;
    setEditingTag(tag);
    setEditorVisible(true);
  };

  const handleSaveTag = async (name: string, color: TagColor) => {
    try {
      if (editingTag) {
        await updateTag(editingTag.id, { name, color });
        toast.success(`${isScholar ? 'Label' : 'Tag'} updated`);
      } else {
        await createTag(name, color);
        toast.success(`${isScholar ? 'Label' : 'Tag'} created`);
      }
    } catch (err) {
      toast.danger(`Failed to ${editingTag ? 'update' : 'create'} ${isScholar ? 'label' : 'tag'}`);
    }
  };

  const handleDeleteTag = async () => {
    if (!editingTag) return;

    const tagName = editingTag.name;
    const tagColor = editingTag.color;
    const tagId = editingTag.id;

    setDeletedTagInfo({ tag: editingTag, name: tagName, color: tagColor });
    await deleteTag(tagId);

    toast.info(`"${tagName}" deleted`, {
      action: {
        label: 'Undo',
        onPress: async () => {
          if (deletedTagInfo) {
            try {
              await createTag(deletedTagInfo.name, deletedTagInfo.color as TagColor);
              toast.success(`"${deletedTagInfo.name}" restored`);
              setDeletedTagInfo(null);
            } catch {
              toast.danger('Failed to restore tag');
            }
          }
        },
      },
    });
  };

  const handleSwipeDelete = async (tag: Tag) => {
    const tagName = tag.name;
    const tagColor = tag.color;

    setDeletedTagInfo({ tag, name: tagName, color: tagColor });

    try {
      await deleteTag(tag.id);

      toast.info(`"${tagName}" deleted`, {
        action: {
          label: 'Undo',
          onPress: async () => {
            try {
              await createTag(tagName, tagColor as TagColor);
              toast.success(`"${tagName}" restored`);
              setDeletedTagInfo(null);
            } catch {
              toast.danger('Failed to restore tag');
            }
          },
        },
      });
    } catch {
      toast.danger('Failed to delete tag');
    }
  };

  const renderTagItem = (tag: Tag, canDelete: boolean) => {
    const tagColor = theme.tagColors[tag.color as TagColor] || theme.tagColors.primary;

    const content = (
      <View
        style={[
          styles.tagItem,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.colorDot,
            {
              backgroundColor: tagColor.bg,
            },
          ]}
        />
        <View style={styles.tagInfo}>
          <Text
            style={{
              color: theme.colors.foreground,
              fontFamily: theme.fonts.body,
              fontSize: 15,
            }}
          >
            {tag.name}
          </Text>
        </View>
      </View>
    );

    if (canDelete) {
      return (
        <SwipeableRow
          key={tag.id}
          onDelete={() => handleSwipeDelete(tag)}
        >
          <Pressable onPress={() => handleEditTag(tag)} haptic="light">
            {content}
          </Pressable>
        </SwipeableRow>
      );
    }

    return (
      <View key={tag.id} style={{ marginBottom: theme.spacing.sm }}>
        {content}
      </View>
    );
  };

  if (loading && !refreshing && tags.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const showNoResults = searchQuery.trim() &&
    filteredSystemTags.length === 0 &&
    filteredUserTags.length === 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          {isScholar ? 'Manage Labels' : 'Manage Tags'}
        </Text>
      </View>

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
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
          />
          {searchQuery.length > 0 && (
            <IconButton
              icon={Cancel01Icon}
              onPress={() => setSearchQuery('')}
              variant="ghost"
              size="sm"
              accessibilityLabel="Clear search"
            />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >

        {showNoResults && (
          <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
            <Text
              variant="body"
              style={{ color: theme.colors.foregroundMuted, textAlign: 'center' }}
            >
              No matching {isScholar ? 'labels' : 'tags'} found
            </Text>
          </View>
        )}

        {filteredSystemTags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'System Labels' : 'System Tags'}
            </Text>
            {filteredSystemTags.map((tag) => renderTagItem(tag, false))}
          </View>
        )}

        {!searchQuery && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'My Labels' : 'My Tags'}
            </Text>
            {userTags.length > 0 ? (
              userTags.map((tag) => renderTagItem(tag, true))
            ) : (
              <View style={styles.emptyState}>
                <Text
                  variant="body"
                  muted
                  style={styles.centerText}
                >
                  {isScholar
                    ? 'No custom labels yet. Create one to organize your library.'
                    : 'No custom tags yet. Create one to organize your books.'}
                </Text>
              </View>
            )}
          </View>
        )}

        {searchQuery && filteredUserTags.length > 0 && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.sm,
              }}
            >
              {isScholar ? 'My Labels' : 'My Tags'}
            </Text>
            {filteredUserTags.map((tag) => renderTagItem(tag, true))}
          </View>
        )}
      </ScrollView>

      <FloatingActionButton
        icon={Add01Icon}
        label={isScholar ? 'New Label' : 'New Tag'}
        onPress={handleCreateTag}
      />

      <TagEditor
        visible={editorVisible}
        onClose={() => setEditorVisible(false)}
        tag={editingTag ? {
          id: editingTag.serverId ?? 0,
          name: editingTag.name,
          slug: editingTag.slug,
          color: editingTag.color as TagColor,
          color_label: editingTag.color,
          is_system: editingTag.isSystem,
          sort_order: editingTag.sortOrder,
          created_at: editingTag.createdAt.toISOString(),
          updated_at: editingTag.updatedAt.toISOString(),
        } : undefined}
        onSave={handleSaveTag}
        onDelete={editingTag && !editingTag.isSystem ? handleDeleteTag : undefined}
        existingNames={existingNames}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tagInfo: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: 24,
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
});
