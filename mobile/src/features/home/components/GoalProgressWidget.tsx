import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Target02Icon, ArrowRight01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Text, Card, Icon, Progress } from '@/components';
import { useTheme } from '@/themes';
import { goalsApi, GOAL_TYPE_CONFIG, GOAL_PERIOD_CONFIG, type ReadingGoal } from '@/api/goals';
import { queryKeys } from '@/lib/queryKeys';
import { useCelebrationStore } from '@/stores/celebrationStore';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

interface GoalMiniCardProps {
  goal: ReadingGoal;
}

function GoalMiniCard({ goal }: GoalMiniCardProps) {
  const { theme } = useTheme();
  const isCompleted = goal.is_completed;

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
              color={goal.is_on_track ? theme.colors.primary : theme.colors.warning}
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
            {GOAL_PERIOD_CONFIG[goal.period].shortLabel} {GOAL_TYPE_CONFIG[goal.type].label}
          </Text>
        </View>
        <Text
          variant="caption"
          style={{
            color: isCompleted ? theme.colors.success : theme.colors.foregroundMuted,
          }}
        >
          {goal.current_value}/{goal.target}
        </Text>
      </View>
      <View style={{ marginTop: 6 }}>
        <Progress value={goal.progress_percentage} size="sm" showPercentage={false} />
      </View>
    </View>
  );
}

export function GoalProgressWidget() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { triggerCelebration, markGoalAsCompleted, hasBeenCelebrated } = useCelebrationStore();

  const { data: goals, isLoading } = useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: goalsApi.getAll,
    staleTime: 1000 * 60 * 5,
  });

  const activeGoals = goals?.filter((g) => g.is_active).slice(0, 3) ?? [];
  const completedCount = activeGoals.filter((g) => g.is_completed).length;
  const totalCount = activeGoals.length;

  useEffect(() => {
    if (!goals) return;

    const completedGoals = goals.filter((g) => g.is_completed && g.is_active);

    for (const goal of completedGoals) {
      if (!hasBeenCelebrated(goal.id)) {
        markGoalAsCompleted(goal.id);
        triggerCelebration({
          goalType: goal.type,
          goalPeriod: goal.period,
          target: goal.target,
        });
        break;
      }
    }
  }, [goals, hasBeenCelebrated, markGoalAsCompleted, triggerCelebration]);

  if (isLoading || activeGoals.length === 0) {
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
        {activeGoals.map((goal) => (
          <GoalMiniCard key={goal.id} goal={goal} />
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
