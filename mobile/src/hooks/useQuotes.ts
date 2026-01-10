import { useCallback, useMemo } from 'react';
import { useQuoteStore } from '@/stores/quoteStore';
import type { Quote, QuoteMood } from '@/types/quote';

export function useQuotes(userBookId: number) {
  const { quotes, addQuote, updateQuote, deleteQuote } = useQuoteStore();

  const bookQuotes = useMemo(
    () => quotes.filter((q) => q.userBookId === userBookId),
    [quotes, userBookId]
  );

  const createQuote = useCallback(
    (data: { text: string; pageNumber?: number; note?: string; mood?: QuoteMood }) => {
      return addQuote({
        userBookId,
        ...data,
      });
    },
    [userBookId, addQuote]
  );

  const editQuote = useCallback(
    (id: string, data: Partial<Quote>) => {
      updateQuote(id, data);
    },
    [updateQuote]
  );

  const removeQuote = useCallback(
    (id: string) => {
      deleteQuote(id);
    },
    [deleteQuote]
  );

  return {
    quotes: bookQuotes,
    createQuote,
    editQuote,
    removeQuote,
  };
}
