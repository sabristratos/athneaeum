import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';

interface PageRangeInputProps {
  startPage: string;
  endPage: string;
  onStartPageChange: (value: string) => void;
  onEndPageChange: (value: string) => void;
  label?: string;
  error?: string | null;
}

export function PageRangeInput({
  startPage,
  endPage,
  onStartPageChange,
  onEndPageChange,
  label,
  error,
}: PageRangeInputProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const inputStyle = {
    backgroundColor: theme.colors.surface,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
    padding: theme.spacing.md,
    fontFamily: theme.fonts.body,
    fontSize: 18,
    color: theme.colors.foreground,
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
          {label}
        </Text>
      )}
      <View style={styles.row}>
        <View style={styles.inputContainer}>
          <TextInput
            value={startPage}
            onChangeText={onStartPageChange}
            placeholder="Start"
            placeholderTextColor={theme.colors.foregroundMuted}
            keyboardType="number-pad"
            style={[styles.input, inputStyle]}
          />
          <Text
            variant="caption"
            muted
            style={{ marginTop: theme.spacing.xs, textAlign: 'center' }}
          >
            Start page
          </Text>
        </View>

        <Text variant="h3" style={styles.separator}>
          —
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={endPage}
            onChangeText={onEndPageChange}
            placeholder="End"
            placeholderTextColor={theme.colors.foregroundMuted}
            keyboardType="number-pad"
            style={[styles.input, inputStyle]}
          />
          <Text
            variant="caption"
            muted
            style={{ marginTop: theme.spacing.xs, textAlign: 'center' }}
          >
            End page
          </Text>
        </View>
      </View>
      {error && (
        <Text
          variant="caption"
          style={{ color: theme.colors.danger, textAlign: 'center' }}
        >
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  input: {
    textAlign: 'center',
  },
  separator: {
    marginBottom: 24,
  },
});
