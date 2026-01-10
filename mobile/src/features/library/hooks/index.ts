export { useLibraryController } from '@/features/library/hooks/useLibraryController';
export { useBookDetailController } from '@/features/library/hooks/useBookDetailController';
export { useSearchLens } from '@/features/library/hooks/useSearchLens';

export type {
  LibraryControllerState,
  LibraryControllerActions,
  LibraryControllerComputed,
  LibraryControllerReturn,
} from '@/features/library/hooks/useLibraryController';

export type {
  BookDetailControllerState,
  BookDetailControllerActions,
  BookDetailControllerComputed,
  BookDetailControllerScrollAnimations,
  BookDetailControllerReturn,
} from '@/features/library/hooks/useBookDetailController';
