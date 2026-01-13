import React from 'react';
import { View, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import {
  InformationCircleIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  Cancel01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { Text, Button, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';

export type ModalStatus = 'info' | 'success' | 'warning' | 'error' | 'danger';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  status?: ModalStatus;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmDestructive?: boolean;
}

const STATUS_CONFIG = {
  info: {
    icon: InformationCircleIcon,
    colorKey: 'primary' as const,
  },
  success: {
    icon: CheckmarkCircle02Icon,
    colorKey: 'success' as const,
  },
  warning: {
    icon: Alert02Icon,
    colorKey: 'warning' as const,
  },
  error: {
    icon: Cancel01Icon,
    colorKey: 'danger' as const,
  },
  danger: {
    icon: Delete02Icon,
    colorKey: 'danger' as const,
  },
};

export function ConfirmModal({
  visible,
  onClose,
  title,
  message,
  status = 'info',
  confirmLabel = 'OK',
  cancelLabel,
  onConfirm,
  onCancel,
  confirmDestructive = false,
}: ConfirmModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  const getStatusColor = () => {
    switch (config.colorKey) {
      case 'primary':
        return theme.colors.primary;
      case 'success':
        return theme.colors.success;
      case 'danger':
        return theme.colors.danger;
      case 'warning':
        return theme.colors.warning;
      default:
        return theme.colors.primary;
    }
  };

  const getStatusBgColor = () => {
    const color = getStatusColor();
    // Create a semi-transparent background for the icon circle
    return `${color}20`; // 20 = 12% opacity in hex
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleBackdropPress = () => {
    // Don't dismiss on backdrop press for danger modals
    if (status !== 'danger') {
      onClose();
    }
  };

  const hasTwoButtons = !!cancelLabel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
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
              accessibilityLabel={`${title}${message ? `. ${message}` : ''}`}
            >
              {/* Status Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: getStatusBgColor(),
                    marginBottom: theme.spacing.lg,
                  },
                ]}
              >
                <Icon
                  icon={StatusIcon}
                  size={32}
                  color={getStatusColor()}
                />
              </View>

              {/* Title */}
              <Text
                variant="h2"
                style={[
                  styles.title,
                  {
                    marginBottom: message ? theme.spacing.sm : theme.spacing.lg,
                    color: theme.colors.foreground,
                  },
                ]}
              >
                {title}
              </Text>

              {/* Message */}
              {message && (
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
                  {message}
                </Text>
              )}

              {/* Buttons */}
              <View
                style={[
                  styles.buttonContainer,
                  hasTwoButtons && styles.buttonRow,
                  { gap: theme.spacing.sm },
                ]}
              >
                {cancelLabel && (
                  <View style={hasTwoButtons ? styles.buttonFlex : undefined}>
                    <Button
                      variant="secondary"
                      onPress={handleCancel}
                      fullWidth
                    >
                      {cancelLabel}
                    </Button>
                  </View>
                )}
                <View style={hasTwoButtons ? styles.buttonFlex : undefined}>
                  <Button
                    variant={confirmDestructive ? 'danger' : 'primary'}
                    onPress={handleConfirm}
                    fullWidth
                  >
                    {confirmLabel}
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
