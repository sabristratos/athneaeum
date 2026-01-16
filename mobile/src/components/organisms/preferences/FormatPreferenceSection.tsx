import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SelectableChip } from '@/components/molecules/PreferenceChip';
import { Text, Icon } from '@/components/atoms';
import { BookOpen02Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { FORMAT_OPTIONS, type BookFormat } from '@/database/hooks/useFormatPreferences';

export interface FormatPreferenceSectionProps {
  selectedFormats: BookFormat[];
  onToggleFormat: (format: BookFormat) => void;
  error?: string | null;
  showHeader?: boolean;
  showDescription?: boolean;
}

export function FormatPreferenceSection({
  selectedFormats,
  onToggleFormat,
  error,
  showHeader = true,
  showDescription = true,
}: FormatPreferenceSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {showHeader && (
        <View style={styles.header}>
          <Icon icon={BookOpen02Icon} size={20} color={theme.colors.primary} />
          <Text
            variant="h3"
            style={{ marginLeft: sharedSpacing.sm, color: theme.colors.foreground }}
          >
            Reading Formats
          </Text>
        </View>
      )}

      {showDescription && (
        <Text
          variant="caption"
          style={{ color: theme.colors.foregroundMuted, marginBottom: sharedSpacing.md }}
        >
          Select all formats you read
        </Text>
      )}

      <View style={styles.chipsContainer}>
        {FORMAT_OPTIONS.map(({ key, label }) => (
          <SelectableChip
            key={key}
            label={label}
            selected={selectedFormats.includes(key)}
            onPress={() => onToggleFormat(key)}
            size="md"
          />
        ))}
      </View>

      {error && (
        <Text
          variant="caption"
          style={{ color: theme.colors.danger, marginTop: sharedSpacing.sm }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sharedSpacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sharedSpacing.sm + sharedSpacing.xs,
  },
});
