import type { BookStatus } from '@/types';

export const STATUS_VARIANT_MAP: Record<BookStatus, 'primary' | 'success' | 'danger' | 'muted'> = {
  reading: 'primary',
  read: 'success',
  dnf: 'danger',
  want_to_read: 'muted',
};
