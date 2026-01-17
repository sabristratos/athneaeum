import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Target02Icon,
  CheckmarkCircle02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from '@hugeicons/core-free-icons';
import { Text, Icon, Pressable, Progress } from '@/components';
import { PulseDot, type DayLabel } from '@/components/atoms';
import { useTheme } from '@/themes';
import { useGoalsWithProgress, type GoalProgress } from '@/database/hooks';
import { useCelebrationStore } from '@/stores/celebrationStore';
import type { RecentSession } from '@/types/book';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DAYS: DayLabel[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const GOAL_TYPE_LABELS: Record<string, string> = {
  books: 'Books',
  pages: 'Pages',
  minutes: 'Minutes',
  streak: 'Streak',
};

const GOAL_PERIOD_LABELS: Record<string, string> = {
  yearly: 'Year',
  monthly: 'Month',
  weekly: 'Week',
  daily: 'Today',
};

interface WeeklyMomentumProps {
  recentSessions: RecentSession[];
}

interface DayData {
  day: DayLabel;
  date: string;
  pagesRead: number;
  isActive: boolean;
  isToday: boolean;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekData(sessions: RecentSession[]): DayData[] {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sessionsByDate = new Map<string, number>();
  sessions.forEach((session) => {
    const dateKey = session.date.split('T')[0];
    const current = sessionsByDate.get(dateKey) || 0;
    sessionsByDate.set(dateKey, current + session.pages_read);
  });

  const weekData: DayData[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const dateStr = formatLocalDate(date);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const pagesRead = sessionsByDate.get(dateStr) || 0;

    weekData.push({
      day: DAYS[i],
      date: dateStr,
      pagesRead,
      isActive: pagesRead > 0,
      isToday,
    });
  }

  return weekData;
}

function getConsecutiveRanges(weekData: DayData[]): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let currentStart: number | null = null;

  weekData.forEach((day, index) => {
    if (day.isActive) {
      if (currentStart === null) {
        currentStart = index;
      }
    } else {
      if (currentStart !== null) {
        ranges.push({ start: currentStart, end: index - 1 });
        currentStart = null;
      }
    }
  });

  if (currentStart !== null) {
    ranges.push({ start: currentStart, end: weekData.length - 1 });
  }

  return ranges;
}

interface CompactGoalCardProps {
  goalProgress: GoalProgress;
}

function CompactGoalCard({ goalProgress }: CompactGoalCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { goal, currentValue, progressPercentage, isCompleted, isOnTrack } = goalProgress;

  return (
    <View
      style={[
        styles.goalCard,
        {
          backgroundColor: isCompleted
            ? theme.colors.successSubtle
            : theme.colors.surfaceAlt,
          borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
        },
      ]}
    >
      <View style={styles.goalRow}>
        <View style={styles.goalInfo}>
          {isCompleted ? (
            <Icon
              icon={CheckmarkCircle02Icon}
              size={12}
              color={theme.colors.success}
            />
          ) : (
            <Icon
              icon={Target02Icon}
              size={12}
              color={isOnTrack ? theme.colors.primary : theme.colors.warning}
            />
          )}
          <Text
            variant="caption"
            style={{
              fontSize: 11,
              fontWeight: '500',
              color: isCompleted ? theme.colors.success : theme.colors.foreground,
              marginLeft: 4,
            }}
          >
            {GOAL_PERIOD_LABELS[goal.period]} {GOAL_TYPE_LABELS[goal.type]}
          </Text>
        </View>
        <Text
          variant="caption"
          style={{
            fontSize: 11,
            color: isCompleted ? theme.colors.success : theme.colors.foregroundMuted,
          }}
        >
          {currentValue}/{goal.target}
        </Text>
      </View>
      <View style={{ marginTop: 4 }}>
        <Progress value={progressPercentage} size="sm" showPercentage={false} />
      </View>
    </View>
  );
}

export function WeeklyMomentum({ recentSessions }: WeeklyMomentumProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const [showGoals, setShowGoals] = useState(true);
  const { triggerCelebration, markGoalAsCompleted, hasBeenCelebrated } = useCelebrationStore();
  const { progress: goalsWithProgress, loading: goalsLoading } = useGoalsWithProgress();

  const weekData = useMemo(() => getWeekData(recentSessions), [recentSessions]);
  const streakRanges = useMemo(() => getConsecutiveRanges(weekData), [weekData]);
  const activeDaysCount = weekData.filter((d) => d.isActive).length;

  const activeGoals = goalsWithProgress.slice(0, 3);
  const completedCount = activeGoals.filter((g) => g.isCompleted).length;
  const totalCount = activeGoals.length;

  useEffect(() => {
    if (goalsWithProgress.length === 0) return;

    const completedGoals = goalsWithProgress.filter((g) => g.isCompleted);
    for (const goalProgress of completedGoals) {
      const goalId = goalProgress.goal.serverId ?? (parseInt(goalProgress.goal.id, 10) || 0);
      if (goalId && !hasBeenCelebrated(goalId)) {
        markGoalAsCompleted(goalId);
        triggerCelebration({
          goalType: goalProgress.goal.type,
          goalPeriod: goalProgress.goal.period,
          target: goalProgress.goal.target,
        });
        break;
      }
    }
  }, [goalsWithProgress, hasBeenCelebrated, markGoalAsCompleted, triggerCelebration]);

  const toggleGoals = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowGoals((prev) => !prev);
  }, []);

  const handleGoalsPress = useCallback(() => {
    navigation.navigate('ReadingGoals');
  }, [navigation]);

  const dotSize = 32;
  const gapSize = 8;
  const totalWidth = 7 * dotSize + 6 * gapSize;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text variant="h3" style={{ color: theme.colors.foreground, fontSize: 18 }}>
          This Week
        </Text>
        <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
          {activeDaysCount}/7 days
        </Text>
      </View>

      <View style={[styles.activitySection, { width: totalWidth, alignSelf: 'center' }]}>
        {streakRanges.map((range) => (
          <View
            key={`${range.start}-${range.end}`}
            style={[
              styles.streakLine,
              {
                left: range.start * (dotSize + gapSize) + dotSize / 2,
                width: (range.end - range.start) * (dotSize + gapSize) + 1,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        ))}

        <View style={styles.dotsRow}>
          {weekData.map((day) => (
            <PulseDot
              key={day.date}
              day={day.day}
              pagesRead={day.pagesRead}
              isActive={day.isActive}
              isToday={day.isToday}
              size={dotSize}
            />
          ))}
        </View>
      </View>

      {activeGoals.length > 0 && (
        <>
          <View
            style={[
              styles.goalsDivider,
              { backgroundColor: theme.colors.border, marginTop: 16 },
            ]}
          />

          <Pressable onPress={toggleGoals} haptic="light">
            <View style={styles.goalsHeader}>
              <View style={styles.goalsHeaderLeft}>
                <Icon
                  icon={Target02Icon}
                  size={14}
                  color={theme.colors.primary}
                />
                <Text
                  variant="caption"
                  style={{
                    marginLeft: 6,
                    color: theme.colors.foreground,
                    fontWeight: '600',
                  }}
                >
                  Goals
                </Text>
                {completedCount > 0 && (
                  <View
                    style={[
                      styles.completedBadge,
                      {
                        backgroundColor: theme.colors.successSubtle,
                        marginLeft: 6,
                      },
                    ]}
                  >
                    <Text
                      variant="caption"
                      style={{
                        color: theme.colors.success,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {completedCount}/{totalCount}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.goalsHeaderRight}>
                <Pressable onPress={handleGoalsPress} haptic="light">
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.primary, marginRight: 8 }}
                  >
                    Manage
                  </Text>
                </Pressable>
                <Icon
                  icon={showGoals ? ArrowUp01Icon : ArrowDown01Icon}
                  size={14}
                  color={theme.colors.foregroundMuted}
                />
              </View>
            </View>
          </Pressable>

          {showGoals && (
            <View style={styles.goalsGrid}>
              {activeGoals.map((goalProgress) => (
                <CompactGoalCard key={goalProgress.goal.id} goalProgress={goalProgress} />
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activitySection: {
    position: 'relative',
    height: 48,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  streakLine: {
    position: 'absolute',
    height: 2,
    top: 15,
    opacity: 0.4,
  },
  goalsDivider: {
    height: 1,
    marginHorizontal: -16,
  },
  goalsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  goalsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalsHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  goalsGrid: {
    gap: 8,
  },
  goalCard: {
    padding: 10,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
