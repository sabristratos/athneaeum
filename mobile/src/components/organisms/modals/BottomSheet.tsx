import React from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Text, IconButton, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  headerIcon?: IconSvgElement;
  showHandle?: boolean;
  showCloseButton?: boolean;
  showHeaderBorder?: boolean;
  scrollable?: boolean;
  maxHeight?: '50%' | '70%' | '80%' | '90%';
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentStyle?: ViewStyle;
  dismissOnBackdrop?: boolean;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  subtitle,
  headerIcon,
  showHandle = true,
  showCloseButton = false,
  showHeaderBorder = false,
  scrollable = false,
  maxHeight = '80%',
  children,
  footer,
  contentStyle,
  dismissOnBackdrop = true,
  testID,
}: BottomSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const insets = useSafeAreaInsets();

  const hasHeader = title || subtitle || headerIcon || showCloseButton;

  const handleBackdropPress = () => {
    if (dismissOnBackdrop) {
      onClose();
    }
  };

  const renderHeader = () => {
    if (!hasHeader) return null;

    return (
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: theme.spacing.md,
          },
          showHeaderBorder && {
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
            marginBottom: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.headerContent}>
          {headerIcon && (
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: `${theme.colors.primary}20` },
              ]}
            >
              <Icon icon={headerIcon} size={20} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.headerText}>
            {title && (
              <Text
                variant={headerIcon ? 'h3' : 'h2'}
                style={{ color: theme.colors.foreground }}
                numberOfLines={1}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="caption" muted numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        {showCloseButton && (
          <IconButton
            icon={Cancel01Icon}
            onPress={onClose}
            variant="ghost"
            size="sm"
            accessibilityLabel="Close"
          />
        )}
      </View>
    );
  };

  const renderContent = () => {
    const contentWrapper = (
      <View
        style={[
          { paddingHorizontal: theme.spacing.lg },
          contentStyle,
        ]}
      >
        {children}
      </View>
    );

    if (scrollable) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {contentWrapper}
        </ScrollView>
      );
    }

    return contentWrapper;
  };

  const sheet = (
    <View
      style={[
        styles.container,
        {
          maxHeight,
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: isScholar ? theme.radii.xl : theme.radii['2xl'],
          borderTopRightRadius: isScholar ? theme.radii.xl : theme.radii['2xl'],
          paddingBottom: footer ? 0 : insets.bottom + theme.spacing.lg,
        },
        isScholar && {
          borderWidth: theme.borders.thin,
          borderBottomWidth: 0,
          borderColor: theme.colors.border,
        },
        !isScholar && [styles.dreamerShadow, { shadowColor: theme.colors.shadow }],
      ]}
      accessible={true}
      accessibilityViewIsModal={true}
      accessibilityRole="alert"
      accessibilityLabel={title ? `${title} sheet` : 'Bottom sheet'}
    >
      {showHandle && (
        <View
          style={[
            styles.handle,
            { backgroundColor: theme.colors.border },
          ]}
        />
      )}

      {renderHeader()}
      {renderContent()}

      {footer && (
        <View
          style={[
            styles.footer,
            {
              padding: theme.spacing.lg,
              paddingBottom: insets.bottom + theme.spacing.lg,
            },
          ]}
        >
          {footer}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
            <TouchableWithoutFeedback>{sheet}</TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    overflow: 'hidden',
  },
  dreamerShadow: {
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  footer: {
    flexShrink: 0,
  },
});
