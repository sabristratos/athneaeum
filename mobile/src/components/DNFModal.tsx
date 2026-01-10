import React from 'react';
import { TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '@/components/Text';
import { BottomSheet } from '@/components/BottomSheet';
import { useTheme } from '@/themes';
import { DNF_REASONS } from '@/types/book';

interface DNFModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function DNFModal({ visible, onClose, onConfirm }: DNFModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handleReasonSelect = (reason: string) => {
    onConfirm(reason);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Abandon Book?"
      showCloseButton
    >
      {/* Supportive message */}
      <Text
        variant="body"
        style={{
          color: theme.colors.foregroundMuted,
          marginBottom: theme.spacing.lg,
        }}
      >
        It's okay to stop. Categorizing why helps your reading journey.
      </Text>

      {/* Reason buttons */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {DNF_REASONS.map((reason) => (
          <TouchableOpacity
            key={reason.value}
            onPress={() => handleReasonSelect(reason.value)}
            activeOpacity={0.7}
            style={{
              padding: theme.spacing.md,
              borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
              backgroundColor: theme.colors.canvas,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
            }}
          >
            <Text
              variant="body"
              style={{
                fontWeight: '500',
                color: theme.colors.foreground,
              }}
            >
              {reason.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Cancel button */}
      <TouchableOpacity
        onPress={onClose}
        activeOpacity={0.7}
        style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          alignItems: 'center',
        }}
      >
        <Text
          variant="body"
          style={{
            color: theme.colors.foregroundMuted,
            fontWeight: '500',
          }}
        >
          Keep Reading
        </Text>
      </TouchableOpacity>
    </BottomSheet>
  );
}
