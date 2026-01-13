import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Target02Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, Progress } from '@/components';
import { useTheme } from '@/themes';
import { useGoalsWithProgress, type GoalProgress } from '@/database/hooks';
import { useCelebrationStore } from '@/stores/celebrationStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const GOAL_TYPE_CONFIG: Record<string, { label: string }> = {
  books: { label: 'Books' },
  pages: { label: 'Pages' },
  minutes: { label: 'Minutes' },
  streak: { label: 'Streak' },
};

const GOAL_PERIOD_CONFIG: Record<string, { shortLabel: string }> = {
  yearly: { shortLabel: 'Year' },
  monthly: { shortLabel: 'Month' },
  weekly: { shortLabel: 'Week' },
  daily: { shortLabel: 'Today' },
};

interface GoalMiniCardProps {
  goalProgress: GoalProgress;
}

function GoalMiniCard({ goalProgress }: GoalMiniCardProps) {
  const { theme } = useTheme();
  const { goal, currentValue, progressPercentage, isCompleted, isOnTrack } = goalProgress;

  return (
    <View
      style={[
        styles.goalCard,
        {
          backgroundColor: isCompleted
            ? theme.colors.successSubtle
            : theme.colors.surface,
          borderColor: isCompleted ? theme.colors.success : theme.colors.border,
          borderWidth: theme.borders.thin,
          borderRadius: theme.radii.md,
        },
      ]}
    >
      <View style={styles.goalHeader}>
        <View style={styles.goalLabel}>
          {isCompleted ? (
            <Icon
              icon={CheckmarkCircle02Icon}
              size={14}
              color={theme.colors.success}
            />
          ) : (
            <Icon
              icon={Target02Icon}
              size={14}
              color={isOnTrack ? theme.colors.primary : theme.colors.warning}
            />
          )}
          <Text
            variant="caption"
            style={{
              fontWeight: '600',
              color: isCompleted ? theme.colors.success : theme.colors.foreground,
              marginLeft: 4,
            }}
          >
            {GOAL_PERIOD_CONFIG[goal.period]?.shortLabel} {GOAL_TYPE_CONFIG[goal.type]?.label}
          </Text>
        </View>
        <Text
          variant="caption"
          style={{
            color: isCompleted ? theme.colors.success : theme.colors.foregroundMuted,
          }}
        >
          {currentValue}/{goal.target}
        </Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <Progress value={progressPercentage} size="sm" showPercentage={false} />
      </View>
    </View>
  );
}

export function GoalProgressWidget() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { triggerCelebration, markGoalAsCompleted, hasBeenCelebrated } = useCelebrationStore();

  const { progress: goalsWithProgress, loading } = useGoalsWithProgress();

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

  if (loading || activeGoals.length === 0) {
    return null;
  }

  return (
    <View>
      <Pressable
        onPress={() => navigation.navigate('ReadingGoals')}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text variant="h3">Goals</Text>
            {completedCount > 0 && (
              <View
                style={[
                  styles.completedBadge,
                  { backgroundColor: theme.colors.successSubtle },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: theme.colors.success, fontWeight: '600' }}
                >
                  {completedCount}/{totalCount}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.seeAllRow}>
            <Text variant="caption" style={{ color: theme.colors.primary }}>
              See all
            </Text>
            <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.goalsGrid}>
        {activeGoals.map((goalProgress) => (
          <GoalMiniCard key={goalProgress.goal.id} goalProgress={goalProgress} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  completedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goalsGrid: {
    gap: 10,
  },
  goalCard: {
    padding: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
