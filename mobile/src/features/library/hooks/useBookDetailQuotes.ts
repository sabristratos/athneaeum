import { useState, useCallback } from 'react';
import { useQuotes } from '@/hooks/useQuotes';
import type { Quote, QuoteMood } from '@/types';

interface ToastOptions {
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
  };
}

interface UseBookDetailQuotesOptions {
  userBookId: number;
  onShowError: (message: string) => void;
  onShowSuccess: (message: string, options?: ToastOptions) => void;
}

export function useBookDetailQuotes({
  userBookId,
  onShowError,
  onShowSuccess,
}: UseBookDetailQuotesOptions) {
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>();

  const { quotes, createQuote, editQuote, removeQuote } = useQuotes(userBookId);

  const handleSaveQuote = useCallback(
    async (data: { text: string; pageNumber?: number; mood?: QuoteMood; note?: string }) => {
      try {
        if (editingQuote) {
          await editQuote(editingQuote.id, data);
          onShowSuccess('Quote updated');
        } else {
          await createQuote(data);
          onShowSuccess('Quote saved');
        }
        setShowQuoteModal(false);
        setEditingQuote(undefined);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save quote';
        onShowError(message);
      }
    },
    [editingQuote, editQuote, createQuote, onShowSuccess, onShowError]
  );

  const handleDeleteQuote = useCallback(
    async (quoteId: string) => {
      const quoteToDelete = quotes.find((q) => q.id === quoteId);
      if (!quoteToDelete) return;

      try {
        await removeQuote(quoteId);
        onShowSuccess('Quote deleted', {
          action: {
            label: 'Undo',
            onPress: async () => {
              await createQuote({
                text: quoteToDelete.text,
                pageNumber: quoteToDelete.pageNumber,
                mood: quoteToDelete.mood,
                note: quoteToDelete.note,
              });
            },
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete quote';
        onShowError(message);
      }
    },
    [quotes, removeQuote, createQuote, onShowSuccess, onShowError]
  );

  const handleOpenQuoteModal = useCallback(() => {
    setEditingQuote(undefined);
    setShowQuoteModal(true);
  }, []);

  const handleOpenEditQuote = useCallback((quote: Quote) => {
    setEditingQuote(quote);
    setShowQuoteModal(true);
  }, []);

  const handleCloseQuoteModal = useCallback(() => {
    setShowQuoteModal(false);
    setEditingQuote(undefined);
  }, []);

  return {
    quotes,
    showQuoteModal,
    editingQuote,
    setEditingQuote,
    handleSaveQuote,
    handleDeleteQuote,
    handleOpenQuoteModal,
    handleOpenEditQuote,
    handleCloseQuoteModal,
  };
}
