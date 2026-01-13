import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/themes';

interface VolumeMetricProps {
  label: string;
  value: string | number;
  comparison?: string;
  accent?: boolean;
}

export const VolumeMetric = memo(function VolumeMetric({
  label,
  value,
  comparison,
  accent = false,
}: VolumeMetricProps) {
  const { theme } = useTheme();

  const accessibilityLabel = `${label}: ${value}${comparison ? `. ${comparison}` : ''}`;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: accent ? theme.colors.primary : theme.colors.surface,
          borderRadius: theme.radii.md,
          padding: theme.spacing.md,
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      <Text
        variant="caption"
        style={[
          styles.label,
          { color: accent ? theme.colors.onPrimary : theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>
      <Text
        variant="h2"
        style={[
          styles.value,
          { color: accent ? theme.colors.onPrimary : theme.colors.foreground },
        ]}
      >
        {value}
      </Text>
      {comparison && (
        <Text
          variant="caption"
          style={[
            styles.comparison,
            { color: accent ? theme.colors.onPrimary : theme.colors.foregroundMuted },
          ]}
        >
          {comparison}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  comparison: {
    marginTop: 4,
    fontSize: 10,
    textAlign: 'center',
  },
});
