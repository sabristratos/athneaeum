import { useState, useCallback } from 'react';

interface ModalStatus {
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ModalState {
  visible: boolean;
  title: string;
  message?: string;
  status: ModalStatus['type'];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmDestructive?: boolean;
}

interface AuthorSheetState {
  visible: boolean;
  authorKey: string;
  authorName: string;
  isFavorite: boolean;
  isExcluded: boolean;
}

const initialModalState: ModalState = {
  visible: false,
  title: '',
  status: 'info',
};

const initialAuthorSheetState: AuthorSheetState = {
  visible: false,
  authorKey: '',
  authorName: '',
  isFavorite: false,
  isExcluded: false,
};

export function useBookDetailModals() {
  const [showMenu, setShowMenu] = useState(false);
  const [showDnfModal, setShowDnfModal] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showBookDetailsSheet, setShowBookDetailsSheet] = useState(false);
  const [showReviewSheet, setShowReviewSheet] = useState(false);
  const [showSeriesAssignModal, setShowSeriesAssignModal] = useState(false);
  const [showAuthorSheet, setShowAuthorSheet] = useState<AuthorSheetState>(initialAuthorSheetState);
  const [modal, setModal] = useState<ModalState>(initialModalState);

  const handleOpenMenu = useCallback(() => setShowMenu(true), []);
  const handleCloseMenu = useCallback(() => setShowMenu(false), []);

  const handleOpenDnfModal = useCallback(() => setShowDnfModal(true), []);
  const handleCloseDnfModal = useCallback(() => setShowDnfModal(false), []);

  const handleOpenStatusPicker = useCallback(() => setShowStatusPicker(true), []);
  const handleCloseStatusPicker = useCallback(() => setShowStatusPicker(false), []);

  const handleOpenTagPicker = useCallback(() => setShowTagPicker(true), []);
  const handleCloseTagPicker = useCallback(() => setShowTagPicker(false), []);

  const handleOpenBookDetailsSheet = useCallback(() => setShowBookDetailsSheet(true), []);
  const handleCloseBookDetailsSheet = useCallback(() => setShowBookDetailsSheet(false), []);

  const handleOpenReviewSheet = useCallback(() => setShowReviewSheet(true), []);
  const handleCloseReviewSheet = useCallback(() => setShowReviewSheet(false), []);

  const handleOpenSeriesAssignModal = useCallback(() => setShowSeriesAssignModal(true), []);
  const handleCloseSeriesAssignModal = useCallback(() => setShowSeriesAssignModal(false), []);

  const handleOpenAuthorSheet = useCallback(
    (authorKey: string, authorName: string, isFavorite: boolean, isExcluded: boolean) => {
      setShowAuthorSheet({
        visible: true,
        authorKey,
        authorName,
        isFavorite,
        isExcluded,
      });
    },
    []
  );

  const handleCloseAuthorSheet = useCallback(() => {
    setShowAuthorSheet((prev) => ({ ...prev, visible: false }));
  }, []);

  const updateAuthorSheetFavorite = useCallback((isFavorite: boolean) => {
    setShowAuthorSheet((prev) => ({ ...prev, isFavorite, isExcluded: false }));
  }, []);

  const updateAuthorSheetExcluded = useCallback((isExcluded: boolean) => {
    setShowAuthorSheet((prev) => ({ ...prev, isExcluded, isFavorite: false }));
  }, []);

  const showConfirmModal = useCallback(
    (options: Omit<ModalState, 'visible'>) => {
      setModal({ ...options, visible: true });
    },
    []
  );

  const closeModal = useCallback(() => {
    setModal(initialModalState);
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

  return {
    showMenu,
    setShowMenu,
    showDnfModal,
    showStatusPicker,
    showTagPicker,
    setShowTagPicker,
    showBookDetailsSheet,
    showReviewSheet,
    showSeriesAssignModal,
    showAuthorSheet,
    modal,

    handleOpenMenu,
    handleCloseMenu,
    handleOpenDnfModal,
    handleCloseDnfModal,
    handleOpenStatusPicker,
    handleCloseStatusPicker,
    handleOpenTagPicker,
    handleCloseTagPicker,
    handleOpenBookDetailsSheet,
    handleCloseBookDetailsSheet,
    handleOpenReviewSheet,
    handleCloseReviewSheet,
    handleOpenSeriesAssignModal,
    handleCloseSeriesAssignModal,
    handleOpenAuthorSheet,
    handleCloseAuthorSheet,
    updateAuthorSheetFavorite,
    updateAuthorSheetExcluded,

    showConfirmModal,
    closeModal,
    showError,
  };
}

export type { ModalState, AuthorSheetState };
