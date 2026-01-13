import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  clearAllToasts: () => {
    set({ toasts: [] });
  },
}));

export const useToasts = () => useToastStore((state) => state?.toasts ?? []);

export const useToastActions = () =>
  useToastStore(
    useShallow((state) => ({
      addToast: state.addToast,
      removeToast: state.removeToast,
      clearAllToasts: state.clearAllToasts,
    }))
  );

interface ToastOptions {
  duration?: number;
  action?: ToastAction;
}

export function useToast() {
  const { addToast, removeToast, clearAllToasts } = useToastActions();

  return {
    show: (message: string, variant: ToastVariant = 'info', options?: ToastOptions) =>
      addToast({ message, variant, duration: options?.duration, action: options?.action }),
    success: (message: string, options?: ToastOptions) =>
      addToast({ message, variant: 'success', duration: options?.duration, action: options?.action }),
    danger: (message: string, options?: ToastOptions) =>
      addToast({ message, variant: 'danger', duration: options?.duration, action: options?.action }),
    warning: (message: string, options?: ToastOptions) =>
      addToast({ message, variant: 'warning', duration: options?.duration, action: options?.action }),
    info: (message: string, options?: ToastOptions) =>
      addToast({ message, variant: 'info', duration: options?.duration, action: options?.action }),
    undo: (message: string, onUndo: () => void, options?: Omit<ToastOptions, 'action'>) =>
      addToast({
        message,
        variant: 'info',
        duration: options?.duration ?? 5000,
        action: { label: 'Undo', onPress: onUndo },
      }),
    dismiss: removeToast,
    clearAll: clearAllToasts,
  };
}
