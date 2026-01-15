import { useEffect, useState, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import type { Subscription } from 'rxjs';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation, syncWithServer } from '@/database/sync';
import type { UserBook } from '@/database/models/UserBook';
import type { Book } from '@/database/models/Book';
import type { BookStatus } from '@/types/book';
import { useToastStore } from '@/stores/toastStore';

export interface LibraryBook {
  userBook: UserBook;
  book: Book;
}

export function useLibrary(status?: BookStatus) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userBooksCollection = database.get<UserBook>('user_books');

    const query = status
      ? userBooksCollection.query(
          Q.where('status', status),
          Q.where('is_deleted', false)
        )
      : userBooksCollection.query(Q.where('is_deleted', false));

    const subscription = query.observe().subscribe(async (userBooks) => {
      if (userBooks.length === 0) {
        setBooks([]);
        setLoading(false);
        return;
      }

      // Batch fetch all books in a single query instead of N+1 queries
      const bookIds = userBooks.map((ub) => ub.bookId);
      const books = await database
        .get<Book>('books')
        .query(Q.where('id', Q.oneOf(bookIds)), Q.where('is_deleted', false))
        .fetch();

      // Create lookup map for O(1) access
      const bookMap = new Map(books.map((b) => [b.id, b]));

      // Join user_books with books
      const libraryBooks = userBooks
        .map((userBook) => {
          const book = bookMap.get(userBook.bookId);
          return book ? { userBook, book } : null;
        })
        .filter((lb): lb is LibraryBook => lb !== null);

      setBooks(libraryBooks);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [status]);

  return { books, loading };
}

export function useUserBook(userBookId: string) {
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let bookSubscription: Subscription | undefined;

    const userBookSubscription = database
      .get<UserBook>('user_books')
      .findAndObserve(userBookId)
      .subscribe({
        next: async (ub) => {
          setUserBook(ub);

          // Subscribe to the book
          if (bookSubscription) {
            bookSubscription.unsubscribe();
          }

          bookSubscription = database
            .get<Book>('books')
            .findAndObserve(ub.bookId)
            .subscribe({
              next: (b) => {
                setBook(b);
                setLoading(false);
              },
              error: () => {
                setLoading(false);
              },
            });
        },
        error: () => {
          setLoading(false);
        },
      });

    return () => {
      userBookSubscription.unsubscribe();
      if (bookSubscription) {
        bookSubscription.unsubscribe();
      }
    };
  }, [userBookId]);

  return { userBook, book, loading };
}

interface AddToLibraryData {
  externalId: string;
  externalProvider?: string;
  title: string;
  author: string;
  coverUrl?: string;
  pageCount?: number;
  isbn?: string;
  description?: string;
  genres?: string[];
  publishedDate?: string;
}

export function useAddToLibrary() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBook = useCallback(
    async (bookData: AddToLibraryData, status: BookStatus = 'want_to_read') => {
      setLoading(true);
      setError(null);

      let userBookId: string | null = null;
      let createdBookId: string | null = null;
      let bookWasNew = false;

      try {
        await database.write(async () => {
          const booksCollection = database.get<Book>('books');
          const userBooksCollection = database.get<UserBook>('user_books');

          const existingBooks = await booksCollection
            .query(Q.where('external_id', bookData.externalId))
            .fetch();

          let book: Book;

          if (existingBooks.length > 0) {
            book = existingBooks[0];
          } else {
            bookWasNew = true;
            book = await booksCollection.create((record) => {
              record.externalId = bookData.externalId;
              record.externalProvider =
                bookData.externalProvider || 'google_books';
              record.title = bookData.title;
              record.author = bookData.author;
              record.coverUrl = bookData.coverUrl || null;
              record.pageCount = bookData.pageCount || null;
              record.isbn = bookData.isbn || null;
              record.description = bookData.description || null;
              record.genresJson = JSON.stringify(bookData.genres || []);
              record.publishedDate = bookData.publishedDate || null;
              record.isPendingSync = true;
              record.isDeleted = false;
            });
          }

          createdBookId = book.id;

          const existingUserBooks = await userBooksCollection
            .query(Q.where('book_id', book.id), Q.where('is_deleted', false))
            .fetch();

          if (existingUserBooks.length > 0) {
            throw new Error('Book already in library');
          }

          const userBook = await userBooksCollection.create((record) => {
            record.bookId = book.id;
            record.status = status;
            record.currentPage = 0;
            record.isDnf = false;
            record.isPendingSync = true;
            record.pendingCoverUpload = false;
            record.isDeleted = false;
            if (status === 'reading') {
              record.startedAt = new Date();
            }
          });

          userBookId = userBook.id;
        });

        const syncResult = await syncWithServer();

        if (syncResult.status === 'error') {
          await rollbackAddition(userBookId, createdBookId, bookWasNew);
          useToastStore.getState().addToast({
            message: 'Failed to add book. Please try again.',
            variant: 'danger',
          });
          throw new Error(syncResult.error || 'Sync failed');
        }

        // If book has a description, it will be classified by the backend.
        // Schedule a delayed sync to pick up classification results.
        if (bookData.description && bookWasNew) {
          setTimeout(() => {
            syncWithServer();
          }, 12000); // 12 seconds - enough time for classification job to complete
        }

        return userBookId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add book';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { addBook, loading, error };
}

async function rollbackAddition(
  userBookId: string | null,
  bookId: string | null,
  bookWasNew: boolean
): Promise<void> {
  await database.write(async () => {
    if (userBookId) {
      try {
        const userBook = await database
          .get<UserBook>('user_books')
          .find(userBookId);
        await userBook.destroyPermanently();
      } catch {
        // Record may already be deleted
      }
    }

    if (bookId && bookWasNew) {
      try {
        const book = await database.get<Book>('books').find(bookId);
        await book.destroyPermanently();
      } catch {
        // Record may already be deleted
      }
    }
  });
}

export function useRemoveFromLibrary() {
  const [loading, setLoading] = useState(false);

  const removeBook = useCallback(async (userBookId: string) => {
    setLoading(true);

    try {
      await database.write(async () => {
        const userBook = await database
          .get<UserBook>('user_books')
          .find(userBookId);
        await userBook.softDelete();
      });

      scheduleSyncAfterMutation();
    } finally {
      setLoading(false);
    }
  }, []);

  return { removeBook, loading };
}

export function useUpdateUserBook() {
  const updateStatus = useCallback(
    async (userBookId: string, status: BookStatus) => {
      await database.write(async () => {
        const userBook = await database
          .get<UserBook>('user_books')
          .find(userBookId);
        await userBook.updateStatus(status);
      });
      scheduleSyncAfterMutation();
    },
    []
  );

  const updateRating = useCallback(
    async (userBookId: string, rating: number | null) => {
      await database.write(async () => {
        const userBook = await database
          .get<UserBook>('user_books')
          .find(userBookId);
        await userBook.updateRating(rating);
      });
      scheduleSyncAfterMutation();
    },
    []
  );

  const updateProgress = useCallback(
    async (userBookId: string, page: number) => {
      await database.write(async () => {
        const userBook = await database
          .get<UserBook>('user_books')
          .find(userBookId);
        await userBook.updateProgress(page);
      });
      scheduleSyncAfterMutation();
    },
    []
  );

  return { updateStatus, updateRating, updateProgress };
}
