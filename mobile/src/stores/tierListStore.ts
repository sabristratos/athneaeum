import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  type TierName,
  type TierListBook,
  type TierListState,
  getTierForRating,
  TIER_DEFINITIONS,
} from '@/types/tierList';

interface TierListStore {
  tiers: TierListState;
  isGenerated: boolean;

  generateFromRatings: (
    books: Array<{
      id: number;
      userBookId: number;
      title: string;
      author: string;
      coverUrl: string | null;
      rating: number;
    }>
  ) => void;

  moveBook: (bookId: number, fromTier: TierName, toTier: TierName) => void;

  reorderWithinTier: (tier: TierName, bookIds: number[]) => void;

  removeBook: (bookId: number, fromTier: TierName) => void;

  clear: () => void;
}

const createEmptyTiers = (): TierListState => ({
  masterpiece: [],
  great: [],
  good: [],
  okay: [],
  meh: [],
  skip: [],
});

export const useTierListStore = create<TierListStore>()((set, get) => ({
  tiers: createEmptyTiers(),
  isGenerated: false,

  generateFromRatings: (books) => {
    const newTiers = createEmptyTiers();

    for (const book of books) {
      if (book.rating <= 0) continue;

      const tierName = getTierForRating(book.rating);
      const tierBook: TierListBook = {
        id: book.id,
        userBookId: book.userBookId,
        title: book.title,
        author: book.author,
        coverUrl: book.coverUrl,
        originalRating: book.rating,
      };

      newTiers[tierName].push(tierBook);
    }

    for (const tier of TIER_DEFINITIONS) {
      newTiers[tier.id].sort((a, b) => b.originalRating - a.originalRating);
    }

    set({ tiers: newTiers, isGenerated: true });
  },

  moveBook: (bookId, fromTier, toTier) => {
    if (fromTier === toTier) return;

    const { tiers } = get();
    const bookIndex = tiers[fromTier].findIndex((b) => b.id === bookId);

    if (bookIndex === -1) return;

    const book = tiers[fromTier][bookIndex];
    const newFromTier = tiers[fromTier].filter((b) => b.id !== bookId);
    const newToTier = [...tiers[toTier], book];

    set({
      tiers: {
        ...tiers,
        [fromTier]: newFromTier,
        [toTier]: newToTier,
      },
    });
  },

  reorderWithinTier: (tier, bookIds) => {
    const { tiers } = get();
    const currentBooks = tiers[tier];

    const bookMap = new Map(currentBooks.map((b) => [b.id, b]));
    const reorderedBooks = bookIds
      .map((id) => bookMap.get(id))
      .filter((b): b is TierListBook => b !== undefined);

    set({
      tiers: {
        ...tiers,
        [tier]: reorderedBooks,
      },
    });
  },

  removeBook: (bookId, fromTier) => {
    const { tiers } = get();
    const newTierBooks = tiers[fromTier].filter((b) => b.id !== bookId);

    set({
      tiers: {
        ...tiers,
        [fromTier]: newTierBooks,
      },
    });
  },

  clear: () => {
    set({ tiers: createEmptyTiers(), isGenerated: false });
  },
}));

export const useTierListTiers = () =>
  useTierListStore((state) => state.tiers);

export const useTierListActions = () =>
  useTierListStore(
    useShallow((state) => ({
      generateFromRatings: state.generateFromRatings,
      moveBook: state.moveBook,
      reorderWithinTier: state.reorderWithinTier,
      removeBook: state.removeBook,
      clear: state.clear,
    }))
  );

export const useTierListIsGenerated = () =>
  useTierListStore((state) => state.isGenerated);
