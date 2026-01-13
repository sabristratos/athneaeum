import React, { useState, useEffect, useMemo } from 'react';
import { View, TextInput, StyleSheet, Alert } from 'react-native';
import { BottomSheet } from '@/components/organisms';
import { TagColorPicker } from '@/components/TagColorPicker';
import { Text, Button } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import type { Tag, TagColor } from '@/types/tag';

const MAX_NAME_LENGTH = 50;
const WARNING_THRESHOLD = 40;

interface TagEditorProps {
  visible: boolean;
  onClose: () => void;
  tag?: Tag;
  onSave: (name: string, color: TagColor) => Promise<void>;
  onDelete?: () => Promise<void>;
  loading?: boolean;
  existingNames?: string[];
}

export function TagEditor({
  visible,
  onClose,
  tag,
  onSave,
  onDelete,
  loading = false,
  existingNames = [],
}: TagEditorProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const isEditMode = !!tag;

  const [name, setName] = useState('');
  const [color, setColor] = useState<TagColor>('primary');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      if (tag) {
        setName(tag.name);
        setColor(tag.color);
      } else {
        setName('');
        setColor('primary');
      }
    }
  }, [visible, tag]);

  const isDuplicate = useMemo(() => {
    const trimmedName = name.trim().toLowerCase();
    if (!trimmedName) return false;
    if (isEditMode && tag?.name.toLowerCase() === trimmedName) return false;
    return existingNames.some((n) => n.toLowerCase() === trimmedName);
  }, [name, existingNames, isEditMode, tag?.name]);

  const charCount = name.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD;
  const isAtLimit = charCount >= MAX_NAME_LENGTH;

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a tag name');
      return;
    }

    if (isDuplicate) {
      Alert.alert('Error', 'A tag with this name already exists');
      return;
    }

    setSaving(true);
    try {
      await onSave(name.trim(), color);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete "${tag?.name}"? This will remove it from all books.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await onDelete();
              onClose();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete tag');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const title = isEditMode
    ? isScholar
      ? 'Edit Label'
      : 'Edit Tag'
    : isScholar
    ? 'Create Label'
    : 'Create Tag';

  const tagColor = theme.tagColors[color] || theme.tagColors.primary;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      showCloseButton
    >
      <View style={{ gap: theme.spacing.lg }}>
        {/* Live Preview */}
        <View style={styles.previewContainer}>
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
            }}
          >
            Preview
          </Text>
          <View
            style={[
              styles.previewChip,
              {
                backgroundColor: tagColor.bg,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              },
            ]}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: tagColor.bg,
                marginRight: theme.spacing.xs,
                borderWidth: 1,
                borderColor: tagColor.text,
              }}
            />
            <Text
              style={{
                color: tagColor.text,
                fontFamily: theme.fonts.body,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              {name.trim() || (isScholar ? 'Label name' : 'Tag name')}
            </Text>
          </View>
        </View>

        {/* Name Input */}
        <View>
          <View style={styles.labelRow}>
            <Text
              variant="label"
              style={{
                color: theme.colors.foregroundMuted,
              }}
            >
              Name
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: theme.fonts.body,
                color: isAtLimit
                  ? theme.colors.danger
                  : isNearLimit
                  ? theme.colors.warning
                  : theme.colors.foregroundMuted,
              }}
            >
              {charCount}/{MAX_NAME_LENGTH}
            </Text>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={isScholar ? 'Enter label name...' : 'Enter tag name...'}
            placeholderTextColor={theme.colors.foregroundSubtle}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surfaceAlt,
                color: theme.colors.foreground,
                fontFamily: theme.fonts.body,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                borderWidth: isDuplicate ? 2 : theme.borders.thin,
                borderColor: isDuplicate ? theme.colors.danger : theme.colors.border,
              },
            ]}
          />
          {isDuplicate && (
            <Text
              variant="caption"
              style={{ color: theme.colors.danger, marginTop: theme.spacing.xs }}
            >
              A {isScholar ? 'label' : 'tag'} with this name already exists
            </Text>
          )}
        </View>

        {/* Color Picker */}
        <View>
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              marginBottom: theme.spacing.sm,
            }}
          >
            Color
          </Text>
          <TagColorPicker selectedColor={color} onSelectColor={setColor} />
        </View>

        {/* Actions */}
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            onPress={handleSave}
            variant="primary"
            fullWidth
            loading={saving}
            disabled={!name.trim() || saving || isDuplicate}
          >
            {isEditMode ? 'Save Changes' : 'Create'}
          </Button>

          {isEditMode && onDelete && !tag?.is_system && (
            <Button
              onPress={handleDelete}
              variant="danger"
              fullWidth
              disabled={saving}
            >
              Delete
            </Button>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 16,
    paddingHorizontal: sharedSpacing.md,
    paddingVertical: sharedSpacing.sm + sharedSpacing.xs,
    marginTop: sharedSpacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewContainer: {
    alignItems: 'flex-start',
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sharedSpacing.sm + sharedSpacing.xs,
    paddingVertical: sharedSpacing.xs + sharedSpacing.xxs,
  },
});
