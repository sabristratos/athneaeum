import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { Target02Icon, Book01Icon, Time04Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Text, Icon, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations';
import type { ReadingStats } from '@/types';

interface StatusStripProps {
  stats: ReadingStats | null;
  onStreakPress?: () => void;
}

interface StatItemProps {
  value: number | string;
  label: string;
  icon: IconSvgElement;
  iconColor?: string;
  highlight?: boolean;
  delay?: number;
}

function StatItem({ value, label, icon, iconColor, highlight, delay = 0 }: StatItemProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, SPRINGS.gentle));
    opacity.value = withDelay(delay, withSpring(1, SPRINGS.gentle));
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.statItem, animatedStyle]}>
      <View style={styles.statHeader}>
        <Icon
          icon={icon}
          size={14}
          color={iconColor ?? theme.colors.foregroundMuted}
        />
        <Text
          variant="h2"
          style={{
            color: highlight ? theme.colors.primary : theme.colors.foreground,
            marginLeft: 4,
            fontSize: 22,
            fontWeight: '700',
          }}
        >
          {value}
        </Text>
      </View>
      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundMuted,
          fontSize: 11,
          marginTop: 2,
        }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export function StatusStrip({ stats, onStreakPress }: StatusStripProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const streakDays = stats?.current_streak_days ?? 0;
  const pagesThisWeek = stats?.this_week?.pages_read ?? 0;
  const booksInProgress = stats?.books_in_progress ?? 0;

  const hasStreak = streakDays > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        onPress={onStreakPress}
        haptic="light"
        disabled={!onStreakPress}
      >
        <View style={styles.statPressable}>
          <StatItem
            value={streakDays}
            label={streakDays === 1 ? 'day streak' : 'day streak'}
            icon={Target02Icon}
            iconColor={hasStreak ? theme.colors.warning : theme.colors.foregroundMuted}
            highlight={hasStreak}
            delay={0}
          />
        </View>
      </Pressable>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.statPressable}>
        <StatItem
          value={pagesThisWeek}
          label="pages this week"
          icon={Book01Icon}
          highlight={pagesThisWeek > 0}
          delay={50}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

      <View style={styles.statPressable}>
        <StatItem
          value={booksInProgress}
          label="reading"
          icon={Time04Icon}
          delay={100}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statPressable: {
    flex: 1,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 32,
  },
});
