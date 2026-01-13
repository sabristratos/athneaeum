import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { formatRelativeDate, isToday as isTodayDate, startOfDay } from '@/utils/dateUtils';

interface DateSelectorProps {
  value: Date;
  onChange: (date: Date) => void;
  maxDate?: Date;
  label?: string;
  formatDisplay?: (date: Date) => string;
}

export function DateSelector({
  value,
  onChange,
  maxDate,
  label,
  formatDisplay = formatRelativeDate,
}: DateSelectorProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const effectiveMaxDate = maxDate ?? new Date();

  const canGoForward = useCallback(() => {
    const current = startOfDay(value);
    const max = startOfDay(effectiveMaxDate);
    return current < max;
  }, [value, effectiveMaxDate]);

  const handlePreviousDay = useCallback(() => {
    const newDate = new Date(value);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  }, [value, onChange]);

  const handleNextDay = useCallback(() => {
    if (!canGoForward()) return;
    const newDate = new Date(value);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  }, [value, onChange, canGoForward]);

  const isForwardDisabled = !canGoForward();

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
          {label}
        </Text>
      )}
      <View style={styles.row}>
        <TouchableOpacity
          onPress={handlePreviousDay}
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.surface,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Icon
            icon={ArrowLeft02Icon}
            size={20}
            color={theme.colors.foreground}
          />
        </TouchableOpacity>

        <View
          style={[
            styles.dateDisplay,
            {
              backgroundColor: theme.colors.surface,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.lg,
              borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text variant="body">{formatDisplay(value)}</Text>
        </View>

        <TouchableOpacity
          onPress={handleNextDay}
          disabled={isForwardDisabled}
          style={[
            styles.button,
            {
              backgroundColor: theme.colors.surface,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              opacity: isForwardDisabled ? 0.4 : 1,
            },
          ]}
        >
          <Icon
            icon={ArrowRight02Icon}
            size={20}
            color={theme.colors.foreground}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    minWidth: 120,
    alignItems: 'center',
  },
});
