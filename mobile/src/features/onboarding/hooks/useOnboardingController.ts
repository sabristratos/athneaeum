import { useState, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore, EDITION_LABELS } from '@/stores/themeStore';
import { useToast } from '@/stores/toastStore';
import { database } from '@/database/index';
import type { ReadingGoal } from '@/database/models/ReadingGoal';
import type { UserPreference } from '@/database/models/UserPreference';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { ThemeName } from '@/types/theme';
import type { BookFormat } from '@/database/hooks/useFormatPreferences';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6;

interface OnboardingState {
  currentStep: OnboardingStep;
  selectedTheme: ThemeName;
  selectedFormats: BookFormat[];
  selectedGenres: string[];
  selectedAuthors: string[];
  yearlyGoal: number | null;
  isCompleting: boolean;
  formatError: string | null;
}

export function useOnboardingController() {
  const user = useAuthStore((state) => state.user);
  const setOnboardingComplete = useAuthStore((state) => state.setOnboardingComplete);
  const currentTheme = useThemeStore((state) => state.themeName);
  const setThemeSilent = useThemeStore((state) => state.setThemeSilent);
  const toast = useToast();

  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    selectedTheme: currentTheme,
    selectedFormats: [],
    selectedGenres: [],
    selectedAuthors: [],
    yearlyGoal: null,
    isCompleting: false,
    formatError: null,
  });

  const nextStep = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.min(s.currentStep + 1, 6) as OnboardingStep,
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
      formatError: null,
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

  const addAuthor = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      selectedAuthors: s.selectedAuthors.includes(name)
        ? s.selectedAuthors
        : [...s.selectedAuthors, name],
    }));
  }, []);

  const removeAuthor = useCallback((name: string) => {
    setState((s) => ({
      ...s,
      selectedAuthors: s.selectedAuthors.filter((a) => a !== name),
    }));
  }, []);

  const handlePreferencesNext = useCallback(() => {
    if (state.selectedFormats.length === 0) {
      setState((s) => ({
        ...s,
        formatError: 'Please select at least one reading format',
      }));
      return;
    }
    setState((s) => ({ ...s, formatError: null }));
    nextStep();
  }, [state.selectedFormats.length, nextStep]);

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
  }, []);

  const saveFavoriteGenres = useCallback(async (genres: string[]) => {
    if (genres.length === 0) return;

    await database.write(async () => {
      const preferencesCollection = database.get<UserPreference>('user_preferences');
      for (const genre of genres) {
        await preferencesCollection.create((record) => {
          record.category = 'genre';
          record.type = 'favorite';
          record.value = genre;
          record.normalized = genre.toLowerCase();
          record.isPendingSync = true;
          record.isDeleted = false;
        });
      }
    });
  }, []);

  const saveFavoriteFormats = useCallback(async (formats: BookFormat[]) => {
    if (formats.length === 0) return;

    await database.write(async () => {
      const preferencesCollection = database.get<UserPreference>('user_preferences');
      for (const format of formats) {
        await preferencesCollection.create((record) => {
          record.category = 'format';
          record.type = 'favorite';
          record.value = format;
          record.normalized = format.toLowerCase();
          record.isPendingSync = true;
          record.isDeleted = false;
        });
      }
    });
  }, []);

  const saveFavoriteAuthors = useCallback(async (authors: string[]) => {
    if (authors.length === 0) return;

    await database.write(async () => {
      const preferencesCollection = database.get<UserPreference>('user_preferences');
      for (const author of authors) {
        await preferencesCollection.create((record) => {
          record.category = 'author';
          record.type = 'favorite';
          record.value = author;
          record.normalized = author.toLowerCase();
          record.isPendingSync = true;
          record.isDeleted = false;
        });
      }
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setState((s) => ({ ...s, isCompleting: true }));

    try {
      if (state.selectedFormats.length > 0) {
        await saveFavoriteFormats(state.selectedFormats);
      }

      if (state.selectedGenres.length > 0) {
        await saveFavoriteGenres(state.selectedGenres);
      }

      if (state.selectedAuthors.length > 0) {
        await saveFavoriteAuthors(state.selectedAuthors);
      }

      if (state.yearlyGoal && state.yearlyGoal > 0) {
        await createYearlyGoal(state.yearlyGoal);
      }

      scheduleSyncAfterMutation();

      await apiClient('/user/onboarding-complete', { method: 'POST' });

      setOnboardingComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.danger('Failed to save your preferences. Please try again.');
      setState((s) => ({ ...s, isCompleting: false }));
    }
  }, [
    state.selectedFormats,
    state.selectedGenres,
    state.selectedAuthors,
    state.yearlyGoal,
    saveFavoriteFormats,
    saveFavoriteGenres,
    saveFavoriteAuthors,
    createYearlyGoal,
    setOnboardingComplete,
    toast,
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
    nextStep,
    prevStep,
    goToStep,
    selectTheme,
    toggleFormat,
    toggleGenre,
    setYearlyGoal,
    addAuthor,
    removeAuthor,
    handlePreferencesNext,
    completeOnboarding,
  };
}
