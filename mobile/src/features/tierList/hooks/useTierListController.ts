import { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import { Share, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useLibrary as useWatermelonLibrary, useTags, type LibraryBook } from '@/database/hooks';
import { syncWithServer } from '@/database/sync';
import {
  useTierListTiers,
  useTierListActions,
  useTierListIsGenerated,
} from '@/stores/tierListStore';
import { useToast } from '@/stores/toastStore';
import type { UserBook, BookFormat } from '@/types';
import type { TierName } from '@/types/tierList';

export interface FilterOption {
  id: string;
  label: string;
  type: 'tag' | 'genre';
}

function convertToApiUserBook(lb: LibraryBook): UserBook {
  const { userBook: ub, book: b } = lb;
  const genres = b.genresJson ? JSON.parse(b.genresJson) : null;
  return {
    id: ub.serverId ?? 0,
    local_id: ub.id,
    book_id: b.serverId ?? 0,
    book: {
      id: b.serverId ?? 0,
      external_id: b.externalId,
      external_provider: b.externalProvider,
      series_id: b.serverSeriesId ?? null,
      volume_number: b.volumeNumber,
      volume_title: b.volumeTitle,
      title: b.title,
      author: b.author,
      cover_url: b.coverUrl,
      page_count: b.pageCount,
      height_cm: b.heightCm ?? null,
      width_cm: b.widthCm ?? null,
      thickness_cm: b.thicknessCm ?? null,
      isbn: b.isbn,
      description: b.description,
      genres: genres?.map((name: string, idx: number) => ({ id: idx, name, slug: name.toLowerCase().replace(/\s+/g, '-') })) ?? null,
      published_date: b.publishedDate,
      audience: null,
      audience_label: null,
      intensity: null,
      intensity_label: null,
      moods: null,
      is_classified: false,
      classification_confidence: null,
      created_at: '',
      updated_at: '',
    },
    status: ub.status,
    status_label: ub.status,
    format: ub.format as BookFormat | null,
    format_label: ub.format,
    rating: ub.rating,
    price: ub.price,
    current_page: ub.currentPage,
    progress_percentage: b.pageCount ? Math.round((ub.currentPage / b.pageCount) * 100) : null,
    is_dnf: ub.isDnf,
    dnf_reason: ub.dnfReason,
    is_pinned: ub.isPinned,
    queue_position: ub.queuePosition,
    review: ub.review,
    started_at: ub.startedAt?.toISOString() ?? null,
    finished_at: ub.finishedAt?.toISOString() ?? null,
    created_at: ub.createdAt?.toISOString() ?? '',
    updated_at: ub.updatedAt?.toISOString() ?? '',
  };
}

export function useTierListController() {
  const { books: libraryBooks, loading } = useWatermelonLibrary();
  const { tags: allTags } = useTags();
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const allBooks = useMemo(
    () => libraryBooks.map(convertToApiUserBook),
    [libraryBooks]
  );

  const books = useMemo(
    () => allBooks.filter((b) => b.status === 'read'),
    [allBooks]
  );

  const fetchLibrary = useCallback(async () => {
    await syncWithServer();
  }, []);

  const availableFilters = useMemo(() => {
    const filters: FilterOption[] = [];
    const genreSet = new Set<string>();
    const tagSlugs = new Set<string>();

    books.forEach((b) => {
      b.book.genres?.forEach((g) => genreSet.add(g.name));
      b.tags?.forEach((t) => tagSlugs.add(t.slug));
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
      .filter((t) => tagSlugs.has(t.slug))
      .forEach((tag) => {
        filters.push({
          id: `tag:${tag.slug}`,
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
    const selectedTagSlugs = selectedFilters
      .filter((f) => f.startsWith('tag:'))
      .map((f) => f.replace('tag:', ''));

    return books.filter((b) => {
      const bookGenres = new Set(b.book.genres?.map((g) => g.name) ?? []);
      const bookTagSlugs = new Set(b.tags?.map((t) => t.slug) ?? []);

      const matchesGenre = selectedGenres.some((g) => bookGenres.has(g));
      const matchesTag = selectedTagSlugs.some((slug) => bookTagSlugs.has(slug));

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
