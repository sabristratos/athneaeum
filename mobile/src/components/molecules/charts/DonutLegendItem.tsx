import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/themes';

interface DonutLegendItemProps {
  color: string;
  label: string;
  percentage: number;
  count?: number;
  isActive?: boolean;
  onPress?: () => void;
}

export const DonutLegendItem = memo(function DonutLegendItem({
  color,
  label,
  percentage,
  count,
  isActive = false,
  onPress,
}: DonutLegendItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: isActive ? theme.colors.surfaceAlt : 'transparent',
          borderRadius: theme.radii.sm,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            borderRadius: theme.radii.full,
          },
        ]}
      />
      <Text variant="body" style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="caption" muted>
        {percentage.toFixed(0)}%{count !== undefined ? ` (${count})` : ''}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    marginRight: 8,
  },
  label: {
    flex: 1,
    marginRight: 8,
  },
});
