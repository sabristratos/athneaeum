import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLibrary } from '@/hooks/useBooks';
import {
  useTierListTiers,
  useTierListActions,
  useTierListIsGenerated,
} from '@/stores/tierListStore';
import { useTags } from '@/stores/tagStore';
import { useToast } from '@/stores/toastStore';
import type { TierName } from '@/types/tierList';

export interface FilterOption {
  id: string;
  label: string;
  type: 'tag' | 'genre';
}

export function useTierListController() {
  const { books: allBooks, loading, fetchLibrary } = useLibrary();
  const allTags = useTags();
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const books = useMemo(
    () => allBooks.filter((b) => b.status === 'read'),
    [allBooks]
  );

  const availableFilters = useMemo(() => {
    const filters: FilterOption[] = [];
    const genreSet = new Set<string>();
    const tagIds = new Set<number>();

    books.forEach((b) => {
      b.book.genres?.forEach((g) => genreSet.add(g.name));
      b.tags?.forEach((t) => tagIds.add(t.id));
    });

    Array.from(genreSet)
      .sort()
      .forEach((genre) => {
        filters.push({
          id: `genre:${genre}`,
          label: genre,
          type: 'genre',
        });
      });

    allTags
      .filter((t) => tagIds.has(t.id))
      .forEach((tag) => {
        filters.push({
          id: `tag:${tag.id}`,
          label: tag.name,
          type: 'tag',
        });
      });

    return filters;
  }, [books, allTags]);

  const filteredBooks = useMemo(() => {
    if (selectedFilters.length === 0) return books;

    const selectedGenres = selectedFilters
      .filter((f) => f.startsWith('genre:'))
      .map((f) => f.replace('genre:', ''));
    const selectedTagIds = selectedFilters
      .filter((f) => f.startsWith('tag:'))
      .map((f) => parseInt(f.replace('tag:', ''), 10));

    return books.filter((b) => {
      const bookGenres = new Set(b.book.genres?.map((g) => g.name) ?? []);
      const bookTagIds = new Set(b.tags?.map((t) => t.id) ?? []);

      const matchesGenre = selectedGenres.some((g) => bookGenres.has(g));
      const matchesTag = selectedTagIds.some((id) => bookTagIds.has(id));

      return matchesGenre || matchesTag;
    });
  }, [books, selectedFilters]);

  const tiers = useTierListTiers();
  const isGenerated = useTierListIsGenerated();
  const { generateFromRatings, moveBook, reorderWithinTier, removeBook, clear } =
    useTierListActions();
  const toast = useToast();
  const shareableRef = useRef<any>(null);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    if (!loading && filteredBooks.length > 0) {
      const ratedBooks = filteredBooks
        .filter((b) => b.rating && b.rating > 0)
        .map((b) => ({
          id: b.book.id,
          userBookId: b.id,
          title: b.book.title,
          author: b.book.author,
          coverUrl: b.book.cover_url,
          rating: b.rating!,
        }));

      generateFromRatings(ratedBooks);
    }
  }, [loading, filteredBooks, generateFromRatings]);

  useEffect(() => {
    return () => {
      clear();
    };
  }, [clear]);

  const handleMoveBook = useCallback(
    (bookId: number, fromTier: TierName, toTier: TierName) => {
      moveBook(bookId, fromTier, toTier);
    },
    [moveBook]
  );

  const handleReorder = useCallback(
    (tier: TierName, bookIds: number[]) => {
      reorderWithinTier(tier, bookIds);
    },
    [reorderWithinTier]
  );

  const handleRemoveBook = useCallback(
    (bookId: number, fromTier: TierName) => {
      removeBook(bookId, fromTier);
      toast.info('Book removed from tier list');
    },
    [removeBook, toast]
  );

  const handleToggleFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  }, []);

  const handleClearFilters = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  const handleShare = useCallback(async () => {
    if (!shareableRef.current) {
      toast.danger('Unable to capture tier list');
      return;
    }

    try {
      const uri = await captureRef(shareableRef.current, {
        format: 'png',
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your tier list',
        });
      } else if (Platform.OS === 'web') {
        toast.info('Sharing is not available on web');
      } else {
        await Share.share({
          url: uri,
          title: 'My Book Tier List',
        });
      }
    } catch (error) {
      toast.danger('Failed to share tier list');
    }
  }, [toast]);

  const totalBooks = Object.values(tiers).reduce(
    (sum, tierBooks) => sum + tierBooks.length,
    0
  );

  return {
    tiers,
    isLoading: loading,
    isEmpty: totalBooks === 0,
    totalBooks,
    shareableRef,
    availableFilters,
    selectedFilters,
    handleMoveBook,
    handleReorder,
    handleRemoveBook,
    handleToggleFilter,
    handleClearFilters,
    handleShare,
  };
}
