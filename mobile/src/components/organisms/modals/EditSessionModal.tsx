import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Text, Button } from '@/components/atoms';
import { DateSelector, DurationInput, PageRangeInput } from '@/components/molecules';
import { ConfirmModal, type ModalStatus } from './ConfirmModal';
import { useTheme } from '@/themes';
import { componentSizes } from '@/themes/shared';
import { formatDateFromString, toISODateString, parseDateString, secondsToDuration, durationToSeconds } from '@/utils/dateUtils';
import type { ReadingSession } from '@/types';

interface EditSessionModalProps {
  visible: boolean;
  onClose: () => void;
  session: ReadingSession | null;
  onSave: (sessionId: number, data: {
    date?: string;
    start_page?: number;
    end_page?: number;
    duration_seconds?: number | null;
    notes?: string | null;
  }) => Promise<void>;
  onDelete: (sessionId: number) => Promise<void>;
}

export function EditSessionModal({
  visible,
  onClose,
  session,
  onSave,
  onDelete,
}: EditSessionModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  // Form state
  const [sessionDate, setSessionDate] = useState(new Date());
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    status: ModalStatus;
  }>({
    visible: false,
    title: '',
    message: '',
    status: 'warning',
  });

  // Initialize form with session data
  useEffect(() => {
    if (visible && session) {
      setSessionDate(parseDateString(session.date));
      setStartPage(session.start_page.toString());
      setEndPage(session.end_page.toString());
      if (session.duration_seconds) {
        const { hours: hrs, minutes: mins } = secondsToDuration(session.duration_seconds);
        setHours(hrs > 0 ? hrs.toString() : '');
        setMinutes(mins > 0 || hrs > 0 ? mins.toString() : '');
      } else {
        setHours('');
        setMinutes('');
      }
      setNotes(session.notes || '');
    }
  }, [visible, session]);

  // Calculate duration in seconds
  const getDurationSeconds = useCallback(() => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return durationToSeconds(h, m);
  }, [hours, minutes]);

  // Validation
  const isValid = useCallback(() => {
    const start = parseInt(startPage, 10);
    const end = parseInt(endPage, 10);
    return !isNaN(start) && !isNaN(end) && end > start && start >= 0;
  }, [startPage, endPage]);

  // Page range error
  const pageRangeError =
    parseInt(endPage, 10) <= parseInt(startPage, 10) &&
    startPage !== '' &&
    endPage !== ''
      ? 'End page must be greater than start page'
      : null;

  const handleSave = useCallback(async () => {
    if (!session || !isValid()) return;

    const durationSeconds = getDurationSeconds();

    setSaving(true);
    try {
      await onSave(session.id, {
        date: toISODateString(sessionDate),
        start_page: parseInt(startPage, 10),
        end_page: parseInt(endPage, 10),
        duration_seconds: durationSeconds > 0 ? durationSeconds : null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: 'Failed to update session.',
        status: 'error',
      });
    } finally {
      setSaving(false);
    }
  }, [session, sessionDate, startPage, endPage, notes, onSave, onClose, isValid, getDurationSeconds]);

  const handleDeletePress = useCallback(() => {
    setConfirmModal({
      visible: true,
      title: 'Delete Session?',
      message: 'This will permanently remove this reading session. This action cannot be undone.',
      status: 'danger',
    });
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!session) return;

    setConfirmModal((prev) => ({ ...prev, visible: false }));
    setDeleting(true);
    try {
      await onDelete(session.id);
      onClose();
    } catch {
      setConfirmModal({
        visible: true,
        title: 'Error',
        message: 'Failed to delete session.',
        status: 'error',
      });
    } finally {
      setDeleting(false);
    }
  }, [session, onDelete, onClose]);

  if (!session) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { padding: theme.spacing.xl }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={[styles.header, { marginBottom: theme.spacing.xl }]}>
              <Text variant="h2" style={{ marginBottom: theme.spacing.sm }}>
                {isScholar ? 'Edit Session' : 'Edit Reading'}
              </Text>
              <Text variant="body" muted>
                {session.pages_read} pages read
              </Text>
            </View>

            {/* Form */}
            <View style={{ gap: theme.spacing.lg }}>
              <DateSelector
                value={sessionDate}
                onChange={setSessionDate}
                label="Date"
                formatDisplay={(date) => formatDateFromString(toISODateString(date))}
              />

              <PageRangeInput
                startPage={startPage}
                endPage={endPage}
                onStartPageChange={setStartPage}
                onEndPageChange={setEndPage}
                label="Pages"
                error={pageRangeError}
              />

              <DurationInput
                hours={hours}
                minutes={minutes}
                onHoursChange={setHours}
                onMinutesChange={setMinutes}
                label="Duration (optional)"
              />

              {/* Notes */}
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                  Notes (optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={isScholar ? 'Reflections on this passage...' : 'Any thoughts?'}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderWidth: theme.borders.thin,
                      borderColor: theme.colors.border,
                      borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                      padding: theme.spacing.md,
                      fontFamily: theme.fonts.body,
                      color: theme.colors.foreground,
                    },
                  ]}
                />
              </View>

              {/* Action buttons */}
              <View style={{ gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                <View style={[styles.buttonRow, { gap: theme.spacing.md }]}>
                  <View style={styles.buttonContainer}>
                    <Button variant="secondary" fullWidth onPress={onClose}>
                      Cancel
                    </Button>
                  </View>
                  <View style={styles.buttonContainer}>
                    <Button
                      variant="primary"
                      fullWidth
                      loading={saving}
                      onPress={handleSave}
                      disabled={!isValid()}
                    >
                      Save Changes
                    </Button>
                  </View>
                </View>

                <Button
                  variant="ghost"
                  fullWidth
                  loading={deleting}
                  onPress={handleDeletePress}
                >
                  <Text style={{ color: theme.colors.danger }}>Delete Session</Text>
                </Button>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {/* Confirmation Modal */}
      <ConfirmModal
        visible={confirmModal.visible}
        onClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        status={confirmModal.status}
        confirmLabel={confirmModal.status === 'danger' ? 'Delete' : 'OK'}
        cancelLabel={confirmModal.status === 'danger' ? 'Cancel' : undefined}
        onConfirm={confirmModal.status === 'danger' ? handleConfirmDelete : undefined}
        confirmDestructive={confirmModal.status === 'danger'}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
  },
  notesInput: {
    fontSize: 16,
    minHeight: componentSizes.buttonHeight.md * 2,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonContainer: {
    flex: 1,
  },
});
