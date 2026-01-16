import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useToast } from '@/stores/toastStore';
import {
  useLibrary as useWatermelonLibrary,
  useTags,
  useUpdateUserBook,
  useReorderBooks,
  type LibraryBook,
} from '@/database/hooks';
import { syncWithServer } from '@/database/sync';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/lib/storage';
import type { UserBook, BookStatus, UpdateUserBookData, BookFormat } from '@/types';
import type { Tag, TagFilterMode, TagColor } from '@/types/tag';
import type { MainStackParamList, MainTabParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;
type LibraryRouteProp = RouteProp<MainTabParamList, 'LibraryTab'>;

const FILTER_STORAGE_KEY = 'library_tag_filters';
const FILTER_MODE_STORAGE_KEY = 'library_tag_filter_mode';

export interface LibraryControllerState {
  activeTab: BookStatus | 'all';
  refreshing: boolean;
  books: UserBook[] | undefined;
  loading: boolean;
  error: string | null;
  genreFilter: string | null;
}

export interface LibraryControllerActions {
  setActiveTab: (tab: BookStatus | 'all') => void;
  onRefresh: () => Promise<void>;
  handleBookPress: (book: UserBook) => void;
  handleSeriesPress: (seriesId: number) => void;
  fetchLibrary: () => Promise<void>;
  updateBook: (id: number, data: UpdateUserBookData) => Promise<UserBook | null>;
  moveToEndOfList: (id: number) => void;
  toggleTagFilter: (tagId: string) => void;
  clearTagFilters: () => void;
  toggleFilterMode: () => void;
  navigateToTagManagement: () => void;
  clearGenreFilter: () => void;
}

export interface LibraryControllerComputed {
  filteredBooks: UserBook[];
  getTabCount: (key: BookStatus | 'all') => number;
  tags: Tag[];
  selectedTagFilters: string[];
  filterMode: TagFilterMode;
  filteredCount: number;
  totalCount: number;
  genreFilterName: string | null;
}

export interface LibraryControllerReturn
  extends LibraryControllerState,
    LibraryControllerActions,
    LibraryControllerComputed {}

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

export function useLibraryController(): LibraryControllerReturn {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LibraryRouteProp>();
  const toast = useToast();
  const { books: libraryBooks, loading } = useWatermelonLibrary();
  const { updateStatus, updateRating, updateProgress } = useUpdateUserBook();
  const { reorderBooks } = useReorderBooks();

  const books: UserBook[] = useMemo(() => {
    return libraryBooks.map(convertToApiUserBook);
  }, [libraryBooks]);

  const error: string | null = null;

  const fetchLibrary = useCallback(async () => {
    await syncWithServer();
  }, []);

  const updateBook = useCallback(
    async (id: number, data: UpdateUserBookData): Promise<UserBook | null> => {
      const localBook = libraryBooks.find((lb) => lb.userBook.serverId === id);
      if (!localBook) return null;

      const localId = localBook.userBook.id;

      if (data.status) {
        await updateStatus(localId, data.status);
      }
      if (data.rating !== undefined) {
        await updateRating(localId, data.rating);
      }
      if (data.current_page !== undefined) {
        await updateProgress(localId, data.current_page);
      }

      return convertToApiUserBook(localBook);
    },
    [libraryBooks, updateStatus, updateRating, updateProgress]
  );

  const moveToEndOfList = useCallback(
    (id: number) => {
      const localBook = libraryBooks.find((lb) => lb.userBook.serverId === id);
      if (!localBook) return;

      const wantToReadBooks = libraryBooks
        .filter((lb) => lb.userBook.status === 'want_to_read')
        .map((lb) => lb.userBook.id);

      const currentIndex = wantToReadBooks.indexOf(localBook.userBook.id);
      if (currentIndex > -1) {
        wantToReadBooks.splice(currentIndex, 1);
        wantToReadBooks.push(localBook.userBook.id);
        reorderBooks(wantToReadBooks);
      }
    },
    [libraryBooks, reorderBooks]
  );

  const { tags: watermelonTags } = useTags();

  const tags: Tag[] = useMemo(() => {
    return watermelonTags
      .filter((t) => t.serverId !== null)
      .map((t) => ({
        id: t.serverId!,
        name: t.name,
        slug: t.slug,
        color: t.color as TagColor,
        color_label: t.color,
        is_system: t.isSystem,
        sort_order: t.sortOrder,
        books_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
  }, [watermelonTags]);

  const [storedFilters, setStoredFilters] = useMMKVString(FILTER_STORAGE_KEY, storage ?? undefined);
  const [storedFilterMode, setStoredFilterMode] = useMMKVString(FILTER_MODE_STORAGE_KEY, storage ?? undefined);

  const selectedTagFilters: string[] = useMemo(() => {
    if (!storedFilters) return [];
    try {
      return JSON.parse(storedFilters);
    } catch {
      return [];
    }
  }, [storedFilters]);

  const filterMode: TagFilterMode = (storedFilterMode as TagFilterMode) || 'any';

  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [genreFilter, setGenreFilter] = useState<string | null>(route.params?.genreSlug ?? null);

  useEffect(() => {
    if (route.params?.genreSlug) {
      setGenreFilter(route.params.genreSlug);
    }
  }, [route.params?.genreSlug]);

  const toggleTagFilter = useCallback((tagId: string) => {
    const current = selectedTagFilters;
    let updated: string[];
    if (current.includes(tagId)) {
      updated = current.filter((id) => id !== tagId);
    } else {
      updated = [...current, tagId];
    }
    setStoredFilters(JSON.stringify(updated));
  }, [selectedTagFilters, setStoredFilters]);

  const clearTagFilters = useCallback(() => {
    setStoredFilters(JSON.stringify([]));
  }, [setStoredFilters]);

  const setFilterMode = useCallback((mode: TagFilterMode) => {
    setStoredFilterMode(mode);
  }, [setStoredFilterMode]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLibrary();
    } catch {
      toast.danger('Failed to refresh library');
    }
    setRefreshing(false);
  }, [fetchLibrary, toast]);

  const navigateToTagManagement = useCallback(() => {
    navigation.navigate('TagManagement');
  }, [navigation]);

  const toggleFilterMode = useCallback(() => {
    setFilterMode(filterMode === 'any' ? 'all' : 'any');
  }, [filterMode, setFilterMode]);

  const tabCounts = useMemo(() => {
    const counts: Record<BookStatus | 'all', number> = {
      all: 0,
      reading: 0,
      want_to_read: 0,
      read: 0,
      dnf: 0,
    };
    (books ?? []).forEach((b) => {
      counts.all++;
      counts[b.status]++;
    });
    return counts;
  }, [books]);

  const filteredBooks = useMemo(() => {
    let bookList = books ?? [];

    if (activeTab !== 'all') {
      bookList = bookList.filter((b) => b.status === activeTab);
    }

    if (selectedTagFilters.length > 0) {
      bookList = bookList.filter((b) => {
        const bookTagSlugs = b.tags?.map((t) => t.slug) ?? [];
        if (filterMode === 'any') {
          return selectedTagFilters.some((slug) => bookTagSlugs.includes(slug));
        } else {
          return selectedTagFilters.every((slug) => bookTagSlugs.includes(slug));
        }
      });
    }

    if (genreFilter) {
      bookList = bookList.filter((b) => {
        const bookGenreSlugs = b.book.genres?.map((g) => g.slug) ?? [];
        return bookGenreSlugs.includes(genreFilter);
      });
    }

    return bookList;
  }, [books, activeTab, selectedTagFilters, filterMode, genreFilter]);

  const genreFilterName = useMemo(() => {
    if (!genreFilter || !books) return null;
    for (const userBook of books) {
      const genre = userBook.book.genres?.find((g) => g.slug === genreFilter);
      if (genre) return genre.name;
    }
    return genreFilter.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }, [genreFilter, books]);

  const clearGenreFilter = useCallback(() => {
    setGenreFilter(null);
    navigation.setParams({ genreSlug: undefined });
  }, [navigation]);

  const handleBookPress = useCallback(
    (book: UserBook) => {
      navigation.navigate('BookDetail', { userBook: book });
    },
    [navigation]
  );

  const handleSeriesPress = useCallback(
    (seriesId: number) => {
      const bookInSeries = (books ?? []).find((b) => b.book.series_id === seriesId);
      const seriesTitle = bookInSeries?.book.series?.title ?? 'Series';
      navigation.navigate('SeriesDetail', { seriesId, seriesTitle });
    },
    [books, navigation]
  );

  const getTabCount = useCallback(
    (key: BookStatus | 'all') => tabCounts[key],
    [tabCounts]
  );

  const totalCount = tabCounts[activeTab];
  const filteredCount = filteredBooks.length;

  return {
    activeTab,
    refreshing,
    books,
    loading,
    error,
    setActiveTab,
    onRefresh,
    handleBookPress,
    handleSeriesPress,
    fetchLibrary,
    updateBook,
    moveToEndOfList,
    filteredBooks,
    getTabCount,
    tags,
    selectedTagFilters,
    filterMode,
    toggleTagFilter,
    clearTagFilters,
    toggleFilterMode,
    navigateToTagManagement,
    filteredCount,
    totalCount,
    genreFilter,
    genreFilterName,
    clearGenreFilter,
  };
}
