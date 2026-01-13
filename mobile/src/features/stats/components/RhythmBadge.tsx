import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/themes';

interface RhythmBadgeProps {
  rhythm: string;
  label: string;
}

export const RhythmBadge = memo(function RhythmBadge({
  rhythm,
  label,
}: RhythmBadgeProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primarySubtle,
          borderRadius: theme.radii.lg,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        },
      ]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Your reading rhythm: ${label}`}
    >
      <Text variant="caption" muted>
        Your Rhythm
      </Text>
      <Text
        variant="body"
        style={[styles.label, { color: theme.colors.primary }]}
      >
        {label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    fontWeight: '600',
  },
});
