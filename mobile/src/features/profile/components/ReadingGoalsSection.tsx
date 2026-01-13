import React from 'react';
import { View, Pressable as RNPressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Target02Icon, ArrowRight01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useQuery } from '@tanstack/react-query';
import { Text, Card, Icon, Progress, Button } from '@/components';
import { useTheme } from '@/themes';
import { goalsApi, GOAL_TYPE_CONFIG, GOAL_PERIOD_CONFIG, type ReadingGoal } from '@/api/goals';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import { queryKeys } from '@/lib/queryKeys';

interface GoalCardProps {
  goal: ReadingGoal;
  onPress: () => void;
}

function GoalCard({ goal, onPress }: GoalCardProps) {
  const { theme } = useTheme();

  return (
    <RNPressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
    >
      <View
        style={{
          padding: theme.spacing.md,
          borderBottomWidth: theme.borders.thin,
          borderBottomColor: theme.colors.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
          <Icon
            icon={Target02Icon}
            size={18}
            color={goal.is_completed ? theme.colors.success : goal.is_on_track ? theme.colors.success : theme.colors.warning}
          />
          <Text variant="body" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            {GOAL_PERIOD_CONFIG[goal.period].label} {GOAL_TYPE_CONFIG[goal.type].label}
          </Text>
          <Text variant="caption" muted>
            {goal.current_value}/{goal.target}
          </Text>
        </View>
        <Progress value={goal.progress_percentage} size="sm" showPercentage={false} />
        {goal.is_completed && (
          <Text variant="caption" style={{ color: theme.colors.success, marginTop: theme.spacing.xs }}>
            Goal completed!
          </Text>
        )}
      </View>
    </RNPressable>
  );
}

export function ReadingGoalsSection() {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { data: goals, isLoading } = useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: goalsApi.getAll,
    staleTime: 1000 * 60 * 5,
  });

  const activeGoals = goals?.filter(g => g.is_active) ?? [];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.md }}>
        <Text variant="h3" style={{ flex: 1 }}>
          Reading Goals
        </Text>
        <RNPressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('ReadingGoals');
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="caption" style={{ color: theme.colors.primary }}>
              Manage
            </Text>
            <Icon icon={ArrowRight01Icon} size={16} color={theme.colors.primary} />
          </View>
        </RNPressable>
      </View>

      <Card variant="elevated" padding="none">
        {isLoading ? (
          <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : activeGoals.length === 0 ? (
          <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
            <Icon icon={Target02Icon} size={32} color={theme.colors.foregroundMuted} />
            <Text variant="body" muted style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
              No active reading goals
            </Text>
            <View style={{ marginTop: theme.spacing.sm }}>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => navigation.navigate('ReadingGoals')}
              >
                <Icon icon={Add01Icon} size={16} color={theme.colors.primary} />
                <Text variant="body" style={{ color: theme.colors.primary, marginLeft: 4 }}>
                  Set a Goal
                </Text>
              </Button>
            </View>
          </View>
        ) : (
          activeGoals.slice(0, 3).map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onPress={() => navigation.navigate('ReadingGoals')}
            />
          ))
        )}
      </Card>
    </View>
  );
}
