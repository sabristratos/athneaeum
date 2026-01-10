import { useState, useCallback, useEffect, useMemo } from 'react';
import { Share, useWindowDimensions } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Timer02Icon, PencilEdit01Icon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollAnimations } from '@/hooks';
import { useLibrary, useReadingSessions } from '@/hooks/useBooks';
import { useQuotes } from '@/hooks/useQuotes';
import type {
  UserBook,
  BookStatus,
  Quote,
  QuoteMood,
  ReadingSession,
  Book,
} from '@/types';
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
  editingQuote: Quote | undefined;
  modal: ModalState;
  measuredHeroHeight: number | null;
  sessions: ReadingSession[];
  quotes: Quote[];
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
  handleShare: () => Promise<void>;
  handleDnf: (reason: string) => Promise<void>;
  handleRemove: () => void;
  handleSaveQuote: (data: {
    text: string;
    pageNumber?: number;
    note?: string;
    mood?: QuoteMood;
  }) => void;
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
}

export interface BookDetailControllerComputed {
  statusOptions: StatusOption[];
  fabConfig: FabConfig;
  showProgress: boolean;
  showDnfAction: boolean;
  stageHeight: number;
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

export function useBookDetailController(): BookDetailControllerReturn {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<BookDetailRouteProp>();
  const { updateBook, removeBook } = useLibrary();
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
  const [editingQuote, setEditingQuote] = useState<Quote | undefined>();
  const [modal, setModal] = useState<ModalState>(initialModalState);

  const book = userBook.book;
  const { quotes, createQuote, editQuote, removeQuote } = useQuotes(userBook.id);

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
      const updated = await updateBook(userBook.id, {
        status: 'reading' as BookStatus,
        current_page: 0,
        started_at: null,
        finished_at: null,
      });
      if (updated) {
        setUserBook(updated);
      }
    } catch (err) {
      showError('Failed to start re-read');
    } finally {
      setUpdating(false);
    }
  }, [userBook.id, updateBook, showError]);

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
        }
      } catch (err) {
        showError('Failed to update status');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, userBook.status, userBook.finished_at, updateBook, showError, performReread]
  );

  const handleRatingChange = useCallback(
    async (rating: number) => {
      setUpdating(true);
      try {
        const updated = await updateBook(userBook.id, { rating });
        if (updated) {
          setUserBook(updated);
        }
      } catch (err) {
        showError('Failed to update rating');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError]
  );

  const handleLogSession = useCallback(
    async (data: {
      endPage: number;
      durationSeconds?: number;
      notes?: string;
      date: string;
    }) => {
      await logSession({
        user_book_id: userBook.id,
        date: data.date,
        start_page: userBook.current_page,
        end_page: data.endPage,
        duration_seconds: data.durationSeconds,
        notes: data.notes,
      });

      const updated = await updateBook(userBook.id, { current_page: data.endPage });
      if (updated) {
        setUserBook(updated);
      }
      fetchSessions();
    },
    [userBook, logSession, updateBook, fetchSessions]
  );

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I'm reading "${book.title}" by ${book.author}`,
        title: book.title,
      });
    } catch (error) {
    }
  }, [book]);

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
        }
      } catch (err) {
        showError('Failed to mark as DNF');
      } finally {
        setUpdating(false);
      }
    },
    [userBook.id, updateBook, showError]
  );

  const performRemove = useCallback(async () => {
    const success = await removeBook(userBook.id);
    if (success) {
      navigation.goBack();
    } else {
      showError('Failed to remove book');
    }
  }, [userBook.id, removeBook, navigation, showError]);

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
      await updateSession(sessionId, data);
    },
    [updateSession]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number) => {
      await deleteSession(sessionId);
    },
    [deleteSession]
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

  const showProgress = userBook.status === 'reading' && !!book.page_count;
  const showDnfAction = userBook.status !== 'dnf' && userBook.status !== 'read';

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
    handleShare,
    handleDnf,
    handleRemove,
    handleSaveQuote,
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
    statusOptions,
    fabConfig,
    showProgress,
    showDnfAction,
    stageHeight,
    scrollY,
    scrollHandler,
    fabVisible,
    insets,
  };
}
