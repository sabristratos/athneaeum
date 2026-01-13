import React from 'react';
import { View, Modal, Pressable, StyleSheet } from 'react-native';
import { Cancel01Icon, Delete02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, IconButton } from '@/components';
import { useTheme } from '@/themes';
import { TIER_DEFINITIONS, TIER_COLORS, type TierListBook, type TierName } from '@/types/tierList';

interface TierActionModalProps {
  visible: boolean;
  book: TierListBook | null;
  currentTier: TierName | null;
  onClose: () => void;
  onMoveTo: (toTier: TierName) => void;
  onRemove: () => void;
}

export function TierActionModal({
  visible,
  book,
  currentTier,
  onClose,
  onMoveTo,
  onRemove,
}: TierActionModalProps) {
  const { theme, themeName } = useTheme();

  if (!book || !currentTier) return null;

  const otherTiers = TIER_DEFINITIONS.filter((t) => t.id !== currentTier);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.content,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.lg,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text variant="label" numberOfLines={1}>
                {book.title}
              </Text>
              <Text variant="caption" muted numberOfLines={1}>
                {book.author}
              </Text>
            </View>
            <IconButton
              icon={Cancel01Icon}
              variant="ghost"
              size="sm"
              onPress={onClose}
              accessibilityLabel="Close"
            />
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.border },
            ]}
          />

          <Text
            variant="caption"
            muted
            style={{ marginBottom: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            Move to tier
          </Text>

          <View style={styles.tierOptions}>
            {otherTiers.map((tier) => {
              const tierColor = TIER_COLORS[tier.id][themeName];
              return (
                <Pressable
                  key={tier.id}
                  onPress={() => onMoveTo(tier.id)}
                  style={[
                    styles.tierOption,
                    {
                      backgroundColor: tierColor,
                      borderRadius: theme.radii.sm,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: '#ffffff', fontWeight: '600' }}
                  >
                    {tier.label}
                  </Text>
                  <Icon icon={ArrowRight01Icon} size={14} color="#ffffff" />
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: theme.colors.border, marginTop: theme.spacing.md },
            ]}
          />

          <Pressable
            onPress={onRemove}
            style={[
              styles.removeButton,
              {
                backgroundColor: theme.colors.dangerSubtle,
                borderRadius: theme.radii.sm,
                marginTop: theme.spacing.md,
              },
            ]}
          >
            <Icon icon={Delete02Icon} size={16} color={theme.colors.danger} />
            <Text
              variant="body"
              style={{ color: theme.colors.danger, marginLeft: theme.spacing.sm }}
            >
              Remove from tier list
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    marginTop: 12,
  },
  tierOptions: {
    gap: 8,
  },
  tierOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});
