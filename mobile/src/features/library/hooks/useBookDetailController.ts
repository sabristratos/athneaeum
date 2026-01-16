import { useState, useCallback, useEffect, useMemo } from 'react';
import { Share, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timer02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useMMKVString } from 'react-native-mmkv';
import { Q } from '@nozbe/watermelondb';
import { useBookDetailScrollAnimations } from './useBookDetailScrollAnimations';
import { useToast } from '@/stores/toastStore';
import { queryKeys } from '@/lib/queryKeys';
import { booksApi } from '@/api/books';
import { database } from '@/database/index';
import { scheduleSyncAfterMutation } from '@/database/sync';
import type { UserBook as WatermelonUserBook } from '@/database/models/UserBook';
import type { Book as WatermelonBook } from '@/database/models/Book';
import type { ReadThrough as WatermelonReadThrough } from '@/database/models/ReadThrough';
import type { ReadingSession as WatermelonReadingSession } from '@/database/models/ReadingSession';
import { useQuotes } from '@/hooks/useQuotes';
import {
  useTags,
  useTagActions as useWatermelonTagActions,
  useUpdateUserBookTags,
  useTogglePreference,
  useStartReread as useStartRereadHook,
  useUpdateUserBook,
  useRemoveFromLibrary,
  useAddToLibrary,
  useLogSession,
  useDeleteSession,
  useUpdateSession,
  useReadingSessions as useLocalReadingSessions,
  useReadThroughs as useLocalReadThroughs,
  useUpdateReadThroughRating,
} from '@/database/hooks';
import { storage } from '@/lib/storage';
import { useSeriesDetailQuery } from '@/queries';
import { useLibraryAuthorsQuery } from '@/queries/useAuthors';
import { useRefreshProfileMutation } from '@/queries/useDiscovery';
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
  scrollY: ReturnType<typeof useBookDetailScrollAnimations>['scrollY'];
  scrollHandler: ReturnType<typeof useBookDetailScrollAnimations>['scrollHandler'];
  fabVisible: ReturnType<typeof useBookDetailScrollAnimations>['fabVisible'];
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
  const { updateStatus, updateRating, updateProgress, updateReview, markDnf, updateBookDetails } = useUpdateUserBook();
  const { updateReadThroughRating } = useUpdateReadThroughRating();
  const { removeBook } = useRemoveFromLibrary();
  const { addBook: addToLibrary } = useAddToLibrary();
  const { logSession } = useLogSession();
  const { deleteSession } = useDeleteSession();
  const { updateSession } = useUpdateSession();
  const refreshProfile = useRefreshProfileMutation();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [localUserBookId, setLocalUserBookId] = useState<string | null>(null);

  useEffect(() => {
    const findLocalUserBook = async () => {
      const localUserBooks = await database
        .get<WatermelonUserBook>('user_books')
        .query(Q.where('server_id', route.params.userBook.id))
        .fetch();

      if (localUserBooks.length > 0) {
        setLocalUserBookId(localUserBooks[0].id);
      }
    };
    findLocalUserBook();
  }, [route.params.userBook.id]);

  const { sessions: localSessions, loading: sessionsLoading } = useLocalReadingSessions(localUserBookId ?? undefined);
  const { readThroughs: localReadThroughs, loading: readThroughsLoading } = useLocalReadThroughs(localUserBookId ?? '');

  const sessions: ReadingSession[] = useMemo(() => {
    return localSessions.map((s) => ({
      id: s.serverId ?? 0,
      local_id: s.id,
      user_book_id: s.serverUserBookId ?? 0,
      read_through_id: s.serverReadThroughId ?? null,
      date: s.sessionDate,
      pages_read: s.pagesRead,
      start_page: s.startPage,
      end_page: s.endPage,
      duration_seconds: s.durationSeconds,
      formatted_duration: null,
      notes: s.notes,
      created_at: '',
      updated_at: '',
    }));
  }, [localSessions]);

  const readThroughs: ReadThrough[] = useMemo(() => {
    return localReadThroughs.map((rt) => ({
      id: rt.serverId ?? 0,
      local_id: rt.id,
      user_book_id: rt.serverUserBookId ?? 0,
      read_number: rt.readNumber,
      status: rt.status as BookStatus,
      status_label: rt.status,
      rating: rt.rating,
      review: rt.review,
      is_dnf: rt.isDnf,
      dnf_reason: rt.dnfReason,
      started_at: rt.startedAt?.toISOString() ?? null,
      finished_at: rt.finishedAt?.toISOString() ?? null,
      created_at: '',
      updated_at: '',
    }));
  }, [localReadThroughs]);

  const readCount = useMemo(() => {
    return localReadThroughs.length;
  }, [localReadThroughs]);

  const [measuredHeroHeight, setMeasuredHeroHeight] = useState<number | null>(null);

  const stageHeight = measuredHeroHeight ?? windowHeight * STAGE_HEIGHT_PERCENT;

  const { scrollY, scrollHandler, fabVisible } = useBookDetailScrollAnimations({
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { tags: watermelonTags } = useTags();
  const { createTag: createWatermelonTag } = useWatermelonTagActions();
  const { updateTags: updateUserBookTags } = useUpdateUserBookTags();
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
  const { toggleAuthor } = useTogglePreference();
  const { startReread: startRereadLocal } = useStartRereadHook();

  useFocusEffect(
    useCallback(() => {
      const refreshBook = async () => {
        try {
          const freshBook = await booksApi.getUserBook(route.params.userBook.id);
          setUserBook(freshBook);
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

  const performReread = useCallback(async () => {
    setUpdating(true);
    try {
      const localUserBooks = await database
        .get<WatermelonUserBook>('user_books')
        .query(Q.where('server_id', userBook.id))
        .fetch();

      if (localUserBooks.length === 0) {
        throw new Error('Local user book not found');
      }

      await startRereadLocal(localUserBooks[0].id);
      const freshBook = await booksApi.getUserBook(userBook.id);
      setUserBook(freshBook);
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      toast.success('Re-reading started');
    } catch (err) {
      showError('Failed to start re-read');
    } finally {
      setUpdating(false);
    }
  }, [userBook.id, startRereadLocal, showError, toast, queryClient]);

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!localUserBookId) return;

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
        await updateStatus(localUserBookId, status as BookStatus);
        setUserBook((prev) => ({ ...prev, status: status as BookStatus }));
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });

        if (status === 'read') {
          refreshProfile.mutate();
          queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });
        }

        toast.success('Status updated');
      } catch (err) {
        showError('Failed to update status');
      } finally {
        setUpdating(false);
      }
    },
    [localUserBookId, userBook.status, userBook.finished_at, updateStatus, showError, performReread, toast, queryClient, refreshProfile]
  );

  const handleRatingChange = useCallback(
    async (rating: number) => {
      if (!localUserBookId) return;

      setUpdating(true);
      try {
        await updateRating(localUserBookId, rating);
        setUserBook((prev) => ({ ...prev, rating }));
        toast.success('Rating saved');
      } catch (err) {
        showError('Failed to update rating');
      } finally {
        setUpdating(false);
      }
    },
    [localUserBookId, updateRating, showError, toast]
  );

  const handleLogSession = useCallback(
    async (data: {
      endPage: number;
      durationSeconds?: number;
      notes?: string;
      date: string;
    }) => {
      if (!localUserBookId) return;

      const pagesRead = data.endPage - userBook.current_page;

      try {
        await logSession({
          userBookId: localUserBookId,
          date: data.date,
          pagesRead,
          startPage: userBook.current_page,
          endPage: data.endPage,
          durationSeconds: data.durationSeconds,
          notes: data.notes,
        });

        setUserBook((prev) => ({ ...prev, current_page: data.endPage }));
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
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
    [localUserBookId, userBook.current_page, logSession, toast, navigation, queryClient]
  );

  const handleQuickProgress = useCallback(
    async (newPage: number) => {
      if (!localUserBookId) return;

      try {
        const pagesRead = newPage - userBook.current_page;

        if (pagesRead > 0) {
          await logSession({
            userBookId: localUserBookId,
            date: new Date().toISOString().split('T')[0],
            pagesRead,
            startPage: userBook.current_page,
            endPage: newPage,
          });

          setUserBook((prev) => ({ ...prev, current_page: newPage }));
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
          toast.success('Progress saved', {
            action: {
              label: 'Stats',
              onPress: () => navigation.navigate('MainTabs', { screen: 'StatsTab' } as any),
            },
          });
        } else {
          await updateProgress(localUserBookId, newPage);
          setUserBook((prev) => ({ ...prev, current_page: newPage }));
          toast.success('Progress saved');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save progress';
        toast.danger(message);
      }
    },
    [localUserBookId, userBook.current_page, updateProgress, logSession, toast, navigation, queryClient]
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
      if (!localUserBookId) return;

      setUpdating(true);
      try {
        await markDnf(localUserBookId, reason);
        setUserBook((prev) => ({
          ...prev,
          status: 'dnf',
          is_dnf: true,
          dnf_reason: reason,
        }));
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });

        refreshProfile.mutate();
        queryClient.invalidateQueries({ queryKey: queryKeys.discovery.all });

        toast.success('Marked as Did Not Finish');
      } catch (err) {
        showError('Failed to mark as DNF');
      } finally {
        setUpdating(false);
      }
    },
    [localUserBookId, markDnf, showError, toast, queryClient, refreshProfile]
  );

  const performRemove = useCallback(async () => {
    if (!localUserBookId) return;

    const bookData = {
      externalId: userBook.book.external_id ?? '',
      externalProvider: userBook.book.external_provider ?? undefined,
      title: userBook.book.title,
      author: userBook.book.author,
      coverUrl: userBook.book.cover_url ?? undefined,
      pageCount: userBook.book.page_count ?? undefined,
      isbn: userBook.book.isbn ?? undefined,
      description: userBook.book.description ?? undefined,
      genres: userBook.book.genres?.map((g) => g.name),
      publishedDate: userBook.book.published_date ?? undefined,
    };

    try {
      await removeBook(localUserBookId);
      queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      navigation.goBack();

      toast.undo('Removed from library', async () => {
        try {
          await addToLibrary(bookData, userBook.status);
          queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
          queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
          toast.success('Book restored');
        } catch {
          toast.danger('Failed to restore book');
        }
      });
    } catch {
      showError('Failed to remove book');
    }
  }, [localUserBookId, userBook, removeBook, addToLibrary, navigation, showError, toast, queryClient]);

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
      const session = sessions.find((s) => s.id === sessionId);
      const localSessionId = (session as any)?.local_id;

      if (!localSessionId) {
        toast.danger('Session not found');
        return;
      }

      try {
        await updateSession(localSessionId, {
          date: data.date,
          startPage: data.start_page,
          endPage: data.end_page,
          durationSeconds: data.duration_seconds,
          notes: data.notes,
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        toast.success('Session updated');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update session';
        toast.danger(message);
      }
    },
    [sessions, updateSession, toast, queryClient]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number) => {
      const sessionToDelete = sessions.find((s) => s.id === sessionId);
      const localSessionId = (sessionToDelete as any)?.local_id;

      if (!sessionToDelete || !localSessionId || !localUserBookId) {
        toast.danger('Session not found');
        return;
      }

      const savedSessionData = {
        userBookId: localUserBookId,
        date: sessionToDelete.date,
        pagesRead: sessionToDelete.pages_read,
        startPage: sessionToDelete.start_page,
        endPage: sessionToDelete.end_page,
        durationSeconds: sessionToDelete.duration_seconds ?? undefined,
        notes: sessionToDelete.notes ?? undefined,
      };

      try {
        await deleteSession(localSessionId);
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
        toast.undo('Session deleted', async () => {
          try {
            await logSession(savedSessionData);
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
    [sessions, localUserBookId, deleteSession, logSession, toast, queryClient]
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
    async (tagIds: number[]) => {
      if (!localUserBookId) return;

      try {
        await updateUserBookTags(localUserBookId, tagIds);
        tagIds.forEach((id) => markTagUsed(id));

        const updatedTags = tags.filter((t) => tagIds.includes(t.id));
        setUserBook((prev) => ({ ...prev, tags: updatedTags }));

        toast.success('Tags updated');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save tags';
        toast.danger(message);
      }
      setShowTagPicker(false);
    },
    [localUserBookId, updateUserBookTags, markTagUsed, tags, toast]
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
      if (!localUserBookId) return;

      setUpdating(true);
      try {
        await updateBookDetails(localUserBookId, format, price);
        setUserBook((prev) => ({ ...prev, format, price }));
        toast.success('Details saved');
      } catch (err) {
        showError('Failed to save details');
      } finally {
        setUpdating(false);
      }
    },
    [localUserBookId, updateBookDetails, showError, toast]
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
      if (!localUserBookId) return;

      setUpdating(true);
      try {
        await updateReview(localUserBookId, review);
        setUserBook((prev) => ({ ...prev, review }));
        toast.success('Review saved');
      } catch (err) {
        showError('Failed to save review');
      } finally {
        setUpdating(false);
      }
    },
    [localUserBookId, updateReview, showError, toast]
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
      const existingUserBooks = await database
        .get<WatermelonUserBook>('user_books')
        .query(
          Q.where('server_book_id', nextInSeries.book.id),
          Q.where('is_deleted', false)
        )
        .fetch();

      if (existingUserBooks.length > 0) {
        const localUserBook = existingUserBooks[0];
        const localBook = await database
          .get<WatermelonBook>('books')
          .find(localUserBook.bookId);

        const existingBook: UserBook = {
          id: localUserBook.serverId ?? 0,
          local_id: localUserBook.id,
          book_id: localBook.serverId ?? 0,
          book: nextInSeries.book,
          status: localUserBook.status,
          status_label: localUserBook.status,
          format: localUserBook.format as BookFormat | null,
          format_label: localUserBook.format,
          rating: localUserBook.rating,
          price: localUserBook.price,
          current_page: localUserBook.currentPage,
          progress_percentage: localBook.pageCount ? Math.round((localUserBook.currentPage / localBook.pageCount) * 100) : null,
          is_dnf: localUserBook.isDnf,
          dnf_reason: localUserBook.dnfReason,
          is_pinned: localUserBook.isPinned,
          queue_position: localUserBook.queuePosition,
          review: localUserBook.review,
          started_at: localUserBook.startedAt?.toISOString() ?? null,
          finished_at: localUserBook.finishedAt?.toISOString() ?? null,
          created_at: localUserBook.createdAt?.toISOString() ?? '',
          updated_at: localUserBook.updatedAt?.toISOString() ?? '',
        };

        navigation.push('BookDetail', { userBook: existingBook });
      } else {
        await addToLibrary({
          externalId: nextInSeries.book.external_id ?? '',
          externalProvider: nextInSeries.book.external_provider ?? undefined,
          title: nextInSeries.book.title,
          author: nextInSeries.book.author,
          coverUrl: nextInSeries.book.cover_url ?? undefined,
          pageCount: nextInSeries.book.page_count ?? undefined,
          isbn: nextInSeries.book.isbn ?? undefined,
          description: nextInSeries.book.description ?? undefined,
          genres: nextInSeries.book.genres?.map((g) => g.name),
          publishedDate: nextInSeries.book.published_date ?? undefined,
        }, 'want_to_read');

        queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
        toast.success('Added to library');

        const newUserBooks = await database
          .get<WatermelonUserBook>('user_books')
          .query(
            Q.where('server_book_id', nextInSeries.book.id),
            Q.where('is_deleted', false)
          )
          .fetch();

        if (newUserBooks.length > 0) {
          const newLocalUserBook = newUserBooks[0];
          const newLocalBook = await database
            .get<WatermelonBook>('books')
            .find(newLocalUserBook.bookId);

          const newUserBook: UserBook = {
            id: newLocalUserBook.serverId ?? 0,
            local_id: newLocalUserBook.id,
            book_id: newLocalBook.serverId ?? 0,
            book: nextInSeries.book,
            status: newLocalUserBook.status,
            status_label: newLocalUserBook.status,
            format: newLocalUserBook.format as BookFormat | null,
            format_label: newLocalUserBook.format,
            rating: newLocalUserBook.rating,
            price: newLocalUserBook.price,
            current_page: newLocalUserBook.currentPage,
            progress_percentage: newLocalBook.pageCount ? Math.round((newLocalUserBook.currentPage / newLocalBook.pageCount) * 100) : null,
            is_dnf: newLocalUserBook.isDnf,
            dnf_reason: newLocalUserBook.dnfReason,
            is_pinned: newLocalUserBook.isPinned,
            queue_position: newLocalUserBook.queuePosition,
            review: newLocalUserBook.review,
            started_at: newLocalUserBook.startedAt?.toISOString() ?? null,
            finished_at: newLocalUserBook.finishedAt?.toISOString() ?? null,
            created_at: newLocalUserBook.createdAt?.toISOString() ?? '',
            updated_at: newLocalUserBook.updatedAt?.toISOString() ?? '',
          };

          navigation.push('BookDetail', { userBook: newUserBook });
        }
      }
    } catch (err) {
      toast.danger('Failed to load next book');
    }
  }, [nextInSeries, addToLibrary, navigation, queryClient, toast]);

  const handleReadThroughRatingChange = useCallback(
    async (readThroughId: number, rating: number) => {
      const readThrough = readThroughs.find((rt) => rt.id === readThroughId);
      const localReadThroughId = readThrough?.local_id;

      if (!localReadThroughId) {
        showError('Read-through not found');
        return;
      }

      try {
        await updateReadThroughRating(localReadThroughId, rating);
        toast.success('Rating saved');
      } catch (err) {
        showError('Failed to save rating');
      }
    },
    [readThroughs, updateReadThroughRating, showError, toast]
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

  const handleAuthorFavorite = useCallback(async () => {
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

    await toggleAuthor(showAuthorSheet.authorName, currentState, newState);
  }, [showAuthorSheet, toggleAuthor]);

  const handleAuthorExclude = useCallback(async () => {
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

    await toggleAuthor(showAuthorSheet.authorName, currentState, newState);
  }, [showAuthorSheet, toggleAuthor]);

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
