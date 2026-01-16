import { useState, useCallback, useMemo } from 'react';
import { useLibraryAuthorsQuery, useAuthorSearchQuery } from '@/queries/useAuthors';
import { useTogglePreference } from '@/database/hooks';
import { useToast } from '@/stores/toastStore';
import type { LibraryAuthor, LibraryAuthorFilter, LibraryAuthorSort, LibraryAuthorSortOrder, OpenLibraryAuthor } from '@/types';

interface SelectedAuthorState {
  key: string;
  name: string;
  isFavorite: boolean;
  isExcluded: boolean;
}

export const SORT_OPTIONS: { key: LibraryAuthorSort; label: string }[] = [
  { key: 'books', label: 'Books' },
  { key: 'name', label: 'Name' },
  { key: 'rating', label: 'Rating' },
  { key: 'pages', label: 'Pages' },
];

export function useAuthorIndexController() {
  const toast = useToast();
  const [filter, setFilter] = useState<LibraryAuthorFilter>('all');
  const [sortBy, setSortBy] = useState<LibraryAuthorSort>('books');
  const [sortOrder, setSortOrder] = useState<LibraryAuthorSortOrder>('desc');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<SelectedAuthorState | null>(null);

  const {
    data: libraryAuthors,
    isLoading: loadingLibrary,
    refetch: refetchLibrary,
    isRefetching: refreshingLibrary,
    error: libraryError,
  } = useLibraryAuthorsQuery({ filter, sort: sortBy, order: sortOrder });

  const {
    data: searchResults,
    isLoading: loadingSearch,
    error: searchError,
  } = useAuthorSearchQuery(searchMode && searchQuery.length >= 2 ? searchQuery : '');

  const { toggleAuthor, loading: toggleLoading } = useTogglePreference();

  const toggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  }, []);

  const filteredLibraryAuthors = useMemo(() => {
    if (!libraryAuthors) return [];
    if (!localSearchQuery.trim()) return libraryAuthors;

    const query = localSearchQuery.toLowerCase().trim();
    return libraryAuthors.filter((author) =>
      author.name.toLowerCase().includes(query)
    );
  }, [libraryAuthors, localSearchQuery]);

  const clearLocalSearch = useCallback(() => {
    setLocalSearchQuery('');
  }, []);

  const toggleSearchMode = useCallback(() => {
    setSearchMode((prev) => !prev);
    if (searchMode) {
      setSearchQuery('');
    }
  }, [searchMode]);

  const handleToggleFavorite = useCallback(
    async (author: LibraryAuthor) => {
      const currentState = author.is_favorite
        ? 'favorite'
        : author.is_excluded
        ? 'excluded'
        : 'none';
      const newState = author.is_favorite ? 'none' : 'favorite';

      try {
        await toggleAuthor(author.name, currentState, newState);
        toast.success(
          newState === 'favorite'
            ? `${author.name} added to favorites`
            : `${author.name} removed from favorites`
        );
      } catch {
        toast.danger('Failed to update preference');
      }
    },
    [toggleAuthor, toast]
  );

  const handleToggleExclude = useCallback(
    async (author: LibraryAuthor) => {
      const currentState = author.is_favorite
        ? 'favorite'
        : author.is_excluded
        ? 'excluded'
        : 'none';
      const newState = author.is_excluded ? 'none' : 'excluded';

      try {
        await toggleAuthor(author.name, currentState, newState);
        toast.success(
          newState === 'excluded'
            ? `${author.name} will be hidden from search`
            : `${author.name} removed from excludes`
        );
      } catch {
        toast.danger('Failed to update preference');
      }
    },
    [toggleAuthor, toast]
  );

  const handleSelectOpenLibraryAuthor = useCallback((author: OpenLibraryAuthor) => {
    const libraryMatch = libraryAuthors?.find(
      (la) => la.name.toLowerCase() === author.name.toLowerCase()
    );

    setSelectedAuthor({
      key: author.key,
      name: author.name,
      isFavorite: libraryMatch?.is_favorite ?? false,
      isExcluded: libraryMatch?.is_excluded ?? false,
    });
  }, [libraryAuthors]);

  const handleSheetFavorite = useCallback(async () => {
    if (!selectedAuthor) return;

    const newState = selectedAuthor.isFavorite ? 'none' : 'favorite';
    const currentState = selectedAuthor.isFavorite
      ? 'favorite'
      : selectedAuthor.isExcluded
      ? 'excluded'
      : 'none';

    try {
      await toggleAuthor(selectedAuthor.name, currentState, newState);
      setSelectedAuthor((prev) =>
        prev
          ? { ...prev, isFavorite: newState === 'favorite', isExcluded: false }
          : null
      );
      toast.success(
        newState === 'favorite'
          ? `${selectedAuthor.name} added to favorites`
          : `${selectedAuthor.name} removed from favorites`
      );
    } catch {
      toast.danger('Failed to update preference');
    }
  }, [selectedAuthor, toggleAuthor, toast]);

  const handleSheetExclude = useCallback(async () => {
    if (!selectedAuthor) return;

    const newState = selectedAuthor.isExcluded ? 'none' : 'excluded';
    const currentState = selectedAuthor.isFavorite
      ? 'favorite'
      : selectedAuthor.isExcluded
      ? 'excluded'
      : 'none';

    try {
      await toggleAuthor(selectedAuthor.name, currentState, newState);
      setSelectedAuthor((prev) =>
        prev
          ? { ...prev, isExcluded: newState === 'excluded', isFavorite: false }
          : null
      );
      toast.success(
        newState === 'excluded'
          ? `${selectedAuthor.name} will be hidden from search`
          : `${selectedAuthor.name} removed from excludes`
      );
    } catch {
      toast.danger('Failed to update preference');
    }
  }, [selectedAuthor, toggleAuthor, toast]);

  const closeSheet = useCallback(() => {
    setSelectedAuthor(null);
  }, []);

  return {
    filter,
    setFilter,
    sortBy,
    setSortBy,
    sortOrder,
    toggleSortOrder,
    searchMode,
    toggleSearchMode,
    searchQuery,
    setSearchQuery,
    localSearchQuery,
    setLocalSearchQuery,
    clearLocalSearch,
    libraryAuthors: filteredLibraryAuthors,
    searchResults: searchResults?.items ?? [],
    loadingLibrary,
    loadingSearch,
    refreshingLibrary,
    refetchLibrary,
    libraryError: libraryError ? 'Failed to load authors' : null,
    searchError: searchError ? 'Search failed' : null,
    handleToggleFavorite,
    handleToggleExclude,
    handleSelectOpenLibraryAuthor,
    selectedAuthor,
    closeSheet,
    handleSheetFavorite,
    handleSheetExclude,
    isPending: toggleLoading,
  };
}
