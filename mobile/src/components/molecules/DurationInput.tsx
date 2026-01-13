import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';

interface DurationInputProps {
  hours: string;
  minutes: string;
  onHoursChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  label?: string;
}

export function DurationInput({
  hours,
  minutes,
  onHoursChange,
  onMinutesChange,
  label,
}: DurationInputProps) {
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
            value={hours}
            onChangeText={onHoursChange}
            placeholder="0"
            placeholderTextColor={theme.colors.foregroundMuted}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.input, inputStyle]}
          />
          <Text
            variant="caption"
            muted
            style={{ marginTop: theme.spacing.xs }}
          >
            hours
          </Text>
        </View>

        <Text variant="h3" style={styles.separator}>
          :
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            value={minutes}
            onChangeText={onMinutesChange}
            placeholder="0"
            placeholderTextColor={theme.colors.foregroundMuted}
            keyboardType="number-pad"
            maxLength={2}
            style={[styles.input, inputStyle]}
          />
          <Text
            variant="caption"
            muted
            style={{ marginTop: theme.spacing.xs }}
          >
            minutes
          </Text>
        </View>
      </View>
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
    alignItems: 'center',
  },
  input: {
    width: 60,
    textAlign: 'center',
  },
  separator: {
    marginBottom: 24,
  },
});
