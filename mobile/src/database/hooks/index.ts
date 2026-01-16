export {
  useLibrary,
  useUserBook,
  useAddToLibrary,
  useRemoveFromLibrary,
  useUpdateUserBook,
  usePinBook,
  useReorderBooks,
  useStartReread,
  useReadThroughs,
  useUpdateReadThroughRating,
  type LibraryBook,
} from '@/database/hooks/useLibrary';

export {
  useReadingSessions,
  useLogSession,
  useDeleteSession,
  useUpdateSession,
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
  useUpdateUserBookTags,
} from '@/database/hooks/useTags';

export {
  usePreferences,
  useGroupedPreferences,
  useFavoriteAuthors,
  useExcludedAuthors,
  useFavoriteGenres,
  useExcludedGenres,
  usePreferenceActions,
  useTogglePreference,
  useHasPreference,
  useSetPreferenceState,
  usePreferenceState,
  usePreferenceItems,
  useCyclePreference,
  type GroupedPreferences,
  type PreferenceItem,
  type PreferenceState,
} from '@/database/hooks/usePreferences';

export {
  useFavoriteFormats,
  useFormatPreferenceActions,
  FORMAT_OPTIONS,
  type BookFormat,
} from '@/database/hooks/useFormatPreferences';

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
