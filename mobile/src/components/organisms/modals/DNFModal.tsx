import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Button } from '@/components/atoms';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import { DNF_REASONS } from '@/types/book';

interface DNFModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function DNFModal({ visible, onClose, onConfirm }: DNFModalProps) {
  const { theme } = useTheme();

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
      <Text
        variant="body"
        style={{
          color: theme.colors.foregroundMuted,
          marginBottom: theme.spacing.lg,
        }}
      >
        It's okay to stop. Categorizing why helps your reading journey.
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {DNF_REASONS.map((reason) => (
          <Button
            key={reason.value}
            variant="outline"
            fullWidth
            onPress={() => handleReasonSelect(reason.value)}
          >
            {reason.label}
          </Button>
        ))}
      </ScrollView>

      <View style={{ marginTop: theme.spacing.lg }}>
        <Button variant="ghost" fullWidth onPress={onClose}>
          Keep Reading
        </Button>
      </View>
    </BottomSheet>
  );
}
