/**
 * TanStack Query Hooks Index
 *
 * ARCHITECTURE: These hooks are for SERVER-ONLY data that:
 * - Comes from external APIs (Google Books, Open Library)
 * - Is computed by the backend (statistics, analytics)
 * - Is global catalog data (Series - shared across users)
 * - Is metadata/enum values (preference options, tag colors)
 *
 * USER DATA should use WatermelonDB hooks instead (offline-first):
 * - Library: useLibrary(), useAddToLibrary(), useRemoveFromLibrary()
 * - Sessions: useReadingSessions(), useLogSession()
 * - Tags: useTags(), useTagActions()
 * - Preferences: usePreferences(), usePreferenceActions()
 * - Goals: useGoals(), useGoalActions()
 * - Pin/Reorder: usePinBook(), useReorderBooks()
 * - Re-reads: useStartReread(), useReadThroughs()
 *
 * See @/database/hooks for WatermelonDB hooks.
 */

export {
  useBookSearchQuery,
  useInfiniteBookSearchQuery,
  useBookEditionsQuery,
} from './useBookSearch';

export { useLibraryExternalIdsQuery } from './useLibraryExternalIds';

export {
  useReadingStatsQuery,
  useHeatmapQuery,
  useFormatVelocityQuery,
  useMoodRingQuery,
  useDnfAnalyticsQuery,
  usePageEconomyQuery,
  useCalendarQuery,
} from './useReadingStats';

export {
  useSeriesQuery,
  useSeriesDetailQuery,
  useCreateSeriesMutation,
  useUpdateSeriesMutation,
  useDeleteSeriesMutation,
  useAssignBookToSeriesMutation,
  useRemoveBookFromSeriesMutation,
  useFindMatchingSeries,
  type SeriesMatch,
} from './useSeries';

export { usePreferenceOptionsQuery, useGenresQuery } from './usePreferences';

export {
  useLibraryAuthorsQuery,
  useAuthorSearchQuery,
  useAuthorDetailQuery,
  useAuthorWorksQuery,
  useLibraryAuthor,
} from './useAuthors';
