import React from 'react';
import { View, Modal, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { CloudUploadIcon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon } from '@/components/atoms';
import { Checkbox } from '@/components/molecules';
import { useTheme } from '@/themes';
import type { ImportOptions } from '@/api/auth';

interface ImportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: ImportOptions) => void;
  fileName: string;
  options: ImportOptions;
  onOptionsChange: (options: ImportOptions) => void;
}

export function ImportOptionsModal({
  visible,
  onClose,
  onConfirm,
  fileName,
  options,
  onOptionsChange,
}: ImportOptionsModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handleOptionToggle = (key: keyof ImportOptions) => {
    onOptionsChange({
      ...options,
      [key]: !options[key],
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
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
                    backgroundColor: `${theme.colors.primary}20`,
                    marginBottom: theme.spacing.lg,
                  },
                ]}
              >
                <Icon
                  icon={CloudUploadIcon}
                  size={32}
                  color={theme.colors.primary}
                />
              </View>

              <Text
                variant="h2"
                style={[
                  styles.title,
                  {
                    marginBottom: theme.spacing.xs,
                    color: theme.colors.foreground,
                  },
                ]}
              >
                Import Options
              </Text>

              <Text
                variant="caption"
                style={[
                  styles.fileName,
                  {
                    color: theme.colors.foregroundMuted,
                    marginBottom: theme.spacing.xl,
                  },
                ]}
                numberOfLines={1}
              >
                {fileName}
              </Text>

              <View style={[styles.optionsContainer, { gap: theme.spacing.lg }]}>
                <View style={{ gap: theme.spacing.xs }}>
                  <Checkbox
                    checked={options.enrichment_enabled}
                    onChange={() => handleOptionToggle('enrichment_enabled')}
                    label="Enrich with Google Books"
                    size="md"
                  />
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.foregroundMuted, marginLeft: 30 }}
                  >
                    Add covers and descriptions automatically
                  </Text>
                </View>

                <View style={{ gap: theme.spacing.xs }}>
                  <Checkbox
                    checked={options.import_tags}
                    onChange={() => handleOptionToggle('import_tags')}
                    label="Import shelves as tags"
                    size="md"
                  />
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.foregroundMuted, marginLeft: 30 }}
                  >
                    Create tags from your Goodreads shelves
                  </Text>
                </View>

                <View style={{ gap: theme.spacing.xs }}>
                  <Checkbox
                    checked={options.import_reviews}
                    onChange={() => handleOptionToggle('import_reviews')}
                    label="Import reviews"
                    size="md"
                  />
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.foregroundMuted, marginLeft: 30 }}
                  >
                    Save your book reviews and notes
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.buttonContainer,
                  { gap: theme.spacing.sm, marginTop: theme.spacing.xl },
                ]}
              >
                <View style={styles.buttonFlex}>
                  <Button
                    variant="secondary"
                    onPress={onClose}
                    fullWidth
                  >
                    Cancel
                  </Button>
                </View>
                <View style={styles.buttonFlex}>
                  <Button
                    variant="primary"
                    onPress={() => onConfirm(options)}
                    fullWidth
                  >
                    Start Import
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
    maxWidth: 360,
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
  fileName: {
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  buttonContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  buttonFlex: {
    flex: 1,
  },
});
