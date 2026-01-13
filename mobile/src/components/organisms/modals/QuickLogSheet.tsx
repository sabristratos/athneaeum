import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, TextInput, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Text, Button, Icon, Pressable } from '@/components/atoms';
import { SegmentedControl } from '@/components/molecules';
import { DateSelector, DurationInput } from '@/components/molecules';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import { ArrowDown01Icon, ArrowUp01Icon, Time04Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useToast } from '@/stores/toastStore';
import { toISODateString, formatRelativeDate, durationToSeconds } from '@/utils/dateUtils';
import {
  usePreferences,
  usePreferencesActions,
  type ProgressInputMode,
} from '@/stores/preferencesStore';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QUICK_INCREMENTS = [10, 25, 50];
const PERCENTAGE_INCREMENTS = [5, 10, 25];

interface QuickLogSheetProps {
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
}

const MODE_OPTIONS: { key: ProgressInputMode; label: string }[] = [
  { key: 'increment', label: '+Pages' },
  { key: 'absolute', label: 'Page #' },
  { key: 'percentage', label: '%' },
];

export function QuickLogSheet({
  visible,
  onClose,
  onSave,
  currentPage,
  totalPages,
  bookTitle,
}: QuickLogSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const toast = useToast();
  const preferences = usePreferences();
  const { setPreference } = usePreferencesActions();

  const [inputMode, setInputMode] = useState<ProgressInputMode>(preferences.progressInputMode);
  const [inputValue, setInputValue] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [sessionDate, setSessionDate] = useState(new Date());
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const currentPercentage = useMemo(() => {
    if (!totalPages || totalPages === 0) return 0;
    return Math.round((currentPage / totalPages) * 100);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (visible) {
      setInputMode(preferences.progressInputMode);
      setShowDetails(false);
      setSessionDate(new Date());
      setManualHours('');
      setManualMinutes('');
      setNotes('');

      if (preferences.progressInputMode === 'increment') {
        setInputValue('20');
      } else if (preferences.progressInputMode === 'percentage') {
        const suggestedPercent = Math.min(currentPercentage + 5, 100);
        setInputValue(suggestedPercent > currentPercentage ? suggestedPercent.toString() : '');
      } else {
        const suggestedPage = Math.min(currentPage + 20, totalPages || currentPage + 20);
        setInputValue(suggestedPage > currentPage ? suggestedPage.toString() : '');
      }
    }
  }, [visible, currentPage, totalPages, currentPercentage, preferences.progressInputMode]);

  const handleModeChange = useCallback(
    (mode: ProgressInputMode) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setInputMode(mode);
      setPreference('progressInputMode', mode);
      triggerHaptic('light');

      if (mode === 'increment') {
        setInputValue('20');
      } else if (mode === 'percentage') {
        const suggestedPercent = Math.min(currentPercentage + 5, 100);
        setInputValue(suggestedPercent > currentPercentage ? suggestedPercent.toString() : '');
      } else {
        const suggestedPage = Math.min(currentPage + 20, totalPages || currentPage + 20);
        setInputValue(suggestedPage > currentPage ? suggestedPage.toString() : '');
      }
    },
    [currentPage, totalPages, currentPercentage, setPreference]
  );

  const handleQuickIncrement = useCallback(
    (increment: number) => {
      if (inputMode === 'percentage') {
        const currentVal = parseInt(inputValue, 10) || currentPercentage;
        const newPercent = Math.min(currentVal + increment, 100);
        setInputValue(newPercent.toString());
      } else if (inputMode === 'increment') {
        const currentVal = parseInt(inputValue, 10) || 0;
        setInputValue((currentVal + increment).toString());
      } else {
        const current = parseInt(inputValue, 10) || currentPage;
        const newPage = Math.min(current + increment, totalPages || current + increment);
        setInputValue(newPage.toString());
      }
      triggerHaptic('light');
    },
    [inputMode, inputValue, currentPage, totalPages, currentPercentage]
  );

  const handleChangeText = useCallback((text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setInputValue(numericText);
  }, []);

  const toggleDetails = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDetails((prev) => !prev);
    triggerHaptic('light');
  }, []);

  const { endPageNum, isValid, pagesRead } = useMemo(() => {
    const value = parseInt(inputValue, 10) || 0;
    let calculatedEndPage: number;

    if (inputMode === 'increment') {
      calculatedEndPage = currentPage + value;
    } else if (inputMode === 'percentage') {
      if (!totalPages) {
        return { endPageNum: 0, isValid: false, pagesRead: 0 };
      }
      calculatedEndPage = Math.round((value / 100) * totalPages);
    } else {
      calculatedEndPage = value;
    }

    const valid = calculatedEndPage > currentPage && (!totalPages || calculatedEndPage <= totalPages);
    const pages = valid ? calculatedEndPage - currentPage : 0;

    return { endPageNum: calculatedEndPage, isValid: valid, pagesRead: pages };
  }, [inputMode, inputValue, currentPage, totalPages]);

  const handleSave = useCallback(async () => {
    if (!isValid) {
      triggerHaptic('error');
      return;
    }

    const hours = parseInt(manualHours, 10) || 0;
    const minutes = parseInt(manualMinutes, 10) || 0;
    const durationSeconds = durationToSeconds(hours, minutes);

    setSaving(true);
    try {
      await onSave({
        endPage: endPageNum,
        durationSeconds: durationSeconds > 0 ? durationSeconds : undefined,
        notes: notes.trim() || undefined,
        date: toISODateString(sessionDate),
      });
      onClose();
    } catch (error) {
      triggerHaptic('error');
      toast.danger(
        error instanceof Error ? error.message : 'Failed to save session'
      );
    } finally {
      setSaving(false);
    }
  }, [isValid, endPageNum, manualHours, manualMinutes, notes, sessionDate, onSave, onClose, toast]);

  const inputLabel = useMemo(() => {
    if (inputMode === 'increment') {
      return 'Pages read:';
    } else if (inputMode === 'percentage') {
      return 'New progress:';
    }
    return 'I read to page:';
  }, [inputMode]);

  const inputPlaceholder = useMemo(() => {
    if (inputMode === 'increment') {
      return '+20';
    } else if (inputMode === 'percentage') {
      return `${currentPercentage}%`;
    }
    return 'Page #';
  }, [inputMode, currentPercentage]);

  const quickIncrements = inputMode === 'percentage' ? PERCENTAGE_INCREMENTS : QUICK_INCREMENTS;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'Log Reading' : 'Quick Log'}
      subtitle={bookTitle}
      maxHeight="80%"
      scrollable
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
            Currently on page {currentPage}
            {totalPages ? ` of ${totalPages}` : ''}
            {inputMode === 'percentage' && totalPages ? ` (${currentPercentage}%)` : ''}
          </Text>
        </View>

        <View style={{ marginBottom: theme.spacing.md }}>
          <SegmentedControl
            options={MODE_OPTIONS}
            selected={inputMode}
            onSelect={(mode) => handleModeChange(mode as ProgressInputMode)}
          />
        </View>

        <View style={styles.inputSection}>
          <Text variant="label" style={{ color: theme.colors.foreground }}>
            {inputLabel}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {inputMode === 'increment' && (
              <Text variant="body" style={{ color: theme.colors.primary, marginRight: 4, fontSize: 20, fontWeight: '600' }}>
                +
              </Text>
            )}
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.canvas,
                  borderColor: isValid ? theme.colors.primary : theme.colors.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.body,
                },
              ]}
              value={inputValue}
              onChangeText={handleChangeText}
              keyboardType="number-pad"
              maxLength={inputMode === 'percentage' ? 3 : 5}
              selectTextOnFocus
              placeholder={inputPlaceholder}
              placeholderTextColor={theme.colors.foregroundMuted}
            />
            {inputMode === 'percentage' && (
              <Text variant="body" style={{ color: theme.colors.primary, marginLeft: 4, fontSize: 20, fontWeight: '600' }}>
                %
              </Text>
            )}
          </View>
        </View>

        <View style={styles.quickButtons}>
          {quickIncrements.map((increment) => (
            <Pressable
              key={increment}
              onPress={() => handleQuickIncrement(increment)}
              haptic="light"
              activeScale={0.95}
              style={[
                styles.quickButton,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{
                  color: theme.colors.primary,
                  fontWeight: '600',
                }}
              >
                +{increment}{inputMode === 'percentage' ? '%' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {pagesRead > 0 && (
          <Text
            variant="caption"
            style={{
              color: theme.colors.success,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            {pagesRead} pages read{inputMode !== 'absolute' ? ` (to page ${endPageNum})` : ''}
          </Text>
        )}

        <Pressable
          onPress={toggleDetails}
          haptic="light"
          style={[
            styles.detailsToggle,
            {
              borderTopWidth: theme.borders.thin,
              borderTopColor: theme.colors.border,
              marginTop: theme.spacing.lg,
              paddingTop: theme.spacing.md,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon
              icon={Time04Icon}
              size={16}
              color={theme.colors.foregroundMuted}
            />
            <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
              {showDetails ? 'Hide details' : 'Add duration & notes'}
            </Text>
          </View>
          <Icon
            icon={showDetails ? ArrowUp01Icon : ArrowDown01Icon}
            size={16}
            color={theme.colors.foregroundMuted}
          />
        </Pressable>

        {showDetails && (
          <View style={[styles.detailsSection, { gap: theme.spacing.md }]}>
            <DateSelector
              value={sessionDate}
              onChange={setSessionDate}
              label="When did you read?"
              formatDisplay={formatRelativeDate}
            />

            <DurationInput
              hours={manualHours}
              minutes={manualMinutes}
              onHoursChange={setManualHours}
              onMinutesChange={setManualMinutes}
              label="How long? (optional)"
            />

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
          </View>
        )}

        <View style={{ marginTop: theme.spacing.lg, alignItems: 'center' }}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleSave}
            disabled={!isValid || saving}
            loading={saving}
            fullWidth
          >
            {saving ? 'Logging...' : 'Log Session'}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  input: {
    width: 100,
    height: 48,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  detailsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailsSection: {
    paddingTop: 8,
  },
});
