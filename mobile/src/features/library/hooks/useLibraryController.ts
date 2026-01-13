import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLibrary } from '@/hooks/useBooks';
import { useToast } from '@/stores/toastStore';
import { useTags } from '@/database/hooks';
import { useMMKVString } from 'react-native-mmkv';
import { storage } from '@/lib/storage';
import type { UserBook, BookStatus, UpdateUserBookData } from '@/types';
import type { Tag as WatermelonTag } from '@/database/models/Tag';
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

export function useLibraryController(): LibraryControllerReturn {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LibraryRouteProp>();
  const toast = useToast();
  const { books, loading, error, fetchLibrary, updateBook, moveToEndOfList } = useLibrary();

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
