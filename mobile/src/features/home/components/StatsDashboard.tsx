import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card } from '@/components';
import { useTheme } from '@/themes';
import type { ReadingStats } from '@/types';

interface StatsDashboardProps {
  stats: ReadingStats | null;
  loading?: boolean;
}

interface StatBoxProps {
  value: string | number;
  label: string;
  highlight?: boolean;
}

function StatBox({ value, label, highlight }: StatBoxProps) {
  const { theme } = useTheme();

  return (
    <Card
      variant="filled"
      padding="md"
      style={styles.statBox}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text
        variant="h2"
        style={{
          color: highlight ? theme.colors.primary : theme.colors.foreground,
          textAlign: 'center',
        }}
      >
        {value}
      </Text>
      <Text variant="caption" muted style={{ textAlign: 'center' }}>
        {label}
      </Text>
    </Card>
  );
}

export function StatsDashboard({ stats, loading }: StatsDashboardProps) {
  const { theme } = useTheme();

  const pagesThisWeek = stats?.this_week?.pages_read ?? 0;
  const streak = stats?.current_streak_days ?? 0;
  const booksCompleted = stats?.books_completed ?? 0;

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        This Week
      </Text>
      <View style={styles.grid}>
        <StatBox value={pagesThisWeek} label="Pages Read" highlight />
        <StatBox value={streak} label="Day Streak" highlight={streak > 0} />
        <StatBox value={booksCompleted} label="Books Done" />
      </View>

      {stats && stats.avg_pages_per_session > 0 && (
        <View style={{ marginTop: theme.spacing.md }}>
          <Card variant="outlined" padding="md">
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="body" color="primary">
                  {Math.round(stats.avg_pages_per_session)}
                </Text>
                <Text variant="caption" muted>
                  avg pages/session
                </Text>
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.summaryItem}>
                <Text variant="body" color="primary">
                  {stats.total_sessions}
                </Text>
                <Text variant="caption" muted>
                  total sessions
                </Text>
              </View>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.summaryItem}>
                <Text variant="body" color="primary">
                  {stats.books_in_progress}
                </Text>
                <Text variant="caption" muted>
                  in progress
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 32,
  },
});
