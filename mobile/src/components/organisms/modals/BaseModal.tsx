import React from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Text, IconButton } from '@/components/atoms';
import { useTheme } from '@/themes';

type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface BaseModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  showCloseButton?: boolean;
  dismissOnBackdrop?: boolean;
  size?: ModalSize;
  scrollable?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  testID?: string;
}

const SIZE_MAP: Record<ModalSize, number | '100%'> = {
  sm: 300,
  md: 340,
  lg: 400,
  full: '100%',
};

export function BaseModal({
  visible,
  onClose,
  title,
  subtitle,
  showCloseButton = true,
  dismissOnBackdrop = true,
  size = 'md',
  scrollable = false,
  children,
  footer,
  contentStyle,
  testID,
}: BaseModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const insets = useSafeAreaInsets();

  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  const maxWidth = SIZE_MAP[size];
  const isFullWidth = size === 'full';

  const containerStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: isFullWidth
      ? 0
      : isScholar
        ? theme.radii.xl
        : theme.radii['2xl'],
    padding: theme.spacing.xl,
    width: isFullWidth ? '100%' : undefined,
    maxWidth: isFullWidth ? undefined : maxWidth,
    maxHeight: isFullWidth ? '100%' : '85%',
    ...(isScholar
      ? {
          borderWidth: isFullWidth ? 0 : theme.borders.thin,
          borderColor: theme.colors.border,
        }
      : {}),
  };

  const shadowStyle = !isScholar && !isFullWidth ? styles.dreamerShadow : undefined;

  const hasHeader = title || showCloseButton;

  const content = (
    <>
      {hasHeader && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && (
              <Text
                variant="h2"
                style={{ color: theme.colors.foreground }}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text
                variant="body"
                style={{
                  color: theme.colors.foregroundMuted,
                  marginTop: theme.spacing.xs,
                }}
              >
                {subtitle}
              </Text>
            )}
          </View>
          {showCloseButton && (
            <IconButton
              icon={Cancel01Icon}
              onPress={onClose}
              variant="ghost"
              size="sm"
              accessibilityLabel="Close modal"
            />
          )}
        </View>
      )}

      {scrollable ? (
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={contentStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}

      {footer && (
        <View style={[styles.footer, { marginTop: theme.spacing.lg }]}>
          {footer}
        </View>
      )}
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: theme.colors.overlay,
              padding: isFullWidth ? 0 : theme.spacing.lg,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <TouchableWithoutFeedback>
              <View
                style={[
                  containerStyle,
                  shadowStyle,
                  shadowStyle && { shadowColor: theme.colors.shadow },
                ]}
                accessible={true}
                accessibilityViewIsModal={true}
                accessibilityRole="alert"
                accessibilityLabel={title ? `${title} dialog` : 'Dialog'}
              >
                {content}
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
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
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  dreamerShadow: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    marginRight: 8,
  },
  content: {
    flexShrink: 1,
  },
  scrollContent: {
    flexShrink: 1,
  },
  footer: {
    flexShrink: 0,
  },
});
