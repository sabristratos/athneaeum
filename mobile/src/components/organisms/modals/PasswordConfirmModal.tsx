import React, { useState, useCallback, useEffect } from 'react';
import { View, Modal } from 'react-native';
import { Text, Button, Input } from '@/components';
import { useTheme } from '@/themes';

interface PasswordConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string;
  requireConfirmWord?: string;
}

export function PasswordConfirmModal({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  loading = false,
  error,
  requireConfirmWord,
}: PasswordConfirmModalProps) {
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmWord, setConfirmWord] = useState('');

  const isConfirmWordValid = !requireConfirmWord ||
    confirmWord.toUpperCase() === requireConfirmWord.toUpperCase();

  useEffect(() => {
    if (visible) {
      setPassword('');
      setConfirmWord('');
    }
  }, [visible]);

  const handleConfirm = useCallback(() => {
    if (password.trim() && isConfirmWordValid) {
      onConfirm(password);
    }
  }, [password, isConfirmWordValid, onConfirm]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: theme.spacing.lg,
        }}
      >
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.lg,
            padding: theme.spacing.lg,
            width: '100%',
            maxWidth: 400,
          }}
        >
          <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
            {title}
          </Text>

          <Text variant="body" muted style={{ marginBottom: theme.spacing.lg }}>
            {message}
          </Text>

          {requireConfirmWord && (
            <View style={{ marginBottom: theme.spacing.md }}>
              <Text
                variant="caption"
                style={{
                  color: theme.colors.danger,
                  marginBottom: theme.spacing.xs,
                }}
              >
                Type "{requireConfirmWord.toUpperCase()}" to confirm
              </Text>
              <Input
                value={confirmWord}
                onChangeText={setConfirmWord}
                placeholder={requireConfirmWord.toUpperCase()}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          )}

          <View style={{ marginBottom: theme.spacing.lg }}>
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
              editable={!loading}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                size="md"
                onPress={onClose}
                disabled={loading}
                fullWidth
              >
                Cancel
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="danger"
                size="md"
                onPress={handleConfirm}
                loading={loading}
                disabled={!password.trim() || !isConfirmWordValid || loading}
                fullWidth
              >
                {confirmLabel}
              </Button>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
