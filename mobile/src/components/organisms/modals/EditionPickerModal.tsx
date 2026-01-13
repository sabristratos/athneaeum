import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Book01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon, Pressable } from '@/components/atoms';
import { ChipGroup } from '@/components/molecules';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import { coverSizes } from '@/themes/shared';
import type { SearchResult, BookStatus } from '@/types';

interface EditionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (edition: SearchResult, status: BookStatus) => void;
  editions: SearchResult[];
  loading: boolean;
  error: string | null;
  bookTitle: string;
  initialStatus: BookStatus;
}

const STATUS_CHIPS = [
  { key: 'want_to_read', label: 'Want to Read' },
  { key: 'reading', label: 'Reading' },
];

export function EditionPickerModal({
  visible,
  onClose,
  onSelect,
  editions,
  loading,
  error,
  bookTitle,
  initialStatus,
}: EditionPickerModalProps) {
  const { theme } = useTheme();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<BookStatus>(initialStatus);

  useEffect(() => {
    if (visible) {
      setStatus(initialStatus);
      setSelectedId(null);
    }
  }, [visible, initialStatus]);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    onClose();
  }, [onClose]);

  const handleAdd = useCallback(() => {
    const selected = editions.find((e) => e.external_id === selectedId);
    if (selected) {
      onSelect(selected, status);
      handleClose();
    }
  }, [editions, selectedId, status, onSelect, handleClose]);

  const renderEdition = (item: SearchResult) => {
    const isSelected = selectedId === item.external_id;
    const publishYear = item.published_date
      ? new Date(item.published_date).getFullYear()
      : null;

    return (
      <Pressable
        key={item.external_id}
        onPress={() => setSelectedId(item.external_id)}
        style={[
          styles.editionCard,
          {
            backgroundColor: isSelected
              ? `${theme.colors.primary}15`
              : theme.colors.surfaceAlt,
            borderRadius: theme.radii.md,
            borderWidth: theme.borders.thin,
            borderColor: isSelected
              ? theme.colors.primary
              : theme.colors.border,
            padding: theme.spacing.sm,
            marginBottom: theme.spacing.sm,
          },
        ]}
      >
        <View style={styles.editionRow}>
          {item.cover_url ? (
            <Image
              source={{ uri: item.cover_url }}
              style={{
                width: coverSizes.sm.width,
                height: coverSizes.sm.height,
                borderRadius: theme.radii.xs,
                backgroundColor: theme.colors.surfaceAlt,
              }}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={{
                width: coverSizes.sm.width,
                height: coverSizes.sm.height,
                borderRadius: theme.radii.xs,
                backgroundColor: theme.colors.muted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon={Book01Icon} size={16} color={theme.colors.foregroundMuted} />
            </View>
          )}

          <View style={styles.editionInfo}>
            <Text variant="body" numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.metaRow, { gap: theme.spacing.sm, marginTop: 2 }]}>
              {item.page_count != null && item.page_count > 0 && (
                <Text variant="caption" muted>
                  {item.page_count} pages
                </Text>
              )}
              {publishYear && (
                <Text variant="caption" muted>
                  {publishYear}
                </Text>
              )}
            </View>
            {item.isbn && (
              <Text variant="caption" muted style={{ marginTop: 2 }}>
                ISBN: {item.isbn}
              </Text>
            )}
          </View>

          {isSelected && (
            <View
              style={[
                styles.checkmark,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Icon icon={Tick01Icon} size={14} color="#fff" />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={[styles.centerContent, { padding: theme.spacing.xl }]}>
          <Text variant="body" muted>
            Loading editions...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centerContent, { padding: theme.spacing.xl }]}>
          <Text variant="body" color="danger">
            {error}
          </Text>
        </View>
      );
    }

    if (editions.length === 0) {
      return (
        <View style={[styles.centerContent, { padding: theme.spacing.xl }]}>
          <Text variant="body" muted>
            No editions found
          </Text>
        </View>
      );
    }

    return (
      <View style={{ gap: theme.spacing.md }}>
        {editions.map(renderEdition)}

        <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
          <Text variant="label" color="muted">
            Add to shelf
          </Text>
          <ChipGroup
            items={STATUS_CHIPS}
            selected={status}
            onSelect={(key) => setStatus(key as BookStatus)}
          />
        </View>
      </View>
    );
  };

  const footer = (
    <View style={[styles.footer, { gap: theme.spacing.sm }]}>
      <Button
        variant="secondary"
        onPress={handleClose}
        fullWidth
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onPress={handleAdd}
        disabled={!selectedId || loading}
        fullWidth
      >
        Add to Library
      </Button>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Select Edition"
      subtitle={bookTitle}
      headerIcon={Book01Icon}
      showCloseButton
      showHeaderBorder
      scrollable
      maxHeight="90%"
      footer={footer}
    >
      {renderContent()}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  editionCard: {
    overflow: 'hidden',
  },
  editionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editionInfo: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
  },
});
