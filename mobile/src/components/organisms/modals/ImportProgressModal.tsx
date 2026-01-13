import React from 'react';
import { View, Modal, TouchableWithoutFeedback, StyleSheet, ActivityIndicator } from 'react-native';
import {
  CheckmarkCircle02Icon,
  Cancel01Icon,
  CloudUploadIcon,
  File02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { Text, Button, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { ImportResult } from '@/api/auth';

export type ImportStatus = 'idle' | 'selecting' | 'uploading' | 'complete' | 'error';

interface ImportProgressModalProps {
  visible: boolean;
  onClose: () => void;
  status: ImportStatus;
  result?: ImportResult;
  errorMessage?: string;
  selectedFileName?: string;
}

export function ImportProgressModal({
  visible,
  onClose,
  status,
  result,
  errorMessage,
  selectedFileName,
}: ImportProgressModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const getStatusIcon = () => {
    switch (status) {
      case 'idle':
      case 'selecting':
        return File02Icon;
      case 'uploading':
        return CloudUploadIcon;
      case 'complete':
        return result && result.errors > 0 ? AlertCircleIcon : CheckmarkCircle02Icon;
      case 'error':
        return Cancel01Icon;
      default:
        return File02Icon;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'complete':
        return result && result.errors > 0 ? theme.colors.warning : theme.colors.success;
      case 'error':
        return theme.colors.danger;
      default:
        return theme.colors.primary;
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'idle':
      case 'selecting':
        return 'Select File';
      case 'uploading':
        return 'Importing...';
      case 'complete':
        return 'Import Complete';
      case 'error':
        return 'Import Failed';
      default:
        return 'Import';
    }
  };

  const getMessage = () => {
    switch (status) {
      case 'idle':
      case 'selecting':
        return 'Select your Goodreads export CSV file';
      case 'uploading':
        return selectedFileName
          ? `Uploading ${selectedFileName}...`
          : 'Processing your library...';
      case 'complete':
        if (result) {
          const parts = [];
          if (result.imported > 0) {
            parts.push(`${result.imported} book${result.imported !== 1 ? 's' : ''} imported`);
          }
          if (result.skipped > 0) {
            parts.push(`${result.skipped} skipped (already in library)`);
          }
          if (result.errors > 0) {
            parts.push(`${result.errors} error${result.errors !== 1 ? 's' : ''}`);
          }
          return parts.join('\n') || 'No changes made';
        }
        return 'Import finished';
      case 'error':
        return errorMessage || 'Something went wrong. Please try again.';
      default:
        return '';
    }
  };

  const StatusIcon = getStatusIcon();
  const statusColor = getStatusColor();
  const showSpinner = status === 'uploading';

  const canClose = status === 'complete' || status === 'error' || status === 'idle';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={canClose ? onClose : undefined}
    >
      <TouchableWithoutFeedback onPress={canClose ? onClose : undefined}>
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
            >
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${statusColor}20`,
                    marginBottom: theme.spacing.lg,
                  },
                ]}
              >
                {showSpinner ? (
                  <ActivityIndicator size="large" color={statusColor} />
                ) : (
                  <Icon
                    icon={StatusIcon}
                    size={32}
                    color={statusColor}
                  />
                )}
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
                {getTitle()}
              </Text>

              <Text
                variant="body"
                style={[
                  styles.message,
                  {
                    color: theme.colors.foregroundMuted,
                    marginBottom: theme.spacing.xl,
                  },
                ]}
              >
                {getMessage()}
              </Text>

              {status === 'complete' && result && result.error_messages.length > 0 && (
                <View
                  style={[
                    styles.errorList,
                    {
                      backgroundColor: `${theme.colors.danger}10`,
                      borderRadius: theme.radii.md,
                      padding: theme.spacing.md,
                      marginBottom: theme.spacing.lg,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.danger, marginBottom: theme.spacing.xs }}
                  >
                    Errors:
                  </Text>
                  {result.error_messages.slice(0, 5).map((msg, i) => (
                    <Text
                      key={i}
                      variant="caption"
                      style={{ color: theme.colors.foregroundMuted }}
                      numberOfLines={2}
                    >
                      • {msg}
                    </Text>
                  ))}
                  {result.error_messages.length > 5 && (
                    <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                      ...and {result.error_messages.length - 5} more
                    </Text>
                  )}
                </View>
              )}

              {canClose && (
                <View style={styles.buttonContainer}>
                  <Button
                    variant="primary"
                    onPress={onClose}
                    fullWidth
                  >
                    {status === 'complete' ? 'Done' : status === 'error' ? 'Close' : 'Cancel'}
                  </Button>
                </View>
              )}
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
  errorList: {
    width: '100%',
  },
});
