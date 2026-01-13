import { useEffect, useState, useCallback, useRef } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type {
  ReadingGoal,
  GoalType,
  GoalPeriod,
} from '@/database/models/ReadingGoal';
import {
  computeGoalProgress,
  computeAllGoalsProgress,
  getCurrentPeriodInfo,
  type GoalProgress,
} from '@/services/goalComputation';

export { type GoalProgress } from '@/services/goalComputation';

export function useGoals() {
  const [goals, setGoals] = useState<ReadingGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const goalsCollection = database.get<ReadingGoal>('reading_goals');

    const subscription = goalsCollection
      .query(Q.where('is_deleted', false), Q.where('is_active', true))
      .observe()
      .subscribe((fetchedGoals) => {
        setGoals(fetchedGoals);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  return { goals, loading };
}

export function useGoalsWithProgress() {
  const { goals, loading: goalsLoading } = useGoals();
  const [progress, setProgress] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const computeProgress = useCallback(async () => {
    if (goals.length === 0) {
      setProgress([]);
      setLoading(false);
      return;
    }

    try {
      const computed = await computeAllGoalsProgress(goals);
      setProgress(computed);
    } catch (error) {
      console.error('Error computing goal progress:', error);
    } finally {
      setLoading(false);
    }
  }, [goals]);

  useEffect(() => {
    if (goalsLoading) return;
    computeProgress();
  }, [goalsLoading, computeProgress]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(computeProgress, 60000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [computeProgress]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await computeProgress();
  }, [computeProgress]);

  return { progress, loading: goalsLoading || loading, refresh };
}

export function useGoal(goalId: string) {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const subscription = database
      .get<ReadingGoal>('reading_goals')
      .findAndObserve(goalId)
      .subscribe({
        next: (fetchedGoal) => {
          setGoal(fetchedGoal);
          setLoading(false);
        },
        error: () => {
          setGoal(null);
          setLoading(false);
        },
      });

    return () => subscription.unsubscribe();
  }, [goalId]);

  return { goal, loading };
}

export function useGoalWithProgress(goalId: string) {
  const { goal, loading: goalLoading } = useGoal(goalId);
  const [progress, setProgress] = useState<GoalProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const computeProgress = useCallback(async () => {
    if (!goal) {
      setProgress(null);
      setLoading(false);
      return;
    }

    try {
      const computed = await computeGoalProgress(goal);
      setProgress(computed);
    } catch (error) {
      console.error('Error computing goal progress:', error);
    } finally {
      setLoading(false);
    }
  }, [goal]);

  useEffect(() => {
    if (goalLoading) return;
    computeProgress();
  }, [goalLoading, computeProgress]);

  useEffect(() => {
    refreshIntervalRef.current = setInterval(computeProgress, 60000);
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [computeProgress]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await computeProgress();
  }, [computeProgress]);

  return { goal, progress, loading: goalLoading || loading, refresh };
}

export interface CreateGoalData {
  type: GoalType;
  period: GoalPeriod;
  target: number;
}

export function useGoalActions() {
  const [loading, setLoading] = useState(false);

  const createGoal = useCallback(
    async (data: CreateGoalData): Promise<ReadingGoal> => {
      setLoading(true);
      try {
        let createdGoal: ReadingGoal | null = null;
        const periodInfo = getCurrentPeriodInfo(data.period);

        await database.write(async () => {
          const goalsCollection = database.get<ReadingGoal>('reading_goals');

          const existing = await goalsCollection
            .query(
              Q.where('is_deleted', false),
              Q.where('is_active', true),
              Q.where('type', data.type),
              Q.where('period', data.period),
              Q.where('year', periodInfo.year),
              ...(periodInfo.month !== undefined
                ? [Q.where('month', periodInfo.month)]
                : []),
              ...(periodInfo.week !== undefined
                ? [Q.where('week', periodInfo.week)]
                : [])
            )
            .fetch();

          if (existing.length > 0) {
            await existing[0].updateTarget(data.target);
            createdGoal = existing[0];
            return;
          }

          createdGoal = await goalsCollection.create((record) => {
            record.type = data.type;
            record.period = data.period;
            record.target = data.target;
            record.year = periodInfo.year;
            record.month = periodInfo.month ?? null;
            record.week = periodInfo.week ?? null;
            record.isActive = true;
            record.completedAt = null;
            record.isPendingSync = true;
            record.isDeleted = false;
          });
        });

        scheduleSyncAfterMutation();
        return createdGoal!;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateGoal = useCallback(
    async (goalId: string, target: number): Promise<void> => {
      setLoading(true);
      try {
        await database.write(async () => {
          const goal = await database
            .get<ReadingGoal>('reading_goals')
            .find(goalId);
          await goal.updateTarget(target);
        });

        scheduleSyncAfterMutation();
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteGoal = useCallback(async (goalId: string): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const goal = await database.get<ReadingGoal>('reading_goals').find(goalId);
        await goal.softDelete();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const deactivateGoal = useCallback(async (goalId: string): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const goal = await database.get<ReadingGoal>('reading_goals').find(goalId);
        await goal.deactivate();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  const markGoalCompleted = useCallback(async (goalId: string): Promise<void> => {
    setLoading(true);
    try {
      await database.write(async () => {
        const goal = await database.get<ReadingGoal>('reading_goals').find(goalId);
        await goal.markCompleted();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createGoal,
    updateGoal,
    deleteGoal,
    deactivateGoal,
    markGoalCompleted,
    loading,
  };
}

export function useGoalByType(type: GoalType, period: GoalPeriod) {
  const [goal, setGoal] = useState<ReadingGoal | null>(null);
  const [loading, setLoading] = useState(true);

  const periodInfo = getCurrentPeriodInfo(period);

  useEffect(() => {
    const goalsCollection = database.get<ReadingGoal>('reading_goals');

    const conditions = [
      Q.where('is_deleted', false),
      Q.where('is_active', true),
      Q.where('type', type),
      Q.where('period', period),
      Q.where('year', periodInfo.year),
    ];

    if (periodInfo.month !== undefined) {
      conditions.push(Q.where('month', periodInfo.month));
    }
    if (periodInfo.week !== undefined) {
      conditions.push(Q.where('week', periodInfo.week));
    }

    const subscription = goalsCollection
      .query(...conditions)
      .observe()
      .subscribe((results) => {
        setGoal(results.length > 0 ? results[0] : null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [type, period, periodInfo.year, periodInfo.month, periodInfo.week]);

  return { goal, loading };
}
