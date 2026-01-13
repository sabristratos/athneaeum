import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';

const MAX_RECENT_SEARCHES = 10;

interface RecentSearchesStore {
  searches: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearSearches: () => void;
}

export const useRecentSearchesStore = create<RecentSearchesStore>()(
  persist(
    (set, get) => ({
      searches: [],

      addSearch: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed || trimmed.length < 2) return;

        const current = get().searches;
        const filtered = current.filter(
          (s) => s.toLowerCase() !== trimmed.toLowerCase()
        );
        const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
        set({ searches: updated });
      },

      removeSearch: (query: string) => {
        set({
          searches: get().searches.filter(
            (s) => s.toLowerCase() !== query.toLowerCase()
          ),
        });
      },

      clearSearches: () => set({ searches: [] }),
    }),
    {
      name: 'athenaeum-recent-searches',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({ searches: state.searches }),
    }
  )
);

export const useRecentSearches = () =>
  useRecentSearchesStore((state) => state?.searches ?? []);

export const useRecentSearchActions = () =>
  useRecentSearchesStore(
    useShallow((state) => ({
      addSearch: state?.addSearch ?? (() => {}),
      removeSearch: state?.removeSearch ?? (() => {}),
      clearSearches: state?.clearSearches ?? (() => {}),
    }))
  );
