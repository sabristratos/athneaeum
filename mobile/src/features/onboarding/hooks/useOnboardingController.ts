import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, EDITION_LABELS } from '@/stores/themeStore';
import { usePreferencesStore, type BookFormat } from '@/stores/preferencesStore';
import { database } from '@/database/index';
import type { ReadingGoal } from '@/database/models/ReadingGoal';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { ThemeName } from '@/types/theme';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedTheme: ThemeName;
  selectedFormats: BookFormat[];
  selectedGenres: string[];
  yearlyGoal: number | null;
  isCompleting: boolean;
}

const POPULAR_GENRES = [
  'Fiction',
  'Fantasy',
  'Science Fiction',
  'Mystery',
  'Romance',
  'Thriller',
  'Historical Fiction',
  'Literary Fiction',
  'Horror',
  'Biography',
  'Self-Help',
  'Non-Fiction',
];

export function useOnboardingController() {
  const user = useAuthStore((state) => state.user);
  const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);
  const currentTheme = useThemeStore((state) => state.themeName);
  const setThemeSilent = useThemeStore((state) => state.setThemeSilent);
  const setPreference = usePreferencesStore((state) => state.setPreference);

  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    selectedTheme: currentTheme,
    selectedFormats: [],
    selectedGenres: [],
    yearlyGoal: null,
    isCompleting: false,
  });

  const nextStep = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.min(s.currentStep + 1, 5) as OnboardingStep,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.max(s.currentStep - 1, 1) as OnboardingStep,
    }));
  }, []);

  const goToStep = useCallback((step: OnboardingStep) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const selectTheme = useCallback(
    (theme: ThemeName) => {
      setState((s) => ({ ...s, selectedTheme: theme }));
      setThemeSilent(theme);
    },
    [setThemeSilent]
  );

  const toggleFormat = useCallback((format: BookFormat) => {
    setState((s) => ({
      ...s,
      selectedFormats: s.selectedFormats.includes(format)
        ? s.selectedFormats.filter((f) => f !== format)
        : [...s.selectedFormats, format],
    }));
  }, []);

  const toggleGenre = useCallback((genre: string) => {
    setState((s) => ({
      ...s,
      selectedGenres: s.selectedGenres.includes(genre)
        ? s.selectedGenres.filter((g) => g !== genre)
        : [...s.selectedGenres, genre],
    }));
  }, []);

  const setYearlyGoal = useCallback((goal: number | null) => {
    setState((s) => ({ ...s, yearlyGoal: goal }));
  }, []);

  const createYearlyGoal = useCallback(async (target: number) => {
    const currentYear = new Date().getFullYear();

    await database.write(async () => {
      const goalsCollection = database.get<ReadingGoal>('reading_goals');
      await goalsCollection.create((record) => {
        record.type = 'books';
        record.period = 'yearly';
        record.target = target;
        record.year = currentYear;
        record.month = null;
        record.week = null;
        record.isActive = true;
        record.completedAt = null;
        record.isPendingSync = true;
        record.isDeleted = false;
      });
    });

    scheduleSyncAfterMutation();
  }, []);

  const completeOnboarding = useCallback(async () => {
    setState((s) => ({ ...s, isCompleting: true }));

    try {
      if (state.selectedFormats.length > 0) {
        setPreference('preferredFormats', state.selectedFormats);
        setPreference('defaultFormat', state.selectedFormats[0]);
      }

      if (state.yearlyGoal && state.yearlyGoal > 0) {
        await createYearlyGoal(state.yearlyGoal);
      }

      await apiClient('/user/onboarding-complete', { method: 'POST' });

      setOnboardingComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      setOnboardingComplete();
    } finally {
      setState((s) => ({ ...s, isCompleting: false }));
    }
  }, [
    state.selectedFormats,
    state.yearlyGoal,
    setPreference,
    createYearlyGoal,
    setOnboardingComplete,
  ]);

  const getThemeCopy = useCallback(() => {
    const copy = {
      scholar: {
        welcome: 'Your scholarly pursuits await',
        completion: 'Your academic sanctuary is ready',
      },
      dreamer: {
        welcome: 'A cozy reading nook, just for you',
        completion: 'Your whimsical library awaits',
      },
      wanderer: {
        welcome: 'Chart your reading journey',
        completion: 'Your adventure begins',
      },
      midnight: {
        welcome: 'Discover stories under the stars',
        completion: 'Your celestial library is ready',
      },
    };
    return copy[state.selectedTheme];
  }, [state.selectedTheme]);

  return {
    ...state,
    userName: user?.name?.split(' ')[0] || 'Reader',
    themeLabel: EDITION_LABELS[state.selectedTheme],
    themeCopy: getThemeCopy(),
    popularGenres: POPULAR_GENRES,
    nextStep,
    prevStep,
    goToStep,
    selectTheme,
    toggleFormat,
    toggleGenre,
    setYearlyGoal,
    completeOnboarding,
  };
}
