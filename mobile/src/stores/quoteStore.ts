import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';
import type { Quote, QuoteMood } from '@/types/quote';

interface QuoteStore {
  quotes: Quote[];
  isHydrated: boolean;
  setHydrated: (hydrated: boolean) => void;
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt'>) => Quote;
  updateQuote: (id: string, data: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  getQuotesForBook: (userBookId: number) => Quote[];
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useQuoteStore = create<QuoteStore>()(
  persist(
    (set, get) => ({
      quotes: [],
      isHydrated: false,
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),

      addQuote: (quoteData) => {
        const newQuote: Quote = {
          ...quoteData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ quotes: [newQuote, ...state.quotes] }));
        return newQuote;
      },

      updateQuote: (id, data) => {
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...data } : q
          ),
        }));
      },

      deleteQuote: (id) => {
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
        }));
      },

      getQuotesForBook: (userBookId) => {
        return get().quotes.filter((q) => q.userBookId === userBookId);
      },
    }),
    {
      name: 'athenaeum-quotes',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ quotes: state.quotes }),
    }
  )
);
