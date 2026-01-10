import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { ConfirmModal, type ModalStatus } from '@/components/ConfirmModal';
import { useTheme } from '@/themes';
import { iconSizes, componentSizes } from '@/themes/shared';
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
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

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (today.getTime() - compareDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function toISODateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00');
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
        const hrs = Math.floor(session.duration_seconds / 3600);
        const mins = Math.floor((session.duration_seconds % 3600) / 60);
        setHours(hrs > 0 ? hrs.toString() : '');
        setMinutes(mins > 0 || hrs > 0 ? mins.toString() : '');
      } else {
        setHours('');
        setMinutes('');
      }
      setNotes(session.notes || '');
    }
  }, [visible, session]);

  // Date navigation
  const handlePreviousDay = useCallback(() => {
    setSessionDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  }, []);

  const handleNextDay = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(sessionDate);
    current.setHours(0, 0, 0, 0);

    if (current < today) {
      setSessionDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + 1);
        return newDate;
      });
    }
  }, [sessionDate]);

  const isToday = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const current = new Date(sessionDate);
    current.setHours(0, 0, 0, 0);
    return current.getTime() === today.getTime();
  }, [sessionDate]);

  // Calculate duration in seconds
  const getDurationSeconds = useCallback(() => {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    return h * 3600 + m * 60;
  }, [hours, minutes]);

  // Validation
  const isValid = useCallback(() => {
    const start = parseInt(startPage, 10);
    const end = parseInt(endPage, 10);
    return !isNaN(start) && !isNaN(end) && end > start && start >= 0;
  }, [startPage, endPage]);

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
              {/* Date selector */}
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                  Date
                </Text>
                <View style={[styles.dateRow, { gap: theme.spacing.md }]}>
                  <TouchableOpacity
                    onPress={handlePreviousDay}
                    style={[
                      styles.dateButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderWidth: theme.borders.thin,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Icon
                      icon={ArrowLeft02Icon}
                      size={iconSizes.md}
                      color={theme.colors.foreground}
                    />
                  </TouchableOpacity>

                  <View
                    style={{
                      backgroundColor: theme.colors.surface,
                      paddingVertical: theme.spacing.sm,
                      paddingHorizontal: theme.spacing.lg,
                      borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                      borderWidth: theme.borders.thin,
                      borderColor: theme.colors.border,
                      minWidth: 120,
                      alignItems: 'center',
                    }}
                  >
                    <Text variant="body">{formatDate(toISODateString(sessionDate))}</Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleNextDay}
                    disabled={isToday()}
                    style={[
                      styles.dateButton,
                      {
                        backgroundColor: theme.colors.surface,
                        borderWidth: theme.borders.thin,
                        borderColor: theme.colors.border,
                        opacity: isToday() ? 0.4 : 1,
                      },
                    ]}
                  >
                    <Icon
                      icon={ArrowRight02Icon}
                      size={iconSizes.md}
                      color={theme.colors.foreground}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Page range */}
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                  Pages
                </Text>
                <View style={[styles.pageRow, { gap: theme.spacing.md }]}>
                  <View style={styles.pageInputContainer}>
                    <TextInput
                      value={startPage}
                      onChangeText={setStartPage}
                      placeholder="Start"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderWidth: theme.borders.thin,
                        borderColor: theme.colors.border,
                        borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                        padding: theme.spacing.md,
                        fontFamily: theme.fonts.body,
                        fontSize: 18,
                        color: theme.colors.foreground,
                        textAlign: 'center',
                      }}
                    />
                    <Text variant="caption" muted style={[styles.inputLabel, { marginTop: theme.spacing.xs }]}>
                      Start page
                    </Text>
                  </View>

                  <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                    —
                  </Text>

                  <View style={styles.pageInputContainer}>
                    <TextInput
                      value={endPage}
                      onChangeText={setEndPage}
                      placeholder="End"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      keyboardType="number-pad"
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderWidth: theme.borders.thin,
                        borderColor: theme.colors.border,
                        borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                        padding: theme.spacing.md,
                        fontFamily: theme.fonts.body,
                        fontSize: 18,
                        color: theme.colors.foreground,
                        textAlign: 'center',
                      }}
                    />
                    <Text variant="caption" muted style={[styles.inputLabel, { marginTop: theme.spacing.xs }]}>
                      End page
                    </Text>
                  </View>
                </View>
                {parseInt(endPage, 10) <= parseInt(startPage, 10) &&
                  startPage !== '' &&
                  endPage !== '' && (
                    <Text variant="caption" style={[styles.errorText, { color: theme.colors.danger }]}>
                      End page must be greater than start page
                    </Text>
                  )}
              </View>

              {/* Duration */}
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                  Duration (optional)
                </Text>
                <View style={[styles.durationRow, { gap: theme.spacing.md }]}>
                  <View style={styles.durationInputContainer}>
                    <TextInput
                      value={hours}
                      onChangeText={setHours}
                      placeholder="0"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={[
                        styles.durationInput,
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
                    <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
                      hours
                    </Text>
                  </View>

                  <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                    :
                  </Text>

                  <View style={styles.durationInputContainer}>
                    <TextInput
                      value={minutes}
                      onChangeText={setMinutes}
                      placeholder="0"
                      placeholderTextColor={theme.colors.foregroundMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      style={[
                        styles.durationInput,
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
                    <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
                      minutes
                    </Text>
                  </View>
                </View>
              </View>

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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    width: componentSizes.buttonHeight.md,
    height: componentSizes.buttonHeight.md,
    borderRadius: componentSizes.buttonHeight.md / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInputContainer: {
    flex: 1,
  },
  inputLabel: {
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationInputContainer: {
    alignItems: 'center',
  },
  durationInput: {
    fontSize: 18,
    textAlign: 'center',
    width: componentSizes.fabSize + 4,
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
