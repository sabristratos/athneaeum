import React, { useState, useCallback } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft02Icon, Target02Icon, Add01Icon, Delete02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, Card, Icon, IconButton, Button, Progress, BottomSheet, Input, SegmentedControl, ConfirmModal } from '@/components';
import { useTheme } from '@/themes';
import {
  goalsApi,
  GOAL_TYPES,
  GOAL_PERIODS,
  GOAL_TYPE_CONFIG,
  GOAL_PERIOD_CONFIG,
  type ReadingGoal,
  type GoalType,
  type GoalPeriod,
  type CreateGoalData,
} from '@/api/goals';
import { useToast } from '@/stores/toastStore';
import { queryKeys } from '@/lib/queryKeys';

interface GoalItemProps {
  goal: ReadingGoal;
  onEdit: () => void;
  onDelete: () => void;
}

function GoalItem({ goal, onEdit, onDelete }: GoalItemProps) {
  const { theme } = useTheme();
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
            backgroundColor: goal.is_on_track ? theme.colors.successSubtle : theme.colors.warningSubtle,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: theme.spacing.md,
          }}
        >
          <Icon
            icon={Target02Icon}
            size={20}
            color={goal.is_on_track ? theme.colors.success : theme.colors.warning}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text variant="body" style={{ fontWeight: '600' }}>
            {periodLabel} {typeLabel} Goal
          </Text>
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            {goal.year}{goal.month ? ` • ${new Date(2000, goal.month - 1).toLocaleString('default', { month: 'long' })}` : ''}
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
            {goal.current_value} of {goal.target} {typeUnit}
          </Text>
          <Text variant="body" style={{ color: goal.is_completed ? theme.colors.success : theme.colors.foregroundMuted }}>
            {goal.progress_percentage.toFixed(0)}%
          </Text>
        </View>
        <Progress value={goal.progress_percentage} size="md" showPercentage={false} />
      </View>

      {goal.is_completed && (
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

      {!goal.is_completed && !goal.is_on_track && (
        <View
          style={{
            backgroundColor: theme.colors.warningSubtle,
            padding: theme.spacing.sm,
            borderRadius: theme.radii.sm,
            marginTop: theme.spacing.md,
          }}
        >
          <Text variant="caption" style={{ color: theme.colors.warning, textAlign: 'center' }}>
            {goal.remaining} {typeUnit} remaining to reach your goal
          </Text>
        </View>
      )}
    </Card>
  );
}

export function ReadingGoalsScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const toast = useToast();

  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<ReadingGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<ReadingGoal | null>(null);
  const [newGoalType, setNewGoalType] = useState<GoalType>('books');
  const [newGoalPeriod, setNewGoalPeriod] = useState<GoalPeriod>('yearly');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');

  const { data: goals, isLoading } = useQuery({
    queryKey: queryKeys.goals.all,
    queryFn: goalsApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateGoalData) => goalsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      setShowAddSheet(false);
      setNewGoalTarget('');
      toast.success('Goal created');
    },
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : 'Failed to create goal');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => goalsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      setShowDeleteModal(false);
      setGoalToDelete(null);
      toast.success('Goal deleted');
    },
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : 'Failed to delete goal');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, target }: { id: number; target: number }) =>
      goalsApi.update(id, { target }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      setShowEditSheet(false);
      setGoalToEdit(null);
      setEditGoalTarget('');
      toast.success('Goal updated');
    },
    onError: (error) => {
      toast.danger(error instanceof Error ? error.message : 'Failed to update goal');
    },
  });

  const handleCreateGoal = useCallback(() => {
    const target = parseInt(newGoalTarget, 10);
    if (!target || target <= 0) {
      toast.danger('Please enter a valid target');
      return;
    }

    createMutation.mutate({
      type: newGoalType,
      period: newGoalPeriod,
      target,
      year: new Date().getFullYear(),
      month: newGoalPeriod === 'monthly' ? new Date().getMonth() + 1 : undefined,
    });
  }, [newGoalType, newGoalPeriod, newGoalTarget, createMutation, toast]);

  const handleDeleteGoal = useCallback((goal: ReadingGoal) => {
    setGoalToDelete(goal);
    setShowDeleteModal(true);
  }, []);

  const handleEditGoal = useCallback((goal: ReadingGoal) => {
    setGoalToEdit(goal);
    setEditGoalTarget(goal.target.toString());
    setShowEditSheet(true);
  }, []);

  const handleUpdateGoal = useCallback(() => {
    if (!goalToEdit) return;

    const target = parseInt(editGoalTarget, 10);
    if (!target || target <= 0) {
      toast.danger('Please enter a valid target');
      return;
    }

    updateMutation.mutate({ id: goalToEdit.id, target });
  }, [goalToEdit, editGoalTarget, updateMutation, toast]);

  const confirmDelete = useCallback(() => {
    if (goalToDelete) {
      deleteMutation.mutate(goalToDelete.id);
    }
  }, [goalToDelete, deleteMutation]);

  const activeGoals = goals?.filter(g => g.is_active) ?? [];

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

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : activeGoals.length === 0 ? (
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
          {activeGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onEdit={() => handleEditGoal(goal)}
              onDelete={() => handleDeleteGoal(goal)}
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
            loading={createMutation.isPending}
            disabled={!newGoalTarget || createMutation.isPending}
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
                {GOAL_PERIOD_CONFIG[goalToEdit.period].label}{' '}
                {GOAL_TYPE_CONFIG[goalToEdit.type].label} Goal
              </Text>
              <Text variant="caption" muted style={{ marginTop: 4 }}>
                Current progress: {goalToEdit.current_value} of {goalToEdit.target}{' '}
                {GOAL_TYPE_CONFIG[goalToEdit.type].unit}
              </Text>
            </View>

            <Input
              label={`New Target (${GOAL_TYPE_CONFIG[goalToEdit.type].unit})`}
              value={editGoalTarget}
              onChangeText={setEditGoalTarget}
              placeholder="Enter new target"
              keyboardType="number-pad"
            />

            <Button
              variant="primary"
              size="lg"
              onPress={handleUpdateGoal}
              loading={updateMutation.isPending}
              disabled={!editGoalTarget || updateMutation.isPending}
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
