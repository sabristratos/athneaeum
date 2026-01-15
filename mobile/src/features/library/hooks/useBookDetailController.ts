import { useState, useCallback, useEffect, useMemo } from 'react';
import { Share, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timer02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useMMKVString } from 'react-native-mmkv';
import { useScrollAnimations } from '@/hooks';
import { useToast } from '@/stores/toastStore';
import { useLibrary, useReadingSessions } from '@/hooks/useBooks';
import { queryKeys } from '@/lib/queryKeys';
import { booksApi } from '@/api/books';
import { useQuotes } from '@/hooks/useQuotes';
import { useTags, useTagActions as useWatermelonTagActions } from '@/database/hooks';
import { storage } from '@/lib/storage';
import { apiClient } from '@/api/client';
import { useSeriesDetailQuery } from '@/queries';
import { useLibraryAuthorsQuery, useToggleAuthorPreferenceMutation } from '@/queries/useAuthors';
import type {
  UserBook,
  BookStatus,
  Quote,
  QuoteMood,
  ReadingSession,
  ReadThrough,
  Book,
  BookFormat,
  Genre,
} from '@/types';
import type { Tag as WatermelonTag } from '@/database/models/Tag';
import type { Tag, TagColor } from '@/types/tag';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import type { ModalStatus } from '@/components';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'BookDetail'>;
type BookDetailRouteProp = RouteProp<MainStackParamList, 'BookDetail'>;

interface ModalState {
  visible: boolean;
  title: string;
  message?: string;
  status: ModalStatus;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmDestructive?: boolean;
}

const initialModalState: ModalState = {
  visible: false,
  title: '',
  status: 'info',
};

interface StatusOption {
  key: string;
  label: string;
}

interface FabConfig {
  label: string;
  icon: IconSvgElement;
}

interface NextInSeriesInfo {
  book: Book;
  volumeNumber: number;
  seriesTitle: string;
}

interface AuthorSheetState {
  visible: boolean;
  authorKey: string;
  authorName: string;
  isFavorite: boolean;
  isExcluded: boolean;
}

export interface BookDetailControllerState {
  userBook: UserBook;
  book: Book;
  updating: boolean;
  showQuoteModal: boolean;
  showSessionModal: boolean;
  showEditSessionModal: boolean;
  editingSession: ReadingSession | null;
  showMenu: boolean;
  showDnfModal: boolean;
  showStatusPicker: boolean;
  showTagPicker: boolean;
  showBookDetailsSheet: boolean;
  showReviewSheet: boolean;
  showSeriesAssignModal: boolean;
  showAuthorSheet: AuthorSheetState;
  editingQuote: Quote | undefined;
  modal: ModalState;
  measuredHeroHeight: number | null;
  sessions: ReadingSession[];
  quotes: Quote[];
  tags: Tag[];
  recentlyUsedTags: Tag[];
  readThroughs: ReadThrough[];
  readCount: number;
  nextInSeries: NextInSeriesInfo | null;
  isAnalyzing: boolean;
}

