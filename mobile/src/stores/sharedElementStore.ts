import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Hero cover dimensions - must match CoverImage 'lg' size from CoverImage.tsx sizeMap
// (coverSizes.lg.width + sharedSpacing.md + sharedSpacing.xs = 100 + 16 + 4 = 120)
// (coverSizes.lg.height + 30 = 150 + 30 = 180)
export const HERO_COVER = {
  width: 120,
  height: 180,
};

interface SharedElementState {
  /** Whether a transition is currently in progress */
  isTransitioning: boolean;
  /** Direction of the current transition */
  direction: 'forward' | 'backward' | null;
  /** Source element position for the current transition */
  sourcePosition: ElementPosition | null;
  /** Target element position for the current transition */
  targetPosition: ElementPosition | null;
  /** Cover URI being transitioned */
  coverUri: string | null;
  /** ID of the UserBook being transitioned */
  userBookId: number | null;
  /** Cached positions of list items (for back navigation) */
  listItemPositions: Record<number, ElementPosition>;

  /** Start a forward transition (list → detail) */
  startForwardTransition: (
    source: ElementPosition,
    target: ElementPosition,
    coverUri: string,
    userBookId: number
  ) => void;
  /** Start a backward transition (detail → list) */
  startBackwardTransition: (
    source: ElementPosition,
    coverUri: string,
    userBookId: number
  ) => void;
  /** Complete the current transition */
  completeTransition: () => void;
  /** Register a list item's position (for back navigation) */
  registerListItemPosition: (userBookId: number, position: ElementPosition) => void;
  /** Unregister a list item's position */
  unregisterListItemPosition: (userBookId: number) => void;
}

export const useSharedElementStore = create<SharedElementState>((set, get) => ({
  isTransitioning: false,
  direction: null,
  sourcePosition: null,
  targetPosition: null,
  coverUri: null,
  userBookId: null,
  listItemPositions: {},

  startForwardTransition: (source, target, coverUri, userBookId) =>
    set({
      isTransitioning: true,
      direction: 'forward',
      sourcePosition: source,
      targetPosition: target,
      coverUri,
      userBookId,
    }),

  startBackwardTransition: (source, coverUri, userBookId) => {
    const { listItemPositions } = get();
    const target = listItemPositions[userBookId];

    if (!target) {
      // No cached position, skip animation
      return;
    }

    set({
      isTransitioning: true,
      direction: 'backward',
      sourcePosition: source,
      targetPosition: target,
      coverUri,
      userBookId,
    });
  },

  completeTransition: () =>
    set({
      isTransitioning: false,
      direction: null,
      sourcePosition: null,
      targetPosition: null,
      coverUri: null,
      userBookId: null,
    }),

  registerListItemPosition: (userBookId, position) =>
    set((state) => ({
      listItemPositions: {
        ...state.listItemPositions,
        [userBookId]: position,
      },
    })),

  unregisterListItemPosition: (userBookId) =>
    set((state) => {
      const { [userBookId]: _, ...rest } = state.listItemPositions;
      return { listItemPositions: rest };
    }),
}));

export const useSharedElementActions = () =>
  useSharedElementStore(
    useShallow((state) => ({
      startForwardTransition: state.startForwardTransition,
      startBackwardTransition: state.startBackwardTransition,
      completeTransition: state.completeTransition,
      registerListItemPosition: state.registerListItemPosition,
      unregisterListItemPosition: state.unregisterListItemPosition,
    }))
  );

export const useSharedElementTransition = () =>
  useSharedElementStore(
    useShallow((state) => ({
      isTransitioning: state.isTransitioning,
      direction: state.direction,
      sourcePosition: state.sourcePosition,
      targetPosition: state.targetPosition,
      coverUri: state.coverUri,
      userBookId: state.userBookId,
    }))
  );

export const useIsTransitioning = () =>
  useSharedElementStore((state) => state.isTransitioning);
