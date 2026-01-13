import React from 'react';
import { View, Pressable as RNPressable, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Target02Icon, ArrowRight01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, Card, Icon, Progress, Button } from '@/components';
import { useTheme } from '@/themes';
import { useGoalsWithProgress, type GoalProgress } from '@/database/hooks';
import type { MainStackParamList } from '@/navigation/MainNavigator';

const GOAL_TYPE_CONFIG: Record<string, { label: string }> = {
  books: { label: 'Books' },
  pages: { label: 'Pages' },
  minutes: { label: 'Minutes' },
  streak: { label: 'Streak' },
};

const GOAL_PERIOD_CONFIG: Record<string, { label: string }> = {
  yearly: { label: 'Yearly' },
  monthly: { label: 'Monthly' },
  weekly: { label: 'Weekly' },
  daily: { label: 'Daily' },
};

interface GoalCardProps {
  goalProgress: GoalProgress;
  onPress: () => void;
}

function GoalCard({ goalProgress, onPress }: GoalCardProps) {
  const { theme } = useTheme();
  const { goal, currentValue, progressPercentage, isCompleted, isOnTrack } = goalProgress;

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
            color={isCompleted ? theme.colors.success : isOnTrack ? theme.colors.success : theme.colors.warning}
          />
          <Text variant="body" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
            {GOAL_PERIOD_CONFIG[goal.period]?.label} {GOAL_TYPE_CONFIG[goal.type]?.label}
          </Text>
          <Text variant="caption" muted>
            {currentValue}/{goal.target}
          </Text>
        </View>
        <Progress value={progressPercentage} size="sm" showPercentage={false} />
        {isCompleted && (
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

  const { progress: goalsWithProgress, loading } = useGoalsWithProgress();

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
        {loading ? (
          <View style={{ padding: theme.spacing.lg, alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : goalsWithProgress.length === 0 ? (
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
          goalsWithProgress.slice(0, 3).map((goalProgress) => (
            <GoalCard
              key={goalProgress.goal.id}
              goalProgress={goalProgress}
              onPress={() => navigation.navigate('ReadingGoals')}
            />
          ))
        )}
      </Card>
    </View>
  );
}
