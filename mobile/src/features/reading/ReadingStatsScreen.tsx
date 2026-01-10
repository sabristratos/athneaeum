import React from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Badge } from '@/components';
import { useTheme } from '@/themes';
import { useReadingStatsController } from '@/features/reading/hooks';
import { StatBox, RecentSessionCard } from '@/features/reading/components';

export function ReadingStatsScreen() {
  const { theme } = useTheme();
  const {
    stats,
    loading,
    error,
    refreshing,
    onRefresh,
  } = useReadingStatsController();

  if (loading && !refreshing && !stats) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Text variant="h2" style={{ marginBottom: theme.spacing.lg }}>
          Reading Stats
        </Text>

        {error && (
          <Card variant="outlined" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="body" color="danger" style={styles.centerText}>
              {error}
            </Text>
          </Card>
        )}

        {stats && (
          <>
            {/* Overview Stats */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                All Time
              </Text>
              <View style={[styles.statRow, { gap: theme.spacing.sm, marginBottom: theme.spacing.sm }]}>
                <StatBox label="Pages" value={stats.total_pages_read} accent />
                <StatBox label="Sessions" value={stats.total_sessions} />
                <StatBox label="Books Done" value={stats.books_completed} />
              </View>
              <View style={[styles.statRow, { gap: theme.spacing.sm }]}>
                <StatBox label="Reading" value={stats.books_in_progress} />
                <StatBox label="Avg Pages" value={stats.avg_pages_per_session} />
                {stats.total_reading_time_formatted && (
                  <StatBox label="Total Time" value={stats.total_reading_time_formatted} />
                )}
              </View>
            </Card>

            {/* Streaks */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                Reading Streaks
              </Text>
              <View style={[styles.statRow, { gap: theme.spacing.sm }]}>
                <View style={styles.streakColumn}>
                  <Text
                    variant="h2"
                    style={[styles.streakNumber, { color: theme.colors.primary }]}
                  >
                    {stats.current_streak_days}
                  </Text>
                  <Text variant="body" muted>
                    Current Streak
                  </Text>
                  <Text variant="caption" muted>
                    days
                  </Text>
                </View>
                <View
                  style={[styles.streakDivider, { backgroundColor: theme.colors.border }]}
                />
                <View style={styles.streakColumn}>
                  <Text
                    variant="h2"
                    style={[styles.streakNumber, { color: theme.colors.foregroundMuted }]}
                  >
                    {stats.longest_streak_days}
                  </Text>
                  <Text variant="body" muted>
                    Longest Streak
                  </Text>
                  <Text variant="caption" muted>
                    days
                  </Text>
                </View>
              </View>
            </Card>

            {/* This Week */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <View style={[styles.cardHeader, { marginBottom: theme.spacing.md }]}>
                <Text variant="h3">This Week</Text>
                <Badge variant="primary">{stats.this_week.sessions} sessions</Badge>
              </View>
              <View style={[styles.statRow, { gap: theme.spacing.sm }]}>
                <StatBox label="Pages" value={stats.this_week.pages_read} />
                {stats.this_week.reading_time_formatted && (
                  <StatBox label="Time" value={stats.this_week.reading_time_formatted} />
                )}
              </View>
            </Card>

            {/* This Month */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <View style={[styles.cardHeader, { marginBottom: theme.spacing.md }]}>
                <Text variant="h3">This Month</Text>
                <Badge variant="muted">{stats.this_month.sessions} sessions</Badge>
              </View>
              <View style={[styles.statRow, { gap: theme.spacing.sm }]}>
                <StatBox label="Pages" value={stats.this_month.pages_read} />
                {stats.this_month.reading_time_formatted && (
                  <StatBox label="Time" value={stats.this_month.reading_time_formatted} />
                )}
              </View>
            </Card>

            {/* Recent Sessions */}
            {stats.recent_sessions.length > 0 && (
              <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.xl }}>
                <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                  Recent Sessions
                </Text>
                {stats.recent_sessions.map((session) => (
                  <RecentSessionCard key={session.id} session={session} />
                ))}
              </Card>
            )}

            {/* Empty state for no sessions */}
            {stats.total_sessions === 0 && (
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
                <Text variant="h3" muted>
                  No Reading Sessions Yet
                </Text>
                <Text
                  variant="body"
                  muted
                  style={[styles.centerText, { marginTop: theme.spacing.sm }]}
                >
                  Start reading a book and log your first session to see your stats here.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  statRow: {
    flexDirection: 'row',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakColumn: {
    flex: 1,
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
  },
  streakDivider: {
    width: 1,
  },
});