export interface BookDetailControllerActions {
  setShowQuoteModal: (show: boolean) => void;
  setShowSessionModal: (show: boolean) => void;
  setShowEditSessionModal: (show: boolean) => void;
  setEditingSession: (session: ReadingSession | null) => void;
  setShowMenu: (show: boolean) => void;
  setShowDnfModal: (show: boolean) => void;
  setShowStatusPicker: (show: boolean) => void;
  setEditingQuote: (quote: Quote | undefined) => void;
  closeModal: () => void;
  showError: (message: string) => void;
  handleStatusChange: (status: string) => Promise<void>;
  handleRatingChange: (rating: number) => Promise<void>;
  handleLogSession: (data: {
    endPage: number;
    durationSeconds?: number;
    notes?: string;
    date: string;
  }) => Promise<void>;
  handleQuickProgress: (newPage: number) => Promise<void>;
  handleShare: () => Promise<void>;
  handleDnf: (reason: string) => Promise<void>;
  handleRemove: () => void;
  handleSaveQuote: (data: {
    text: string;
    pageNumber?: number;
    note?: string;
    mood?: QuoteMood;
  }) => void;
  handleDeleteQuote: (quoteId: string) => void;
  handleQuotePress: (quote: Quote) => void;
  handleAddQuote: () => void;
  handleSessionPress: (session: ReadingSession) => void;
  handleUpdateSession: (
    sessionId: number,
    data: {
      date?: string;
      start_page?: number;
      end_page?: number;
      duration_seconds?: number | null;
      notes?: string | null;
    }
  ) => Promise<void>;
  handleDeleteSession: (sessionId: number) => Promise<void>;
  handleFabPress: () => void;
  handleHeroHeightMeasured: (height: number) => void;
  goBack: () => void;
  handleOpenStatusPicker: () => void;
  handleCloseStatusPicker: () => void;
  handleOpenSessionModal: () => void;
  handleCloseSessionModal: () => void;
  handleOpenDnfModal: () => void;
  handleCloseDnfModal: () => void;
  handleOpenMenu: () => void;
  handleCloseMenu: () => void;
  handleCloseQuoteModal: () => void;
  handleCloseEditSessionModal: () => void;
  handleMenuRemove: () => void;
  handleStatusSelect: (status: string) => void;
  handleOpenTagPicker: () => void;
  handleCloseTagPicker: () => void;
  handleSaveTags: (tagIds: number[]) => Promise<void>;
  handleCreateTag: (name: string, color: TagColor) => Promise<Tag | void>;
  handleOpenBookDetailsSheet: () => void;
  handleCloseBookDetailsSheet: () => void;
  handleSaveBookDetails: (format: BookFormat | null, price: number | null) => Promise<void>;
  handleOpenReviewSheet: () => void;
  handleCloseReviewSheet: () => void;
  handleSaveReview: (review: string | null) => Promise<void>;
  handleStartReread: () => void;
  handleReadThroughRatingChange: (readThroughId: number, rating: number) => Promise<void>;
  handleNextInSeriesPress: () => Promise<void>;
  handleOpenSeriesAssignModal: () => void;
  handleCloseSeriesAssignModal: () => void;
  handleSeriesAssignSuccess: () => void;
  handleOpenAuthorSheet: () => void;
  handleCloseAuthorSheet: () => void;
  handleAuthorFavorite: () => void;
  handleAuthorExclude: () => void;
  handleGenrePress: (genre: Genre) => void;
  handleAnalyzeContent: () => void;
}

export interface BookDetailControllerComputed {
  statusOptions: StatusOption[];
  fabConfig: FabConfig;
  showProgress: boolean;
  showDnfAction: boolean;
  stageHeight: number;
  canStartReread: boolean;
}

export interface BookDetailControllerScrollAnimations {
  scrollY: ReturnType<typeof useScrollAnimations>['scrollY'];
  scrollHandler: ReturnType<typeof useScrollAnimations>['scrollHandler'];
  fabVisible: ReturnType<typeof useScrollAnimations>['fabVisible'];
  insets: ReturnType<typeof useSafeAreaInsets>;
}

export interface BookDetailControllerReturn
  extends BookDetailControllerState,
    BookDetailControllerActions,
    BookDetailControllerComputed,
    BookDetailControllerScrollAnimations {}

const STAGE_HEIGHT_PERCENT = 0.35;
const RECENTLY_USED_TAGS_KEY = 'recently_used_tag_ids';
const MAX_RECENTLY_USED = 5;

