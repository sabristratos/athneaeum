import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useSimilarBooksQuery, useRecordSignalsMutation } from '@/queries/useDiscovery';
import { useLibraryExternalIdsQuery } from '@/queries/useLibraryExternalIds';
import { useAddToLibrary } from '@/database/hooks';
import { useToast } from '@/stores/toastStore';
import type { CatalogBook } from '@/types/discovery';

interface UseCatalogBookDetailControllerProps {
  catalogBook: CatalogBook;
}

/**
 * Controller hook for the CatalogBookDetail screen.
 *
 * Handles:
 * - Fetching similar books
 * - Adding book to user's library (with duplicate check)
 * - Recording user signals (view, click, add_to_library)
 */
export function useCatalogBookDetailController({ catalogBook }: UseCatalogBookDetailControllerProps) {
  const toast = useToast();
  const { addBook, loading: isAdding } = useAddToLibrary();
  const recordSignals = useRecordSignalsMutation();
  const hasRecordedView = useRef(false);

  console.log('[CatalogBookDetailController] Initializing for book', {
    id: catalogBook.id,
    title: catalogBook.title,
    author: catalogBook.author,
    hasEmbedding: catalogBook.has_embedding,
    genreCount: catalogBook.genres?.length ?? 0,
  });

  const { data: libraryExternalIds } = useLibraryExternalIdsQuery();

  const {
    data: similarBooksResponse,
    isLoading: isSimilarLoading,
    error: similarError,
  } = useSimilarBooksQuery(catalogBook.id);

  console.log('[CatalogBookDetailController] Similar books state', {
    catalogBookId: catalogBook.id,
    isLoading: isSimilarLoading,
    hasError: !!similarError,
    errorMessage: similarError?.message,
    responseData: similarBooksResponse,
    bookCount: similarBooksResponse?.data?.length ?? 0,
  });

  const similarBooks = useMemo(() => {
    const books = similarBooksResponse?.data ?? [];
    console.log('[CatalogBookDetailController] similarBooks memo', {
      catalogBookId: catalogBook.id,
      count: books.length,
      firstThree: books.slice(0, 3).map((b) => ({ id: b.id, title: b.title })),
    });
    return books;
  }, [similarBooksResponse, catalogBook.id]);

  const bookExternalId = catalogBook.isbn13 || `catalog-${catalogBook.id}`;
  const isInLibrary = useMemo(() => {
    if (!libraryExternalIds) return false;
    return bookExternalId in libraryExternalIds;
  }, [libraryExternalIds, bookExternalId]);

  useEffect(() => {
    if (hasRecordedView.current) return;
    hasRecordedView.current = true;

    recordSignals.mutate([
      {
        book_id: catalogBook.id,
        type: 'view',
        timestamp: Date.now(),
      },
    ]);
  }, [catalogBook.id, recordSignals]);

  const handleAddToLibrary = useCallback(async () => {
    if (isInLibrary) {
      toast.info('Already in your library');
      return false;
    }

    try {
      await addBook({
        externalId: bookExternalId,
        externalProvider: 'catalog',
        title: catalogBook.title,
        author: catalogBook.author ?? 'Unknown Author',
        coverUrl: catalogBook.cover_url ?? undefined,
        pageCount: catalogBook.page_count ?? undefined,
        description: catalogBook.description,
        publishedDate: catalogBook.published_date ?? undefined,
        genres: catalogBook.genres,
      });

      recordSignals.mutate([
        {
          book_id: catalogBook.id,
          type: 'add_to_library',
          timestamp: Date.now(),
        },
      ]);

      toast.success('Added to library');
      return true;
    } catch (error) {
      toast.danger('Failed to add book');
      return false;
    }
  }, [catalogBook, bookExternalId, isInLibrary, addBook, recordSignals, toast]);

  const handleSimilarBookClick = useCallback(
    (book: CatalogBook) => {
      recordSignals.mutate([
        {
          book_id: book.id,
          type: 'click',
          timestamp: Date.now(),
        },
      ]);
    },
    [recordSignals]
  );

  return {
    book: catalogBook,
    similarBooks,
    isSimilarLoading,
    similarError: similarError as Error | null,
    isAdding,
    isInLibrary,
    handleAddToLibrary,
    handleSimilarBookClick,
  };
}
