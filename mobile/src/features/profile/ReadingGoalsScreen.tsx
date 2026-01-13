import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft02Icon, Target02Icon, Add01Icon, Delete02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { Text, Card, Icon, IconButton, Button, Progress, BottomSheet, Input, SegmentedControl, ConfirmModal } from '@/components';
import { useTheme } from '@/themes';
import { useGoalsWithProgress, useGoalActions, type GoalProgress } from '@/database/hooks';
import type { GoalType, GoalPeriod } from '@/database/models/ReadingGoal';
import { formatGoalUnit, formatPeriodLabel } from '@/services/goalComputation';
import { useToast } from '@/stores/toastStore';

const GOAL_TYPES: Array<{ key: GoalType; label: string }> = [
  { key: 'books', label: 'Books' },
  { key: 'pages', label: 'Pages' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'streak', label: 'Streak' },
];

const GOAL_PERIODS: Array<{ key: GoalPeriod; label: string }> = [
  { key: 'yearly', label: 'Yearly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'daily', label: 'Daily' },
];

const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; unit: string }> = {
  books: { label: 'Books', unit: 'books' },
  pages: { label: 'Pages', unit: 'pages' },
  minutes: { label: 'Minutes', unit: 'minutes' },
  streak: { label: 'Streak', unit: 'days' },
};

const GOAL_PERIOD_CONFIG: Record<GoalPeriod, { label: string }> = {
  yearly: { label: 'Yearly' },
  monthly: { label: 'Monthly' },
  weekly: { label: 'Weekly' },
  daily: { label: 'Daily' },
};

interface GoalItemProps {
  goalProgress: GoalProgress;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalItem({ goalProgress, onEdit, onDelete }: GoalItemProps) {
  const { theme } = useTheme();
  const { goal, currentValue, progressPercentage, isCompleted, isOnTrack, remaining } = goalProgress;
  const periodLabel = GOAL_PERIOD_CONFIG[goal.period]?.label ?? goal.period;
  const typeLabel = GOAL_TYPE_CONFIG[goal.type]?.label ?? goal.type;
  const typeUnit = GOAL_TYPE_CONFIG[goal.type]?.unit ?? goal.type;

  return (
    <Card variant="elevated" style={{ marginBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radii.md,
            backgroundColor: isOnTrack ? theme.colors.successSubtle : theme.colors.warningSubtle,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}
        >
          <Icon
            icon={Target02Icon}
            size={20}
            color={isOnTrack ? theme.colors.success : theme.colors.warning}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {periodLabel} {typeLabel} Goal
          </Text>
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            {formatPeriodLabel(goal)}
          </Text>
        </View>

        <IconButton
          icon={PencilEdit01Icon}
          variant="ghost"
          size="sm"
          onPress={onEdit}
          accessibilityLabel="Edit goal"
        />
        <IconButton
          icon={Delete02Icon}
          variant="ghost"
          size="sm"
          onPress={onDelete}
          accessibilityLabel="Delete goal"
        />
      </View>

      <View style={{ marginTop: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.xs }}>
          <Text variant="body">
            {currentValue} of {goal.target} {typeUnit}
          </Text>
          <Text variant="body" style={{ color: isCompleted ? theme.colors.success : theme.colors.foregroundMuted }}>
            {progressPercentage.toFixed(0)}%
          </Text>
        </View>
        <Progress value={progressPercentage} size="md" showPercentage={false} />
      </View>

      {isCompleted && (
        <View
          style={{
            backgroundColor: theme.colors.successSubtle,
            padding: theme.spacing.sm,
            borderRadius: theme.radii.sm,
            marginTop: theme.spacing.md,
          }}
        >
          <Text variant="caption" style={{ color: theme.colors.success, textAlign: 'center' }}>
            Goal completed! Great job!
          </Text>
        </View>
      )}

      {!isCompleted && !isOnTrack && (
        <View
          style={{
            backgroundColor: theme.colors.warningSubtle,
            padding: theme.spacing.sm,
            borderRadius: theme.radii.sm,
            marginTop: theme.spacing.md,
          }}
        >
          <Text variant="caption" style={{ color: theme.colors.warning, textAlign: 'center' }}>
            {remaining} {typeUnit} remaining to reach your goal
          </Text>
        </View>
      )}
    </Card>
  );
}

export function ReadingGoalsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();

  const { progress: goalsWithProgress, loading, refresh } = useGoalsWithProgress();
  const { createGoal, updateGoal, deleteGoal, loading: actionLoading } = useGoalActions();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<GoalProgress | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalProgress | null>(null);
  const [newGoalType, setNewGoalType] = useState<GoalType>('books');
  const [newGoalPeriod, setNewGoalPeriod] = useState<GoalPeriod>('yearly');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');

  const handleCreateGoal = useCallback(async () => {
    const target = parseInt(newGoalTarget, 10);
    if (!target || target <= 0) {
      toast.danger('Please enter a valid target');
      return;
    }

    try {
      await createGoal({
        type: newGoalType,
        period: newGoalPeriod,
        target,
      });
      setShowAddSheet(false);
      setNewGoalTarget('');
      toast.success('Goal created');
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Failed to create goal');
    }
  }, [newGoalType, newGoalPeriod, newGoalTarget, createGoal, toast, refresh]);

  const handleDeleteGoal = useCallback((goalProgress: GoalProgress) => {
    setGoalToDelete(goalProgress);
    setShowDeleteModal(true);
  }, []);

  const handleEditGoal = useCallback((goalProgress: GoalProgress) => {
    setGoalToEdit(goalProgress);
    setEditGoalTarget(goalProgress.goal.target.toString());
    setShowEditSheet(true);
  }, []);

  const handleUpdateGoal = useCallback(async () => {
    if (!goalToEdit) return;

    const target = parseInt(editGoalTarget, 10);
    if (!target || target <= 0) {
      toast.danger('Please enter a valid target');
      return;
    }

    try {
      await updateGoal(goalToEdit.goal.id, target);
      setShowEditSheet(false);
      setGoalToEdit(null);
      setEditGoalTarget('');
      toast.success('Goal updated');
      refresh();
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : 'Failed to update goal');
    }
  }, [goalToEdit, editGoalTarget, updateGoal, toast, refresh]);

