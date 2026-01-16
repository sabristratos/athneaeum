import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { createMMKV, type MMKV } from 'react-native-mmkv';
import {
  useDiscoveryFeedQuery,
  useRecordSignalsMutation,
  useDiscoverySearchQuery,
} from '@/queries/useDiscovery';
import { useToast } from '@/stores/toastStore';
import type { CatalogBook, Signal, SignalType, DiscoverySection } from '@/types/discovery';

const FLUSH_INTERVAL_MS = 30000;
const SIGNAL_STORAGE_KEY = 'discovery_pending_signals';

let signalStorage: MMKV | null = null;
try {
  signalStorage = createMMKV({ id: 'discovery-signals' });
} catch {}

function loadPersistedSignals(): Signal[] {
  try {
    const stored = signalStorage?.getString(SIGNAL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function persistSignals(signals: Signal[]): void {
  try {
    signalStorage?.set(SIGNAL_STORAGE_KEY, JSON.stringify(signals));
  } catch {}
}

function clearPersistedSignals(): void {
  try {
    signalStorage?.remove(SIGNAL_STORAGE_KEY);
  } catch {}
}

/**
 * Controller hook for the Discovery screen.
 *
 * Handles:
 * - Fetching the personalized discovery feed
 * - Queueing and batching user interaction signals
 * - Flushing signals on interval and app background
 * - Persisting signals to storage to prevent loss on crash
 * - Mood-based filtering
 * - Search functionality
 */
export function useDiscoveryController() {
  const { data: feed, isLoading, error, refetch } = useDiscoveryFeedQuery();
  const recordSignals = useRecordSignalsMutation();
  const toast = useToast();

  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const { data: searchResults, isLoading: isSearching } = useDiscoverySearchQuery(
    searchQuery.length >= 2 ? searchQuery : ''
  );

  const signalQueue = useRef<Signal[]>(loadPersistedSignals());
  const flushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isFlushingRef = useRef(false);

  const queueSignal = useCallback((bookId: number, type: SignalType) => {
    const signal: Signal = {
      book_id: bookId,
      type,
      timestamp: Date.now(),
    };
    signalQueue.current.push(signal);
    persistSignals(signalQueue.current);
  }, []);

  const flushSignals = useCallback(async () => {
    if (signalQueue.current.length === 0) return;
    if (isFlushingRef.current) return;

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) return;

    isFlushingRef.current = true;

    const signals = [...signalQueue.current];
    signalQueue.current = [];
    clearPersistedSignals();

    try {
      await recordSignals.mutateAsync(signals);
    } catch {
      signalQueue.current = [...signals, ...signalQueue.current];
      persistSignals(signalQueue.current);
    } finally {
      isFlushingRef.current = false;
    }
  }, [recordSignals]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background') {
        flushSignals();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [flushSignals]);

  useEffect(() => {
    flushTimerRef.current = setInterval(flushSignals, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, [flushSignals]);

  const handleBookView = useCallback(
    (book: CatalogBook) => {
      queueSignal(book.id, 'view');
    },
    [queueSignal]
  );

  const handleBookClick = useCallback(
    (book: CatalogBook) => {
      queueSignal(book.id, 'click');
    },
    [queueSignal]
  );

  const handleAddToLibrary = useCallback(
    (book: CatalogBook) => {
      queueSignal(book.id, 'add_to_library');
      toast.success('Added to library');
    },
    [queueSignal, toast]
  );

  const handleDismiss = useCallback(
    (book: CatalogBook) => {
      queueSignal(book.id, 'dismiss');
    },
    [queueSignal]
  );

  const handleRefresh = useCallback(async () => {
    await flushSignals();
    await refetch();
  }, [flushSignals, refetch]);

  const heroBook = useMemo(() => {
    if (!feed?.sections?.length) return null;
    const personalizedSection = feed.sections.find((s) => s.type === 'personalized');
    if (personalizedSection?.data?.length) {
      return personalizedSection.data[0];
    }
    for (const section of feed.sections) {
      if (section.data?.length) {
        return section.data[0];
      }
    }
    return null;
  }, [feed?.sections]);

  const allBooks = useMemo(() => {
    if (!feed?.sections) return [];
    const books: CatalogBook[] = [];
    const seenIds = new Set<number>();

    for (const section of feed.sections) {
      for (const book of section.data) {
        if (!seenIds.has(book.id)) {
          seenIds.add(book.id);
          books.push(book);
        }
      }
    }
    return books;
  }, [feed?.sections]);

  const filteredSections = useMemo((): DiscoverySection[] => {
    if (!feed?.sections) return [];

    if (selectedMoods.length === 0) {
      return feed.sections;
    }

    return feed.sections.map((section) => ({
      ...section,
      data: section.data.filter((book) => {
        if (!book.moods || book.moods.length === 0) return false;
        return selectedMoods.some((selectedMood) =>
          book.moods?.some((bookMood) => bookMood === selectedMood)
        );
      }),
    })).filter((section) => section.data.length > 0);
  }, [feed?.sections, selectedMoods]);

  const handleMoodToggle = useCallback((moodId: string) => {
    setSelectedMoods((prev) =>
      prev.includes(moodId)
        ? prev.filter((m) => m !== moodId)
        : [...prev, moodId]
    );
  }, []);

  const handleClearMoods = useCallback(() => {
    setSelectedMoods([]);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() && !recentSearches.includes(query.trim())) {
      setRecentSearches((prev) => [query.trim(), ...prev.slice(0, 4)]);
    }
  }, [recentSearches]);

  const handleSearchFocus = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  const handleSearchBlur = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
  }, []);

  const handleRecentSearchPress = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  return {
    sections: filteredSections,
    heroBook,
    allBooks,
    isLoading,
    isSearching,
    error,
    searchResults: searchResults?.data ?? [],

    selectedMoods,
    searchQuery,
    isSearchActive,
    recentSearches,

    refetch: handleRefresh,
    handleBookView,
    handleBookClick,
    handleAddToLibrary,
    handleDismiss,
    flushSignals,

    handleMoodToggle,
    handleClearMoods,
    handleSearch,
    handleSearchFocus,
    handleSearchBlur,
    handleRecentSearchPress,
    handleClearRecentSearches,
  };
}
