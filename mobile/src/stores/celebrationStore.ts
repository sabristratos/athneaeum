import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { GoalType, GoalPeriod } from '@/database/models/ReadingGoal';

export interface GoalCelebration {
  id: string;
  goalType: GoalType;
  goalPeriod: GoalPeriod;
  target: number;
  timestamp: number;
}

interface CelebrationStore {
  currentCelebration: GoalCelebration | null;
  recentlyCompletedGoalIds: Set<number>;
  triggerCelebration: (celebration: Omit<GoalCelebration, 'id' | 'timestamp'>) => void;
  dismissCelebration: () => void;
  markGoalAsCompleted: (goalId: number) => void;
  hasBeenCelebrated: (goalId: number) => boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useCelebrationStore = create<CelebrationStore>((set, get) => ({
  currentCelebration: null,
  recentlyCompletedGoalIds: new Set(),

  triggerCelebration: (celebration) => {
    set({
      currentCelebration: {
        ...celebration,
        id: generateId(),
        timestamp: Date.now(),
      },
    });
  },

  dismissCelebration: () => {
    set({ currentCelebration: null });
  },

  markGoalAsCompleted: (goalId) => {
    set((state) => ({
      recentlyCompletedGoalIds: new Set(state.recentlyCompletedGoalIds).add(goalId),
    }));
  },

  hasBeenCelebrated: (goalId) => {
    return get().recentlyCompletedGoalIds.has(goalId);
  },
}));

export const useCurrentCelebration = () =>
  useCelebrationStore((state) => state.currentCelebration);

export const useCelebrationActions = () =>
  useCelebrationStore(
    useShallow((state) => ({
      triggerCelebration: state.triggerCelebration,
      dismissCelebration: state.dismissCelebration,
      markGoalAsCompleted: state.markGoalAsCompleted,
      hasBeenCelebrated: state.hasBeenCelebrated,
    }))
  );