  const confirmDelete = useCallback(async () => {
    if (goalToDelete) {
      try {
        await deleteGoal(goalToDelete.goal.id);
        setShowDeleteModal(false);
        setGoalToDelete(null);
        toast.success('Goal deleted');
        refresh();
      } catch (error) {
        toast.danger(error instanceof Error ? error.message : 'Failed to delete goal');
      }
    }
  }, [goalToDelete, deleteGoal, toast, refresh]);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top']}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderBottomWidth: theme.borders.thin,
          borderBottomColor: theme.colors.border,
        }}
      >
        <IconButton
          icon={ArrowLeft02Icon}
          variant="ghost"
          size="md"
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          Reading Goals
        </Text>
        <IconButton
          icon={Add01Icon}
          variant="ghost"
          size="md"
          onPress={() => setShowAddSheet(true)}
          accessibilityLabel="Add goal"
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : goalsWithProgress.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
          <Icon icon={Target02Icon} size={64} color={theme.colors.foregroundMuted} />
          <Text variant="h3" style={{ marginTop: theme.spacing.lg, textAlign: 'center' }}>
            No Reading Goals Yet
          </Text>
          <Text variant="body" muted style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
            Set goals to track your reading progress and stay motivated.
          </Text>
          <View style={{ marginTop: theme.spacing.xl }}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => setShowAddSheet(true)}
            >
              <Icon icon={Add01Icon} size={20} color={theme.colors.onPrimary} />
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', marginLeft: 8 }}>
                Create Your First Goal
              </Text>
            </Button>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg }}
        >
          {goalsWithProgress.map((goalProgress) => (
            <GoalItem
              key={goalProgress.goal.id}
              goalProgress={goalProgress}
              onEdit={() => handleEditGoal(goalProgress)}
              onDelete={() => handleDeleteGoal(goalProgress)}
            />
          ))}
        </ScrollView>
      )}

      <BottomSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        title="Create Reading Goal"
      >
        <View style={{ gap: theme.spacing.lg }}>
          <View>
            <Text variant="label" muted style={{ marginBottom: theme.spacing.sm }}>
              Goal Type
            </Text>
            <SegmentedControl
              options={GOAL_TYPES.map(t => ({ key: t.key, label: t.label }))}
              selected={newGoalType}
              onSelect={(key: GoalType) => setNewGoalType(key)}
            />
          </View>

          <View>
            <Text variant="label" muted style={{ marginBottom: theme.spacing.sm }}>
              Time Period
            </Text>
            <SegmentedControl
              options={GOAL_PERIODS.map(p => ({ key: p.key, label: p.label }))}
              selected={newGoalPeriod}
              onSelect={(key: GoalPeriod) => setNewGoalPeriod(key)}
            />
          </View>

          <Input
            label={`Target (${GOAL_TYPE_CONFIG[newGoalType].unit})`}
            value={newGoalTarget}
            onChangeText={setNewGoalTarget}
            placeholder={`How many ${GOAL_TYPE_CONFIG[newGoalType].unit}?`}
            keyboardType="number-pad"
          />

          <Button
            variant="primary"
            size="lg"
            onPress={handleCreateGoal}
            loading={actionLoading}
            disabled={!newGoalTarget || actionLoading}
          >
            Create Goal
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showEditSheet}
        onClose={() => {
          setShowEditSheet(false);
          setGoalToEdit(null);
        }}
        title="Edit Reading Goal"
      >
        {goalToEdit && (
          <View style={{ gap: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.surfaceHover,
                padding: theme.spacing.md,
                borderRadius: theme.radii.md,
              }}
            >
              <Text variant="body" style={{ fontWeight: '600' }}>
                {GOAL_PERIOD_CONFIG[goalToEdit.goal.period].label}{' '}
                {GOAL_TYPE_CONFIG[goalToEdit.goal.type].label} Goal
              </Text>
              <Text variant="caption" muted style={{ marginTop: 4 }}>
                Current progress: {goalToEdit.currentValue} of {goalToEdit.goal.target}{' '}
                {GOAL_TYPE_CONFIG[goalToEdit.goal.type].unit}
              </Text>
            </View>

            <Input
              label={`New Target (${GOAL_TYPE_CONFIG[goalToEdit.goal.type].unit})`}
              value={editGoalTarget}
              onChangeText={setEditGoalTarget}
              placeholder="Enter new target"
              keyboardType="number-pad"
            />

            <Button
              variant="primary"
              size="lg"
              onPress={handleUpdateGoal}
              loading={actionLoading}
              disabled={!editGoalTarget || actionLoading}
            >
              Update Goal
            </Button>
          </View>
        )}
      </BottomSheet>

      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setGoalToDelete(null);
        }}
        title="Delete Goal?"
        message="Are you sure you want to delete this reading goal? Your progress will be lost."
        status="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setGoalToDelete(null);
        }}
        confirmDestructive
      />
    </SafeAreaView>
  );
}
