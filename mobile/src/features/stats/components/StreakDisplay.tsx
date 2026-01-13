import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { useTheme } from '@/themes';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
}

export const StreakDisplay = memo(function StreakDisplay({
  currentStreak,
  longestStreak,
}: StreakDisplayProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.container, { gap: theme.spacing.md }]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Current streak: ${currentStreak} days. Longest streak: ${longestStreak} days`}
    >
      <View style={styles.streakColumn} importantForAccessibility="no-hide-descendants">
        <Text
          variant="h2"
          style={[styles.streakNumber, { color: theme.colors.primary }]}
        >
          {currentStreak}
        </Text>
        <Text variant="body" muted>
          Current Streak
        </Text>
        <Text variant="caption" muted>
          days
        </Text>
      </View>
      <View
        style={[styles.divider, { backgroundColor: theme.colors.border }]}
      />
      <View style={styles.streakColumn} importantForAccessibility="no-hide-descendants">
        <Text
          variant="h2"
          style={[styles.streakNumber, { color: theme.colors.foregroundMuted }]}
        >
          {longestStreak}
        </Text>
        <Text variant="body" muted>
          Longest Streak
        </Text>
        <Text variant="caption" muted>
          days
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakColumn: {
    flex: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
  },
  divider: {
    width: 1,
    height: '80%',
  },
});
