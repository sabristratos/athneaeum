import React, { useState, useCallback } from 'react';
import { View, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon } from '@/components/atoms';
import { Input } from '@/components/molecules';
import { useTheme } from '@/themes';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  loading?: boolean;
}

export function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  loading = false,
}: DeleteAccountModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  const handleConfirm = useCallback(async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setError(undefined);
    try {
      await onConfirm(password);
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete account');
    }
  }, [password, onConfirm]);

  const handleClose = useCallback(() => {
    setPassword('');
    setError(undefined);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback>
        <View style={[styles.overlay, { padding: theme.spacing.lg, backgroundColor: theme.colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: isScholar ? theme.radii.xl : theme.radii['2xl'],
                  padding: theme.spacing.xl,
                },
                !isScholar && [styles.dreamerShadow, { shadowColor: theme.colors.shadow }],
                isScholar && {
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.border,
                },
              ]}
              accessible={true}
              accessibilityViewIsModal={true}
              accessibilityRole="alert"
              accessibilityLabel="Delete account confirmation"
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${theme.colors.danger}20`,
                    marginBottom: theme.spacing.lg,
                  },
                ]}
              >
                <Icon
                  icon={Delete02Icon}
                  size={32}
                  color={theme.colors.danger}
                />
              </View>

              <Text
                variant="h2"
                style={[
                  styles.title,
                  {
                    marginBottom: theme.spacing.sm,
                    color: theme.colors.foreground,
                  },
                ]}
              >
                Delete Account?
              </Text>

              <Text
                variant="body"
                style={[
                  styles.message,
                  {
                    color: theme.colors.foregroundMuted,
                    marginBottom: theme.spacing.lg,
                  },
                ]}
              >
                This will permanently delete your account, library, reading history, and all associated data. This action cannot be undone.
              </Text>

              <View style={{ width: '100%', marginBottom: theme.spacing.lg }}>
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.foregroundMuted,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  Enter your password to confirm
                </Text>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  secureTextEntry
                  error={error}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View
                style={[
                  styles.buttonContainer,
                  styles.buttonRow,
                  { gap: theme.spacing.sm },
                ]}
              >
                <View style={styles.buttonFlex}>
                  <Button
                    variant="secondary"
                    onPress={handleClose}
                    fullWidth
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </View>
                <View style={styles.buttonFlex}>
                  <Button
                    variant="danger"
                    onPress={handleConfirm}
                    fullWidth
                    loading={loading}
                  >
                    Delete Everything
                  </Button>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  dreamerShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonFlex: {
    flex: 1,
  },
});
