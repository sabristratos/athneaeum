import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Book01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Pressable } from '@/components/atoms';
import { Input } from '@/components/molecules';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import type { BookStatus } from '@/types';

interface ManualBookEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: ManualBookData) => Promise<void>;
  initialQuery?: string;
}

export interface ManualBookData {
  title: string;
  author: string;
  page_count?: number;
  isbn?: string;
  status: BookStatus;
}

export function ManualBookEntryModal({
  visible,
  onClose,
  onSubmit,
  initialQuery = '',
}: ManualBookEntryModalProps) {
  const { theme } = useTheme();

  const [title, setTitle] = useState(initialQuery);
  const [author, setAuthor] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [isbn, setIsbn] = useState('');
  const [status, setStatus] = useState<BookStatus>('want_to_read');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; author?: string }>({});

  const resetForm = useCallback(() => {
    setTitle(initialQuery);
    setAuthor('');
    setPageCount('');
    setIsbn('');
    setStatus('want_to_read');
    setErrors({});
  }, [initialQuery]);

  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const validate = useCallback(() => {
    const newErrors: { title?: string; author?: string } = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!author.trim()) {
      newErrors.author = 'Author is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, author]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        author: author.trim(),
        page_count: pageCount ? parseInt(pageCount, 10) : undefined,
        isbn: isbn.trim() || undefined,
        status,
      });
      handleClose();
    } catch {
      setErrors({ title: 'Failed to add book. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [title, author, pageCount, isbn, status, validate, onSubmit, handleClose]);

  const statusOptions: { value: BookStatus; label: string }[] = [
    { value: 'want_to_read', label: 'Want to Read' },
    { value: 'reading', label: 'Reading' },
  ];

  const footer = (
    <View style={[styles.footer, { gap: theme.spacing.sm }]}>
      <Button
        variant="secondary"
        onPress={handleClose}
        disabled={isSubmitting}
        fullWidth
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        onPress={handleSubmit}
        loading={isSubmitting}
        fullWidth
      >
        Add to Library
      </Button>
    </View>
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Add Book Manually"
      headerIcon={Book01Icon}
      showCloseButton
      showHeaderBorder
      scrollable
      maxHeight="90%"
      footer={footer}
      contentStyle={{ gap: theme.spacing.lg }}
    >
      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="Enter book title"
        error={errors.title}
        autoFocus
      />

      <Input
        label="Author"
        value={author}
        onChangeText={setAuthor}
        placeholder="Enter author name"
        error={errors.author}
      />

      <Input
        label="Page Count (optional)"
        value={pageCount}
        onChangeText={setPageCount}
        placeholder="e.g., 320"
        keyboardType="number-pad"
      />

      <Input
        label="ISBN (optional)"
        value={isbn}
        onChangeText={setIsbn}
        placeholder="e.g., 9780123456789"
        keyboardType="number-pad"
      />

      <View style={{ gap: theme.spacing.xs }}>
        <Text variant="label" color="muted">
          Add to shelf
        </Text>
        <View style={[styles.statusRow, { gap: theme.spacing.sm }]}>
          {statusOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => setStatus(option.value)}
              style={[
                styles.statusOption,
                {
                  borderRadius: theme.radii.md,
                  borderWidth: theme.borders.thin,
                  borderColor:
                    status === option.value
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    status === option.value
                      ? `${theme.colors.primary}15`
                      : 'transparent',
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                },
              ]}
            >
              <Text
                variant="body"
                color={status === option.value ? 'primary' : undefined}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusOption: {
    flex: 1,
    alignItems: 'center',
  },
});
