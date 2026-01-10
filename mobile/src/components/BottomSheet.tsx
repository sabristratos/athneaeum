import React from 'react';
import {
  View,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Text } from '@/components/Text';
import { IconButton } from '@/components/IconButton';
import { useTheme } from '@/themes';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  showHandle?: boolean;
  showCloseButton?: boolean;
  children: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  showHandle = true,
  showCloseButton = false,
  children,
  contentStyle,
}: BottomSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const insets = useSafeAreaInsets();

  const hasHeader = title || showCloseButton;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopLeftRadius: isScholar ? theme.radii.xl : theme.radii['2xl'],
                  borderTopRightRadius: isScholar ? theme.radii.xl : theme.radii['2xl'],
                  paddingBottom: insets.bottom + theme.spacing.lg,
                },
                isScholar && {
                  borderWidth: theme.borders.thin,
                  borderBottomWidth: 0,
                  borderColor: theme.colors.border,
                },
                !isScholar && [styles.dreamerShadow, { shadowColor: theme.colors.shadow }],
              ]}
            >
              {showHandle && (
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              )}

              {hasHeader && (
                <View
                  style={[
                    styles.header,
                    {
                      paddingHorizontal: theme.spacing.lg,
                      marginBottom: theme.spacing.md,
                    },
                  ]}
                >
                  {title ? (
                    <Text
                      variant="h2"
                      style={{ color: theme.colors.foreground, flex: 1 }}
                    >
                      {title}
                    </Text>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  {showCloseButton && (
                    <IconButton
                      icon={Cancel01Icon}
                      onPress={onClose}
                      variant="ghost"
                      size="sm"
                    />
                  )}
                </View>
              )}

              <View
                style={[
                  { paddingHorizontal: theme.spacing.lg },
                  contentStyle,
                ]}
              >
                {children}
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
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: '80%',
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
});
