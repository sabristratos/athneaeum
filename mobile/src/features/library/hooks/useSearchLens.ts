import { useState, useMemo, useCallback } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import type { UserBook } from '@/types';

interface SearchLensResult {
  isActive: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  openLens: () => void;
  closeLens: () => void;
  toggleLens: () => void;
  getMatchScore: (book: UserBook) => number;
  matchingCount: number;
  overlayOpacity: SharedValue<number>;
}

/**
 * Hook for managing the SearchLens state and matching logic.
 * Provides match scores for books based on search query.
 */
export function useSearchLens(books: UserBook[]): SearchLensResult {
  const [isActive, setIsActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const overlayOpacity = useSharedValue(0);

  // Open the lens overlay
  const openLens = useCallback(() => {
    setIsActive(true);
    overlayOpacity.value = withTiming(1, { duration: 200 });
  }, [overlayOpacity]);

  // Close the lens overlay
  const closeLens = useCallback(() => {
    overlayOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      setIsActive(false);
      setSearchQuery('');
    }, 200);
  }, [overlayOpacity]);

  // Toggle lens
  const toggleLens = useCallback(() => {
    if (isActive) {
      closeLens();
    } else {
      openLens();
    }
  }, [isActive, openLens, closeLens]);

  // Calculate match score for a book (0 = no match, 1 = full match)
  const getMatchScore = useCallback(
    (book: UserBook): number => {
      if (!searchQuery.trim()) {
        return 1; // All books visible when no search query
      }

      const query = searchQuery.toLowerCase().trim();
      const title = book.book.title.toLowerCase();
      const author = book.book.author.toLowerCase();

      // Exact title match
      if (title === query) return 1;

      // Title starts with query
      if (title.startsWith(query)) return 0.95;

      // Title contains query
      if (title.includes(query)) return 0.85;

      // Author exact match
      if (author === query) return 0.9;

      // Author starts with query
      if (author.startsWith(query)) return 0.8;

      // Author contains query
      if (author.includes(query)) return 0.7;

      // Check individual words
      const queryWords = query.split(/\s+/);
      const titleWords = title.split(/\s+/);
      const authorWords = author.split(/\s+/);

      let matchedWords = 0;
      for (const qWord of queryWords) {
        if (titleWords.some((w) => w.includes(qWord))) matchedWords++;
        else if (authorWords.some((w) => w.includes(qWord))) matchedWords += 0.5;
      }

      if (matchedWords > 0) {
        return Math.min(0.6, matchedWords * 0.2);
      }

      // No match
      return 0;
    },
    [searchQuery]
  );

  // Count matching books
  const matchingCount = useMemo(() => {
    if (!searchQuery.trim()) return books.length;
    return books.filter((book) => getMatchScore(book) > 0).length;
  }, [books, searchQuery, getMatchScore]);

  return {
    isActive,
    searchQuery,
    setSearchQuery,
    openLens,
    closeLens,
    toggleLens,
    getMatchScore,
    matchingCount,
    overlayOpacity,
  };
}
