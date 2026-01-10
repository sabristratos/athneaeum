import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

interface SpineColorEntry {
  color: string;
  extractedAt: number;
}

interface SpineColorState {
  colors: Record<string, SpineColorEntry>;
  setColor: (bookId: string, color: string) => void;
  getColor: (bookId: string) => string | null;
  hasColor: (bookId: string) => boolean;
  clearColor: (bookId: string) => void;
  clearStaleColors: (maxAge?: number) => void;
  clearAllColors: () => void;
}

// Cache colors for 7 days
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Zustand store for caching extracted spine colors.
 * Persisted to MMKV storage with automatic stale entry cleanup.
 */
export const useSpineColorStore = create<SpineColorState>()(
  persist(
    (set, get) => ({
      colors: {},

      setColor: (bookId, color) =>
        set((state) => ({
          colors: {
            ...state.colors,
            [bookId]: {
              color,
              extractedAt: Date.now(),
            },
          },
        })),

      getColor: (bookId) => {
        const entry = get().colors[bookId];
        if (!entry) return null;

        // Check if entry is stale
        if (Date.now() - entry.extractedAt > SEVEN_DAYS_MS) {
          return null;
        }

        return entry.color;
      },

      hasColor: (bookId) => {
        const entry = get().colors[bookId];
        if (!entry) return false;
        return Date.now() - entry.extractedAt <= SEVEN_DAYS_MS;
      },

      clearColor: (bookId) =>
        set((state) => {
          const { [bookId]: _, ...remaining } = state.colors;
          return { colors: remaining };
        }),

      clearStaleColors: (maxAge = SEVEN_DAYS_MS) =>
        set((state) => ({
          colors: Object.fromEntries(
            Object.entries(state.colors).filter(
              ([_, entry]) => Date.now() - entry.extractedAt < maxAge
            )
          ),
        })),

      clearAllColors: () => set({ colors: {} }),
    }),
    {
      name: 'athenaeum-spine-colors',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ colors: state.colors }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useSpineColor = (bookId: string) =>
  useSpineColorStore((state) => state.getColor(bookId));

export const useHasSpineColor = (bookId: string) =>
  useSpineColorStore((state) => state.hasColor(bookId));
