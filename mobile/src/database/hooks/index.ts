export {
  useLibrary,
  useUserBook,
  useAddToLibrary,
  useRemoveFromLibrary,
  useUpdateUserBook,
  type LibraryBook,
} from '@/database/hooks/useLibrary';

export {
  useReadingSessions,
  useLogSession,
  useDeleteSession,
  useSessionStats,
} from '@/database/hooks/useSessions';

export { useCustomCover } from '@/database/hooks/useCover';

export {
  useTags,
  useSystemTags,
  useUserTags,
  useTag,
  useTagActions,
  useTagsByIds,
} from '@/database/hooks/useTags';

export {
  usePreferences,
  useGroupedPreferences,
  useFavoriteAuthors,
  useExcludedAuthors,
  useFavoriteGenres,
  useExcludedGenres,
  usePreferenceActions,
  useHasPreference,
  type GroupedPreferences,
} from '@/database/hooks/usePreferences';

export {
  useGoals,
  useGoalsWithProgress,
  useGoal,
  useGoalWithProgress,
  useGoalActions,
  useGoalByType,
  type GoalProgress,
  type CreateGoalData,
} from '@/database/hooks/useGoals';
