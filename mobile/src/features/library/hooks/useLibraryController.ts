import { useState, useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLibrary } from '@/hooks/useBooks';
import type { UserBook, BookStatus, UpdateUserBookData } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export interface LibraryControllerState {
  activeTab: BookStatus | 'all';
  refreshing: boolean;
  books: UserBook[] | undefined;
  loading: boolean;
  error: string | null;
}

export interface LibraryControllerActions {
  setActiveTab: (tab: BookStatus | 'all') => void;
  onRefresh: () => Promise<void>;
  handleBookPress: (book: UserBook) => void;
  fetchLibrary: () => Promise<void>;
  updateBook: (id: number, data: UpdateUserBookData) => Promise<UserBook | null>;
  moveToEndOfList: (id: number) => void;
}

export interface LibraryControllerComputed {
  filteredBooks: UserBook[];
  getTabCount: (key: BookStatus | 'all') => number;
}

export interface LibraryControllerReturn
  extends LibraryControllerState,
    LibraryControllerActions,
    LibraryControllerComputed {}

export function useLibraryController(): LibraryControllerReturn {
  const navigation = useNavigation<NavigationProp>();
  const { books, loading, error, fetchLibrary, updateBook, moveToEndOfList } = useLibrary();

  const [activeTab, setActiveTab] = useState<BookStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLibrary();
    setRefreshing(false);
  }, [fetchLibrary]);

  // Compute all tab counts in a single pass (O(n) instead of O(n*m) for m tabs)
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
    const bookList = books ?? [];
    if (activeTab === 'all') {
      return bookList;
    }
    return bookList.filter((b) => b.status === activeTab);
  }, [books, activeTab]);

  const handleBookPress = useCallback(
    (book: UserBook) => {
      navigation.navigate('BookDetail', { userBook: book });
    },
    [navigation]
  );

  // Use pre-computed counts for O(1) lookup
  const getTabCount = useCallback(
    (key: BookStatus | 'all') => tabCounts[key],
    [tabCounts]
  );

  return {
    activeTab,
    refreshing,
    books,
    loading,
    error,
    setActiveTab,
    onRefresh,
    handleBookPress,
    fetchLibrary,
    updateBook,
    moveToEndOfList,
    filteredBooks,
    getTabCount,
  };
}
