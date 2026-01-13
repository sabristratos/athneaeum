import React, { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components';
import { useTheme } from '@/themes';

interface YearRangeInputProps {
  yearFrom?: number;
  yearTo?: number;
  onChange: (yearFrom?: number, yearTo?: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1800;

export function YearRangeInput({
  yearFrom,
  yearTo,
  onChange,
}: YearRangeInputProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [fromText, setFromText] = useState(yearFrom?.toString() ?? '');
  const [toText, setToText] = useState(yearTo?.toString() ?? '');
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);
  const [wasSwapped, setWasSwapped] = useState(false);

  useEffect(() => {
    setFromText(yearFrom?.toString() ?? '');
    setFromError(null);
  }, [yearFrom]);

  useEffect(() => {
    setToText(yearTo?.toString() ?? '');
    setToError(null);
  }, [yearTo]);

  useEffect(() => {
    if (wasSwapped) {
      const timer = setTimeout(() => setWasSwapped(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [wasSwapped]);

  const validateYear = (text: string): { value: number | undefined; error: string | null } => {
    if (text === '') {
      return { value: undefined, error: null };
    }

    const num = parseInt(text, 10);

    if (isNaN(num)) {
      return { value: undefined, error: 'Invalid year' };
    }

    if (num < MIN_YEAR) {
      return { value: undefined, error: `Min year is ${MIN_YEAR}` };
    }

    if (num > CURRENT_YEAR) {
      return { value: undefined, error: `Max year is ${CURRENT_YEAR}` };
    }

    return { value: num, error: null };
  };

  const normalizeYearRange = (
    from: number | undefined,
    to: number | undefined
  ): [number | undefined, number | undefined, boolean] => {
    if (from !== undefined && to !== undefined && from > to) {
      return [to, from, true];
    }
    return [from, to, false];
  };

  const handleFromChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setFromText(cleaned);
    if (fromError) setFromError(null);
    if (wasSwapped) setWasSwapped(false);
  };

  const handleToChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setToText(cleaned);
    if (toError) setToError(null);
    if (wasSwapped) setWasSwapped(false);
  };

  const handleFromBlur = () => {
    const fromValidation = validateYear(fromText);
    const toValidation = validateYear(toText);

    if (fromValidation.error) {
      setFromError(fromValidation.error);
      setFromText('');
      triggerHaptic('warning');
      onChange(undefined, toValidation.value);
      return;
    }

    setFromError(null);

    const [normalizedFrom, normalizedTo, swapped] = normalizeYearRange(
      fromValidation.value,
      toValidation.value
    );

    if (swapped) {
      setFromText(normalizedFrom?.toString() ?? '');
      setToText(normalizedTo?.toString() ?? '');
      setWasSwapped(true);
      triggerHaptic('light');
    }

    onChange(normalizedFrom, normalizedTo);
  };

  const handleToBlur = () => {
    const fromValidation = validateYear(fromText);
    const toValidation = validateYear(toText);

    if (toValidation.error) {
      setToError(toValidation.error);
      setToText('');
      triggerHaptic('warning');
      onChange(fromValidation.value, undefined);
      return;
    }

    setToError(null);

    const [normalizedFrom, normalizedTo, swapped] = normalizeYearRange(
      fromValidation.value,
      toValidation.value
    );

    if (swapped) {
      setFromText(normalizedFrom?.toString() ?? '');
      setToText(normalizedTo?.toString() ?? '');
      setWasSwapped(true);
      triggerHaptic('light');
    }

    onChange(normalizedFrom, normalizedTo);
  };

  const getInputStyle = (hasError: boolean) => ({
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
    borderWidth: hasError ? 2 : theme.borders.thin,
    borderColor: hasError ? theme.colors.danger : theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.foreground,
    textAlign: 'center' as const,
    minHeight: 44,
  });

  return (
    <View accessible accessibilityLabel="Publication year range filter">
      <Text variant="label" muted style={{ marginBottom: theme.spacing.xs }}>
        Publication Year
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}
      >
        <TextInput
          value={fromText}
          onChangeText={handleFromChange}
          onBlur={handleFromBlur}
          placeholder={String(MIN_YEAR)}
          placeholderTextColor={theme.colors.foregroundMuted}
          style={getInputStyle(!!fromError)}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
          accessibilityLabel="From year"
          accessibilityHint={`Enter starting year, minimum ${MIN_YEAR}`}
        />
        <Text variant="caption" muted>
          to
        </Text>
        <TextInput
          value={toText}
          onChangeText={handleToChange}
          onBlur={handleToBlur}
          placeholder={String(CURRENT_YEAR)}
          placeholderTextColor={theme.colors.foregroundMuted}
          style={getInputStyle(!!toError)}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
          accessibilityLabel="To year"
          accessibilityHint={`Enter ending year, maximum ${CURRENT_YEAR}`}
        />
      </View>
      {(fromError || toError || wasSwapped) && (
        <Text
          variant="caption"
          color={wasSwapped ? 'muted' : 'danger'}
          style={{ marginTop: theme.spacing.xs }}
        >
          {fromError || toError || 'Years swapped to correct order'}
        </Text>
      )}
    </View>
  );
}