export function useBookDetailController(): BookDetailControllerReturn {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { updateBook, removeBook, addToLibrary } = useLibrary();
  const {
    sessions,
    fetchSessions,
    logSession,
    updateSession,
    deleteSession,
  } = useReadingSessions(route.params.userBook.id);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [measuredHeroHeight, setMeasuredHeroHeight] = useState<number | null>(null);

  const stageHeight = measuredHeroHeight ?? windowHeight * STAGE_HEIGHT_PERCENT;

  const { scrollY, scrollHandler, fabVisible } = useScrollAnimations({
    titleFadeStart: 150,
    titleFadeEnd: 250,
    fabHideThreshold: 100,
    stageHeight,
  });

  const [userBook, setUserBook] = useState<UserBook>(route.params.userBook);
  const [updating, setUpdating] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [editingSession, setEditingSession] = useState<ReadingSession | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDnfModal, setShowDnfModal] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showBookDetailsSheet, setShowBookDetailsSheet] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [showSeriesAssignModal, setShowSeriesAssignModal] = useState(false);
  const [showAuthorSheet, setShowAuthorSheet] = useState<AuthorSheetState>({
    visible: false,
    authorKey: '',
    authorName: '',
    isFavorite: false,
    isExcluded: false,
  });
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>();
  const [modal, setModal] = useState<ModalState>(initialModalState);
  const [readThroughs, setReadThroughs] = useState<ReadThrough[]>(
    route.params.userBook.read_throughs ?? []
  );
  const [readCount, setReadCount] = useState<number>(
    route.params.userBook.read_count ?? 0
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { tags: watermelonTags } = useTags();
  const { createTag: createWatermelonTag } = useWatermelonTagActions();
  const [storedRecentlyUsedIds, setStoredRecentlyUsedIds] = useMMKVString(RECENTLY_USED_TAGS_KEY, storage ?? undefined);

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

  const recentlyUsedTagIds: number[] = useMemo(() => {
    if (!storedRecentlyUsedIds) return [];
    try {
      return JSON.parse(storedRecentlyUsedIds);
    } catch {
      return [];
    }
  }, [storedRecentlyUsedIds]);

  const recentlyUsedTags: Tag[] = useMemo(() => {
    return recentlyUsedTagIds
      .map((id) => tags.find((t) => t.id === id))
      .filter((t): t is Tag => t !== undefined);
  }, [recentlyUsedTagIds, tags]);

  const markTagUsed = useCallback((tagId: number) => {
    const current = recentlyUsedTagIds.filter((id) => id !== tagId);
    const updated = [tagId, ...current].slice(0, MAX_RECENTLY_USED);
    setStoredRecentlyUsedIds(JSON.stringify(updated));
  }, [recentlyUsedTagIds, setStoredRecentlyUsedIds]);

  const { data: libraryAuthors } = useLibraryAuthorsQuery('all');
  const toggleAuthorPreference = useToggleAuthorPreferenceMutation();

  useFocusEffect(
    useCallback(() => {
      const refreshBook = async () => {
        try {
          const freshBook = await booksApi.getUserBook(route.params.userBook.id);
          setUserBook(freshBook);
          if (freshBook.read_throughs) {
            setReadThroughs(freshBook.read_throughs);
          }
          if (freshBook.read_count !== undefined) {
            setReadCount(freshBook.read_count);
          }
        } catch {
        }
      };
      refreshBook();
    }, [route.params.userBook.id])
  );

  // Poll for classification updates when book has description but isn't classified yet
  useEffect(() => {
    const book = userBook.book;
    const isPendingClassification = book?.description && !book?.is_classified && !isAnalyzing;

    if (!isPendingClassification) return;

    const pollForClassification = async () => {
      try {
        const freshBook = await booksApi.getUserBook(route.params.userBook.id);
        if (freshBook.book?.is_classified) {
          setUserBook(freshBook);
        }
      } catch {
        // Silently ignore polling errors
      }
    };

    // Poll every 5 seconds for up to 30 seconds
    const intervalId = setInterval(pollForClassification, 5000);
    const timeoutId = setTimeout(() => clearInterval(intervalId), 30000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [route.params.userBook.id, userBook.book?.description, userBook.book?.is_classified, isAnalyzing]);

  const book = userBook.book;
  const { quotes, createQuote, editQuote, removeQuote } = useQuotes(userBook.id);

  const { data: seriesDetail } = useSeriesDetailQuery(
    book?.series_id ?? 0,
    { enabled: !!book?.series_id && !!book?.volume_number }
  );

  const nextInSeries = useMemo(() => {
    if (!seriesDetail || !book?.volume_number) return null;
    const nextVolumeNumber = book.volume_number + 1;
    const nextBook = seriesDetail.books?.find(
      (b) => b.volume_number === nextVolumeNumber
    );
    if (!nextBook) return null;
    return {
      book: nextBook,
      volumeNumber: nextVolumeNumber,
      seriesTitle: seriesDetail.title,
    };
  }, [seriesDetail, book?.volume_number]);

  const statusOptions = useMemo(() => {
    const wasCompleted = userBook.status === 'read' || userBook.finished_at;
    return [
      { key: 'want_to_read', label: 'Want to Read' },
      { key: 'reading', label: wasCompleted ? 'Re-reading' : 'Reading' },
      { key: 'read', label: 'Read' },
      { key: 'dnf', label: 'Did Not Finish' },
    ];
  }, [userBook.status, userBook.finished_at]);

  const fabConfig = useMemo(() => {
    if (userBook.status === 'reading') {
      return { label: 'Start Session', icon: Timer02Icon };
    }
    return { label: 'Log Activity', icon: PencilEdit01Icon };
  }, [userBook.status]);

  const handleHeroHeightMeasured = useCallback((height: number) => {
    setMeasuredHeroHeight((prev) => {
      if (prev === null || Math.abs(prev - height) > 10) {
        return height;
      }
      return prev;
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const showError = useCallback((message: string) => {
    setModal({
      visible: true,
      title: 'Error',
      message,
      status: 'error',
      confirmLabel: 'OK',
    });
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const performReread = useCallback(async () => {
    setUpdating(true);
    try {
      const result = await booksApi.startReread(userBook.id);
      setUserBook(result.user_book);
      if (result.user_book.read_throughs) {
        setReadThroughs(result.user_book.read_throughs);
      }
      if (result.user_book.read_count !== undefined) {
        setReadCount(result.user_book.read_count);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success('Re-reading started');
    } catch (err) {
      showError('Failed to start re-read');
    } finally {
      setUpdating(false);
    }
  }, [userBook.id, showError, toast, queryClient]);

  const handleStatusChange = useCallback(
    async (status: string) => {
      const isReread =
        status === 'reading' && (userBook.status === 'read' || userBook.finished_at);

      if (isReread) {
        setModal({
          visible: true,
          title: 'Start Re-reading?',
          message:
            'This will reset your progress to page 1. Your previous reading sessions will be kept.',
          status: 'info',
          confirmLabel: 'Start Fresh',
          cancelLabel: 'Cancel',
          onConfirm: performReread,
        });
        return;
      }

      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, {
          status: status as BookStatus,
        });
        if (updated) {
          setUserBook(updated);
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
          toast.success('Status updated');
        }
      } catch (err) {
        showError('Failed to update status');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, userBook.status, userBook.finished_at, updateBook, showError, performReread, toast, queryClient]
  );

  const handleRatingChange = useCallback(
    async (rating: number) => {
      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, { rating });
        if (updated) {
          setUserBook(updated);
          toast.success('Rating saved');
        }
      } catch (err) {
        showError('Failed to update rating');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError, toast]
  );

  const handleLogSession = useCallback(
    async (data: {
      endPage: number;
      durationSeconds?: number;
      notes?: string;
      date: string;
    }) => {
      try {
        const result = await logSession({
          user_book_id: userBook.id,
          date: data.date,
          start_page: userBook.current_page,
          end_page: data.endPage,
          duration_seconds: data.durationSeconds,
          notes: data.notes,
        });

        if (result?.userBook) {
          setUserBook(result.userBook);
        }
        fetchSessions();
        toast.success('Session logged', {
          action: {
            label: 'Stats',
            onPress: () => navigation.navigate('MainTabs', { screen: 'StatsTab' } as any),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to log session';
        toast.danger(message);
        throw err;
      }
    },
    [userBook, logSession, fetchSessions, toast, navigation]
  );

  const handleQuickProgress = useCallback(
    async (newPage: number) => {
      try {
        const pagesRead = newPage - userBook.current_page;

        if (pagesRead > 0) {
          const result = await logSession({
            user_book_id: userBook.id,
            date: new Date().toISOString().split('T')[0],
            start_page: userBook.current_page,
            end_page: newPage,
            duration_seconds: undefined,
            notes: undefined,
          });

          if (result?.userBook) {
            setUserBook(result.userBook);
            fetchSessions();
            toast.success('Progress saved', {
              action: {
                label: 'Stats',
                onPress: () => navigation.navigate('MainTabs', { screen: 'StatsTab' } as any),
              },
            });
          }
        } else {
          const updated = await updateBook(userBook.id, { current_page: newPage });
          if (updated) {
            setUserBook(updated);
            toast.success('Progress saved');
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save progress';
        toast.danger(message);
      }
    },
    [userBook.id, userBook.current_page, updateBook, logSession, fetchSessions, toast, navigation]
  );

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I'm reading "${book.title}" by ${book.author}`,
        title: book.title,
      });
    } catch (error) {
      toast.danger('Failed to share');
    }
  }, [book, toast]);

  const handleDnf = useCallback(
    async (reason: string) => {
      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, {
          status: 'dnf',
          is_dnf: true,
          dnf_reason: reason,
        });
        if (updated) {
          setUserBook(updated);
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
          toast.success('Marked as Did Not Finish');
        }
      } catch (err) {
        showError('Failed to mark as DNF');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError, toast, queryClient]
  );

  const performRemove = useCallback(async () => {
    const bookData = {
      external_id: userBook.book.external_id ?? undefined,
      external_provider: userBook.book.external_provider ?? undefined,
      title: userBook.book.title,
      author: userBook.book.author,
      cover_url: userBook.book.cover_url,
      page_count: userBook.book.page_count,
      isbn: userBook.book.isbn,
      description: userBook.book.description,
      genres: userBook.book.genres?.map((g) => g.name) ?? undefined,
      published_date: userBook.book.published_date,
      status: userBook.status,
    };
    const savedUserBookData = {
      rating: userBook.rating,
      current_page: userBook.current_page,
      review: userBook.review,
      started_at: userBook.started_at,
      finished_at: userBook.finished_at,
    };

    const success = await removeBook(userBook.id);
    if (success) {
      queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      navigation.goBack();

      toast.undo('Removed from library', async () => {
        try {
          const restored = await addToLibrary(bookData);
          if (restored && (savedUserBookData.rating || savedUserBookData.current_page > 0 || savedUserBookData.review)) {
            await booksApi.updateUserBook(restored.id, savedUserBookData);
          }
          queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
          toast.success('Book restored');
        } catch {
          toast.danger('Failed to restore book');
        }
      });
    } else {
      showError('Failed to remove book');
    }
  }, [userBook, removeBook, addToLibrary, navigation, showError, toast, queryClient]);

  const handleRemove = useCallback(() => {
    setModal({
      visible: true,
      title: 'Remove Book',
      message: 'Are you sure you want to remove this book from your library?',
      status: 'danger',
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel',
      confirmDestructive: true,
      onConfirm: performRemove,
    });
  }, [performRemove]);

  const handleSaveQuote = useCallback(
    (data: { text: string; pageNumber?: number; note?: string; mood?: QuoteMood }) => {
      if (editingQuote) {
        editQuote(editingQuote.id, data);
      } else {
        createQuote(data);
      }
      setEditingQuote(undefined);
    },
    [editingQuote, createQuote, editQuote]
  );

  const handleDeleteQuote = useCallback(
    (quoteId: string) => {
      removeQuote(quoteId);
      setEditingQuote(undefined);
      setShowQuoteModal(false);
      toast.success('Quote deleted');
    },
    [removeQuote, toast]
  );

  const handleQuotePress = useCallback((quote: Quote) => {
    setEditingQuote(quote);
    setShowQuoteModal(true);
  }, []);

  const handleAddQuote = useCallback(() => {
    setEditingQuote(undefined);
    setShowQuoteModal(true);
  }, []);

  const handleSessionPress = useCallback((session: ReadingSession) => {
    setEditingSession(session);
    setShowEditSessionModal(true);
  }, []);

  const handleUpdateSession = useCallback(
    async (
      sessionId: number,
      data: {
        date?: string;
        start_page?: number;
        end_page?: number;
        duration_seconds?: number | null;
        notes?: string | null;
      }
    ) => {
      try {
        await updateSession(sessionId, data);
        toast.success('Session updated');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update session';
        toast.danger(message);
      }
    },
    [updateSession, toast]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number) => {
      const sessionToDelete = sessions.find((s) => s.id === sessionId);
      if (!sessionToDelete) {
        toast.danger('Session not found');
        return;
      }

      const savedSessionData = {
        user_book_id: userBook.id,
        date: sessionToDelete.date,
        start_page: sessionToDelete.start_page,
        end_page: sessionToDelete.end_page,
        duration_seconds: sessionToDelete.duration_seconds ?? undefined,
        notes: sessionToDelete.notes ?? undefined,
      };

      try {
        await deleteSession(sessionId);
        toast.undo('Session deleted', async () => {
          try {
            await logSession(savedSessionData);
            fetchSessions();
            toast.success('Session restored');
          } catch {
            toast.danger('Failed to restore session');
          }
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete session';
        toast.danger(message);
      }
    },
    [sessions, userBook.id, deleteSession, logSession, fetchSessions, toast]
  );

  const handleFabPress = useCallback(() => {
    setShowSessionModal(true);
  }, []);

  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleOpenStatusPicker = useCallback(() => setShowStatusPicker(true), []);
  const handleCloseStatusPicker = useCallback(() => setShowStatusPicker(false), []);
  const handleOpenSessionModal = useCallback(() => setShowSessionModal(true), []);
  const handleCloseSessionModal = useCallback(() => setShowSessionModal(false), []);
  const handleOpenDnfModal = useCallback(() => setShowDnfModal(true), []);
  const handleCloseDnfModal = useCallback(() => setShowDnfModal(false), []);
  const handleOpenMenu = useCallback(() => setShowMenu(true), []);
  const handleCloseMenu = useCallback(() => setShowMenu(false), []);
  const handleCloseQuoteModal = useCallback(() => {
    setShowQuoteModal(false);
    setEditingQuote(undefined);
  }, []);
  const handleCloseEditSessionModal = useCallback(() => {
    setShowEditSessionModal(false);
    setEditingSession(null);
  }, []);

  const handleMenuRemove = useCallback(() => {
    setShowMenu(false);
    handleRemove();
  }, [handleRemove]);

  const handleStatusSelect = useCallback(
    (status: string) => {
      handleStatusChange(status);
      setShowStatusPicker(false);
    },
    [handleStatusChange]
  );

  const handleOpenTagPicker = useCallback(() => setShowTagPicker(true), []);
  const handleCloseTagPicker = useCallback(() => setShowTagPicker(false), []);

  const handleSaveTags = useCallback(
    async (tagIds: number[], retryCount = 0) => {
      const maxRetries = 3;
      try {
        const updatedBook = await apiClient<UserBook>(
          `/library/${userBook.id}/tags`,
          {
            method: 'POST',
            body: { tag_ids: tagIds },
          }
        );
        setUserBook(updatedBook);
        tagIds.forEach((id) => markTagUsed(id));
        toast.success('Tags updated');
        setShowTagPicker(false);
      } catch (err) {
        if (retryCount < maxRetries) {
          const delay = Math.pow(2, retryCount) * 500;
          await new Promise((resolve) => setTimeout(resolve, delay));
          return handleSaveTags(tagIds, retryCount + 1);
        }
        showError('Failed to update tags');
        setShowTagPicker(false);
      }
    },
    [userBook.id, showError, markTagUsed, toast]
  );

  const handleCreateTag = useCallback(
    async (name: string, color: TagColor): Promise<Tag | void> => {
      try {
        const newWatermelonTag = await createWatermelonTag(name, color);
        const newTag: Tag = {
          id: newWatermelonTag.serverId ?? 0,
          name: newWatermelonTag.name,
          slug: newWatermelonTag.slug,
          color: newWatermelonTag.color as TagColor,
          color_label: newWatermelonTag.color,
          is_system: newWatermelonTag.isSystem,
          sort_order: newWatermelonTag.sortOrder,
          books_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        toast.success('Tag created');
        return newTag;
      } catch (err) {
        showError('Failed to create tag');
      }
    },
    [createWatermelonTag, showError, toast]
  );

  const handleOpenBookDetailsSheet = useCallback(() => setShowBookDetailsSheet(true), []);
  const handleCloseBookDetailsSheet = useCallback(() => setShowBookDetailsSheet(false), []);

  const handleSaveBookDetails = useCallback(
    async (format: BookFormat | null, price: number | null) => {
      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, { format, price });
        if (updated) {
          setUserBook(updated);
          toast.success('Details saved');
        }
      } catch (err) {
        showError('Failed to save details');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError, toast]
  );

  const handleOpenReviewSheet = useCallback(() => setShowReviewSheet(true), []);
  const handleCloseReviewSheet = useCallback(() => setShowReviewSheet(false), []);

  const handleOpenSeriesAssignModal = useCallback(() => setShowSeriesAssignModal(true), []);
  const handleCloseSeriesAssignModal = useCallback(() => setShowSeriesAssignModal(false), []);

  const handleSeriesAssignSuccess = useCallback(async () => {
    try {
      const freshBook = await booksApi.getUserBook(route.params.userBook.id);
      setUserBook(freshBook);
      queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.series.all });
    } catch {
    }
  }, [route.params.userBook.id, queryClient]);

  const handleSaveReview = useCallback(
    async (review: string | null) => {
      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, { review });
        if (updated) {
          setUserBook(updated);
          toast.success('Review saved');
        }
      } catch (err) {
        showError('Failed to save review');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError, toast]
  );

  const handleStartReread = useCallback(() => {
    setModal({
      visible: true,
      title: 'Start Re-reading?',
      message:
        'This will start a new reading of this book. Your previous reading history will be preserved.',
      status: 'info',
      confirmLabel: 'Start Re-read',
      cancelLabel: 'Cancel',
      onConfirm: performReread,
    });
  }, [performReread]);

  const handleNextInSeriesPress = useCallback(async () => {
    if (!nextInSeries) return;

    try {
      const response = await booksApi.getLibrary();
      const existingBook = response.find(
        (ub) => ub.book.id === nextInSeries.book.id
      );

      if (existingBook) {
        navigation.push('BookDetail', { userBook: existingBook });
      } else {
        const newUserBook = await addToLibrary({
          external_id: nextInSeries.book.external_id ?? undefined,
          external_provider: nextInSeries.book.external_provider ?? undefined,
          title: nextInSeries.book.title,
          author: nextInSeries.book.author,
          cover_url: nextInSeries.book.cover_url,
          page_count: nextInSeries.book.page_count,
          isbn: nextInSeries.book.isbn,
          description: nextInSeries.book.description,
          genres: nextInSeries.book.genres?.map((g) => g.name) ?? undefined,
          published_date: nextInSeries.book.published_date,
          status: 'want_to_read',
        });
        if (newUserBook) {
          queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
          toast.success('Added to library');
          navigation.push('BookDetail', { userBook: newUserBook });
        }
      }
    } catch (err) {
      toast.danger('Failed to load next book');
    }
  }, [nextInSeries, addToLibrary, navigation, queryClient, toast]);

  const handleReadThroughRatingChange = useCallback(
    async (readThroughId: number, rating: number) => {
      try {
        await apiClient(`/read-throughs/${readThroughId}`, {
          method: 'PATCH',
          body: { rating },
        });
        setReadThroughs((prev) =>
          prev.map((rt) => (rt.id === readThroughId ? { ...rt, rating } : rt))
        );
        toast.success('Rating saved');
      } catch (err) {
        showError('Failed to save rating');
      }
    },
    [showError, toast]
  );

  const handleOpenAuthorSheet = useCallback(() => {
    const authorName = book.author;
    const libraryAuthor = libraryAuthors?.find(
      (a) => a.name.toLowerCase() === authorName.toLowerCase()
    );
    setShowAuthorSheet({
      visible: true,
      authorKey: '',
      authorName,
      isFavorite: libraryAuthor?.is_favorite ?? false,
      isExcluded: libraryAuthor?.is_excluded ?? false,
    });
  }, [book.author, libraryAuthors]);

  const handleCloseAuthorSheet = useCallback(() => {
    setShowAuthorSheet((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleAuthorFavorite = useCallback(() => {
    const currentState = showAuthorSheet.isFavorite
      ? 'favorite'
      : showAuthorSheet.isExcluded
        ? 'excluded'
        : 'none';
    const newState = showAuthorSheet.isFavorite ? 'none' : 'favorite';

    setShowAuthorSheet((prev) => ({
      ...prev,
      isFavorite: !prev.isFavorite,
      isExcluded: false,
    }));

    toggleAuthorPreference.mutate({
      authorName: showAuthorSheet.authorName,
      currentState,
      newState,
    });
  }, [showAuthorSheet, toggleAuthorPreference]);

  const handleAuthorExclude = useCallback(() => {
    const currentState = showAuthorSheet.isFavorite
      ? 'favorite'
      : showAuthorSheet.isExcluded
        ? 'excluded'
        : 'none';
    const newState = showAuthorSheet.isExcluded ? 'none' : 'excluded';

    setShowAuthorSheet((prev) => ({
      ...prev,
      isExcluded: !prev.isExcluded,
      isFavorite: false,
    }));

    toggleAuthorPreference.mutate({
      authorName: showAuthorSheet.authorName,
      currentState,
      newState,
    });
  }, [showAuthorSheet, toggleAuthorPreference]);

  const handleGenrePress = useCallback(
    (genre: Genre) => {
      navigation.navigate('MainTabs', {
        screen: 'LibraryTab',
        params: { genreSlug: genre.slug },
      } as any);
    },
    [navigation]
  );

  const handleAnalyzeContent = useCallback(async () => {
    if (!book.id) return;

    setIsAnalyzing(true);
    try {
      const classifiedBook = await booksApi.classifyBook(book.id);
      setUserBook((prev) => ({
        ...prev,
        book: { ...prev.book, ...classifiedBook },
      }));
      toast.success('Content analyzed');
    } catch {
      toast.danger('Failed to analyze content');
    } finally {
      setIsAnalyzing(false);
    }
  }, [book.id, toast]);

  const showProgress = userBook.status === 'reading' && !!book.page_count;
  const showDnfAction = userBook.status !== 'dnf' && userBook.status !== 'read';
  const canStartReread = userBook.status === 'read' || userBook.status === 'dnf';

  return {
    userBook,
    book,
    updating,
    showQuoteModal,
    showSessionModal,
    showEditSessionModal,
    editingSession,
    showMenu,
    showDnfModal,
    showStatusPicker,
    editingQuote,
    modal,
    measuredHeroHeight,
    sessions,
    quotes,
    setShowQuoteModal,
    setShowSessionModal,
    setShowEditSessionModal,
    setEditingSession,
    setShowMenu,
    setShowDnfModal,
    setShowStatusPicker,
    setEditingQuote,
    closeModal,
    showError,
    handleStatusChange,
    handleRatingChange,
    handleLogSession,
    handleQuickProgress,
    handleShare,
    handleDnf,
    handleRemove,
    handleSaveQuote,
    handleDeleteQuote,
    handleQuotePress,
    handleAddQuote,
    handleSessionPress,
    handleUpdateSession,
    handleDeleteSession,
    handleFabPress,
    handleHeroHeightMeasured,
    goBack,
    handleOpenStatusPicker,
    handleCloseStatusPicker,
    handleOpenSessionModal,
    handleCloseSessionModal,
    handleOpenDnfModal,
    handleCloseDnfModal,
    handleOpenMenu,
    handleCloseMenu,
    handleCloseQuoteModal,
    handleCloseEditSessionModal,
    handleMenuRemove,
    handleStatusSelect,
    handleOpenTagPicker,
    handleCloseTagPicker,
    handleSaveTags,
    handleCreateTag,
    handleOpenBookDetailsSheet,
    handleCloseBookDetailsSheet,
    handleSaveBookDetails,
    handleOpenReviewSheet,
    handleCloseReviewSheet,
    handleSaveReview,
    handleStartReread,
    handleReadThroughRatingChange,
    handleNextInSeriesPress,
    handleOpenSeriesAssignModal,
    handleCloseSeriesAssignModal,
    handleSeriesAssignSuccess,
    handleOpenAuthorSheet,
    handleCloseAuthorSheet,
    handleAuthorFavorite,
    handleAuthorExclude,
    handleGenrePress,
    showReviewSheet,
    showSeriesAssignModal,
    showAuthorSheet,
    statusOptions,
    fabConfig,
    showProgress,
    showDnfAction,
    canStartReread,
    stageHeight,
    scrollY,
    scrollHandler,
    fabVisible,
    insets,
    showTagPicker,
    showBookDetailsSheet,
    tags,
    recentlyUsedTags,
    readThroughs,
    readCount,
    nextInSeries,
    isAnalyzing,
    handleAnalyzeContent,
  };
}
