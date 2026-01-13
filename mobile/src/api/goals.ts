import { apiClient } from '@/api/client';
import type { MessageResponse } from '@/types';

export type GoalType = 'books' | 'pages' | 'minutes' | 'streak';
export type GoalPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReadingGoal {
  id: number;
  type: GoalType;
  period: GoalPeriod;
  target: number;
  current_value: number;
  year: number;
  month: number | null;
  week: number | null;
  is_active: boolean;
  progress_percentage: number;
  is_completed: boolean;
  remaining: number;
  is_on_track: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGoalData {
  type: GoalType;
  period: GoalPeriod;
  target: number;
  year: number;
  month?: number;
  week?: number;
}

export interface UpdateGoalData {
  target?: number;
  is_active?: boolean;
}

export interface GoalOption {
  value: string;
  label: string;
}

export const GOAL_TYPE_CONFIG: Record<GoalType, { label: string; unit: string }> = {
  books: { label: 'Books', unit: 'books' },
  pages: { label: 'Pages', unit: 'pages' },
  minutes: { label: 'Minutes', unit: 'minutes' },
  streak: { label: 'Streak', unit: 'days' },
};

export const GOAL_PERIOD_CONFIG: Record<GoalPeriod, { label: string; shortLabel: string }> = {
  yearly: { label: 'Yearly', shortLabel: 'Year' },
  monthly: { label: 'Monthly', shortLabel: 'Month' },
  weekly: { label: 'Weekly', shortLabel: 'Week' },
  daily: { label: 'Daily', shortLabel: 'Today' },
};

export const GOAL_TYPES: { key: GoalType; label: string; unit: string }[] = [
  { key: 'books', label: 'Books', unit: 'books' },
  { key: 'pages', label: 'Pages', unit: 'pages' },
  { key: 'minutes', label: 'Minutes', unit: 'minutes' },
  { key: 'streak', label: 'Streak', unit: 'days' },
];

export const GOAL_PERIODS: { key: GoalPeriod; label: string }[] = [
  { key: 'yearly', label: 'Yearly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'daily', label: 'Daily' },
];

export const goalsApi = {
  getAll: (): Promise<ReadingGoal[]> => apiClient('/goals'),

  create: (data: CreateGoalData): Promise<ReadingGoal> =>
    apiClient('/goals', {
      method: 'POST',
      body: data,
    }),

  get: (id: number): Promise<ReadingGoal> => apiClient(`/goals/${id}`),

  update: (id: number, data: UpdateGoalData): Promise<ReadingGoal> =>
    apiClient(`/goals/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  delete: (id: number): Promise<MessageResponse> =>
    apiClient(`/goals/${id}`, {
      method: 'DELETE',
    }),

  getTypes: (): Promise<GoalOption[]> => apiClient('/goals/types'),

  getPeriods: (): Promise<GoalOption[]> => apiClient('/goals/periods'),
};
