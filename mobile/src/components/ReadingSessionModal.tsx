import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Modal,
  TextInput,
  AppState,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { CoverImage } from '@/components/CoverImage';
import { useTheme } from '@/themes';
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Time04Icon,
  PencilEdit01Icon,
} from '@hugeicons/core-free-icons';

interface ReadingSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    endPage: number;
    durationSeconds?: number;
    notes?: string;
    date: string;
  }) => Promise<void>;
  currentPage: number;
  totalPages: number;
  bookTitle: string;
  bookCover?: string | null;
}

type Mode = 'select' | 'timer' | 'manual' | 'log';
type TimerState = 'idle' | 'running' | 'paused';

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(date: Date): string {
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

export function ReadingSessionModal({
  visible,
  onClose,
  onSave,
  currentPage,
  totalPages,
  bookTitle,
  bookCover,
}: ReadingSessionModalProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  // Mode state
  const [mode, setMode] = useState<Mode>('select');

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [wasBackgrounded, setWasBackgrounded] = useState(false);

  // Form state
  const [endPage, setEndPage] = useState('');
  const [notes, setNotes] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date());
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [saving, setSaving] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setMode('select');
      setTimerState('idle');
      setElapsedSeconds(0);
      setEndPage('');
      setNotes('');
      setSessionDate(new Date());
      setManualHours('');
      setManualMinutes('');
      setWasBackgrounded(false);
    }
  }, [visible]);

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerState]);

  // AppState detection for background warning
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' && timerState === 'running') {
        setWasBackgrounded(true);
      }
    });

    return () => subscription.remove();
  }, [timerState]);

  // Pulse animation for book cover during timer
  useEffect(() => {
    if (timerState === 'running' && mode === 'timer') {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timerState, mode, pulseAnim]);

  // Timer controls
  const handleStartTimer = useCallback(() => {
    setTimerState('running');
  }, []);

  const handlePauseTimer = useCallback(() => {
    setTimerState('paused');
  }, []);

  const handleResumeTimer = useCallback(() => {
    setTimerState('running');
  }, []);

  const handleDoneReading = useCallback(() => {
    setTimerState('idle');
    // Pre-fill with a reasonable suggestion
    const suggestedPage = Math.min(currentPage + 20, totalPages);
    setEndPage(suggestedPage.toString());
    setMode('log');
  }, [currentPage, totalPages]);

  // Mode selection handlers
  const handleSelectTimerMode = useCallback(() => {
    setMode('timer');
    setTimerState('running'); // Auto-start when entering timer mode
  }, []);

  const handleSelectManualMode = useCallback(() => {
    setMode('manual');
    const suggestedPage = Math.min(currentPage + 20, totalPages);
    setEndPage(suggestedPage.toString());
  }, [currentPage, totalPages]);

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

  // Calculate duration from manual inputs
  const getManualDurationSeconds = useCallback(() => {
    const hours = parseInt(manualHours, 10) || 0;
    const minutes = parseInt(manualMinutes, 10) || 0;
    return hours * 3600 + minutes * 60;
  }, [manualHours, manualMinutes]);

  // Form validation
  const isEndPageValid = useCallback(() => {
    const pageNum = parseInt(endPage, 10);
    return !isNaN(pageNum) && pageNum > currentPage && pageNum <= totalPages;
  }, [endPage, currentPage, totalPages]);

  const handleSave = useCallback(async () => {
    const pageNum = parseInt(endPage, 10);
    if (!isEndPageValid()) {
      return;
    }

    const durationSeconds =
      mode === 'manual' ? getManualDurationSeconds() : elapsedSeconds;

    setSaving(true);
    try {
      await onSave({
        endPage: pageNum,
        durationSeconds: durationSeconds > 0 ? durationSeconds : undefined,
        notes: notes.trim() || undefined,
        date: toISODateString(sessionDate),
      });
      onClose();
    } catch {
      // Error handling is done in parent
    } finally {
      setSaving(false);
    }
  }, [
    endPage,
    mode,
    elapsedSeconds,
    notes,
    sessionDate,
    onSave,
    onClose,
    isEndPageValid,
    getManualDurationSeconds,
  ]);

  const handleCancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerState('idle');
    onClose();
  }, [onClose]);

  // Render mode selection screen
  const renderModeSelection = () => (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
      }}
    >
      {/* Book cover */}
      <View style={{ marginBottom: theme.spacing.xl }}>
        <CoverImage uri={bookCover} size="hero" fallbackText={bookTitle} />
      </View>

      {/* Title */}
      <Text
        variant="h2"
        style={{
          textAlign: 'center',
          marginBottom: theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {isScholar ? 'Log Reading Session' : 'Log Your Reading'}
      </Text>

      <Text
        variant="body"
        muted
        style={{
          textAlign: 'center',
          marginBottom: theme.spacing.xl,
        }}
      >
        {isScholar
          ? 'How would you like to track this session?'
          : 'Choose how to log your reading'}
      </Text>

      {/* Mode buttons */}
      <View style={{ gap: theme.spacing.md, width: '100%', maxWidth: 300 }}>
        <TouchableOpacity
          onPress={handleSelectTimerMode}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.primary,
            borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon icon={Time04Icon} size={24} color={theme.colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ marginBottom: 2, fontWeight: '600' }}>
              {isScholar ? 'Use Timer' : 'Start Timer'}
            </Text>
            <Text variant="caption" muted>
              {isScholar
                ? 'Track your reading in real-time'
                : 'Time your reading session'}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSelectManualMode}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
            borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
            padding: theme.spacing.lg,
            gap: theme.spacing.md,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.surfaceAlt,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon
              icon={PencilEdit01Icon}
              size={24}
              color={theme.colors.foreground}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="body" style={{ marginBottom: 2, fontWeight: '600' }}>
              {isScholar ? 'Log Manually' : 'Enter Manually'}
            </Text>
            <Text variant="caption" muted>
              {isScholar
                ? 'Enter details without timing'
                : "I'll enter the time myself"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cancel link */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <Button variant="ghost" size="sm" onPress={handleCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );

  // Render timer screen
  const renderTimerPhase = () => (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: theme.spacing.xl,
      }}
    >
      {/* Book cover with animation */}
      <Animated.View
        style={{
          transform: [{ scale: pulseAnim }],
          marginBottom: theme.spacing.xl,
        }}
      >
        <CoverImage uri={bookCover} size="hero" fallbackText={bookTitle} />
      </Animated.View>

      {/* Book title */}
      <Text
        variant="h2"
        style={{
          textAlign: 'center',
          marginBottom: theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {bookTitle}
      </Text>

      {/* Timer display */}
      <View
        style={{
          backgroundColor: theme.colors.surface,
          paddingVertical: theme.spacing.xl,
          paddingHorizontal: theme.spacing.xl * 2,
          borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
          borderWidth: theme.borders.thin,
          borderColor:
            timerState === 'running' ? theme.colors.primary : theme.colors.border,
          marginBottom: theme.spacing.md,
        }}
      >
        <Text
          variant="h1"
          style={{
            fontSize: 48,
            fontFamily: theme.fonts.body,
            letterSpacing: 2,
            textAlign: 'center',
            color:
              timerState === 'paused'
                ? theme.colors.foregroundMuted
                : theme.colors.foreground,
          }}
        >
          {formatTime(elapsedSeconds)}
        </Text>
      </View>

      {/* Timer state label */}
      <Text
        variant="caption"
        style={{
          color:
            timerState === 'running'
              ? theme.colors.primary
              : theme.colors.foregroundMuted,
          marginBottom: theme.spacing.lg,
          textTransform: 'uppercase',
          letterSpacing: 1,
        }}
      >
        {timerState === 'running'
          ? isScholar
            ? 'Reading...'
            : 'Timer Running'
          : timerState === 'paused'
            ? 'Paused'
            : 'Ready'}
      </Text>

      {/* Focus message */}
      <Text
        variant="body"
        muted
        style={{
          textAlign: 'center',
          fontStyle: isScholar ? 'italic' : 'normal',
          marginBottom: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {timerState === 'paused'
          ? isScholar
            ? 'Take your time. Resume when ready.'
            : 'Paused. Tap resume to continue.'
          : isScholar
            ? 'Immerse yourself in the written word...'
            : 'Stay cozy and keep reading!'}
      </Text>

      {/* Background warning */}
      {wasBackgrounded && (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.warning,
            padding: theme.spacing.md,
            borderRadius: theme.radii.md,
            marginBottom: theme.spacing.lg,
          }}
        >
          <Text
            variant="caption"
            style={{ color: theme.colors.warning, textAlign: 'center' }}
          >
            You left the app. Timer continued running.
          </Text>
        </View>
      )}

      {/* Timer controls */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.md,
        }}
      >
        {timerState === 'idle' && (
          <Button variant="primary" size="lg" onPress={handleStartTimer}>
            Start Reading
          </Button>
        )}

        {timerState === 'running' && (
          <>
            <Button variant="secondary" size="md" onPress={handlePauseTimer}>
              Pause
            </Button>
            <Button variant="primary" size="md" onPress={handleDoneReading}>
              Done Reading
            </Button>
          </>
        )}

        {timerState === 'paused' && (
          <>
            <Button variant="primary" size="md" onPress={handleResumeTimer}>
              Resume
            </Button>
            <Button variant="secondary" size="md" onPress={handleDoneReading}>
              Done Reading
            </Button>
          </>
        )}
      </View>

      {/* Cancel link */}
      <View style={{ marginTop: theme.spacing.md }}>
        <Button variant="ghost" size="sm" onPress={handleCancel}>
          Cancel Session
        </Button>
      </View>
    </View>
  );

  // Render log/manual entry form
  const renderLogPhase = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={{ alignItems: 'center', marginBottom: theme.spacing.xl }}>
          <Text
            variant="h2"
            style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}
          >
            {mode === 'manual'
              ? isScholar
                ? 'Log Reading Session'
                : 'Log Your Reading'
              : isScholar
                ? 'Session Complete'
                : 'Great Reading!'}
          </Text>
          {mode !== 'manual' && elapsedSeconds > 0 && (
            <Text variant="body" muted>
              You read for {formatTime(elapsedSeconds)}
            </Text>
          )}
        </View>

        {/* Form */}
        <View style={{ gap: theme.spacing.lg }}>
          {/* Date selector */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              When did you read?
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.md,
              }}
            >
              <TouchableOpacity
                onPress={handlePreviousDay}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.border,
                }}
              >
                <Icon
                  icon={ArrowLeft02Icon}
                  size={20}
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
                <Text variant="body">{formatDate(sessionDate)}</Text>
              </View>

              <TouchableOpacity
                onPress={handleNextDay}
                disabled={isToday()}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: theme.colors.surface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.border,
                  opacity: isToday() ? 0.4 : 1,
                }}
              >
                <Icon
                  icon={ArrowRight02Icon}
                  size={20}
                  color={theme.colors.foreground}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Current page info */}
          <Text variant="label" muted style={{ textAlign: 'center' }}>
            Started at page {currentPage}
          </Text>

          {/* End page input */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              What page are you on now?
            </Text>
            <TextInput
              value={endPage}
              onChangeText={setEndPage}
              placeholder={`e.g., ${Math.min(currentPage + 20, totalPages)}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="number-pad"
              style={{
                backgroundColor: theme.colors.canvas,
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
            {parseInt(endPage, 10) <= currentPage && endPage !== '' && (
              <Text variant="caption" style={{ color: theme.colors.danger }}>
                Must be greater than {currentPage}
              </Text>
            )}
            {parseInt(endPage, 10) > totalPages && (
              <Text variant="caption" style={{ color: theme.colors.danger }}>
                Cannot exceed {totalPages} pages
              </Text>
            )}
          </View>

          {/* Manual duration input (only in manual mode) */}
          {mode === 'manual' && (
            <View style={{ gap: theme.spacing.sm }}>
              <Text
                variant="label"
                style={{ color: theme.colors.foregroundMuted }}
              >
                How long did you read? (optional)
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.md,
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <TextInput
                    value={manualHours}
                    onChangeText={setManualHours}
                    placeholder="0"
                    placeholderTextColor={theme.colors.foregroundMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{
                      backgroundColor: theme.colors.canvas,
                      borderWidth: theme.borders.thin,
                      borderColor: theme.colors.border,
                      borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                      padding: theme.spacing.md,
                      fontFamily: theme.fonts.body,
                      fontSize: 18,
                      color: theme.colors.foreground,
                      textAlign: 'center',
                      width: 60,
                    }}
                  />
                  <Text
                    variant="caption"
                    muted
                    style={{ marginTop: theme.spacing.xs }}
                  >
                    hours
                  </Text>
                </View>

                <Text variant="h3" style={{ marginBottom: theme.spacing.lg }}>
                  :
                </Text>

                <View style={{ alignItems: 'center' }}>
                  <TextInput
                    value={manualMinutes}
                    onChangeText={setManualMinutes}
                    placeholder="0"
                    placeholderTextColor={theme.colors.foregroundMuted}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={{
                      backgroundColor: theme.colors.canvas,
                      borderWidth: theme.borders.thin,
                      borderColor: theme.colors.border,
                      borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                      padding: theme.spacing.md,
                      fontFamily: theme.fonts.body,
                      fontSize: 18,
                      color: theme.colors.foreground,
                      textAlign: 'center',
                      width: 60,
                    }}
                  />
                  <Text
                    variant="caption"
                    muted
                    style={{ marginTop: theme.spacing.xs }}
                  >
                    minutes
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes input */}
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Notes (optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={
                isScholar ? 'Reflections on this passage...' : 'Any thoughts?'
              }
              placeholderTextColor={theme.colors.foregroundMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: theme.colors.canvas,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
                borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
                padding: theme.spacing.md,
                fontFamily: theme.fonts.body,
                fontSize: 16,
                color: theme.colors.foreground,
                minHeight: 80,
              }}
            />
          </View>

          {/* Action buttons */}
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.md,
              marginTop: theme.spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button variant="secondary" fullWidth onPress={handleCancel}>
                Discard
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                variant="primary"
                fullWidth
                loading={saving}
                onPress={handleSave}
                disabled={!isEndPageValid()}
              >
                Save Session
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  // Determine which screen to render
  const renderContent = () => {
    switch (mode) {
      case 'select':
        return renderModeSelection();
      case 'timer':
        return renderTimerPhase();
      case 'manual':
      case 'log':
        return renderLogPhase();
      default:
        return renderModeSelection();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.canvas,
        }}
      >
        {renderContent()}
      </View>
    </Modal>
  );
}
