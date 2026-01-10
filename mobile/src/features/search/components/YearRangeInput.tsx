import React, { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Text } from '@/components';
import { useTheme } from '@/themes';

interface YearRangeInputProps {
  yearFrom?: number;
  yearTo?: number;
  onChange: (yearFrom?: number, yearTo?: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export function YearRangeInput({
  yearFrom,
  yearTo,
  onChange,
}: YearRangeInputProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [fromText, setFromText] = useState(yearFrom?.toString() ?? '');
  const [toText, setToText] = useState(yearTo?.toString() ?? '');

  useEffect(() => {
    setFromText(yearFrom?.toString() ?? '');
  }, [yearFrom]);

  useEffect(() => {
    setToText(yearTo?.toString() ?? '');
  }, [yearTo]);

  const parseYear = (text: string): number | undefined => {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1800 || num > CURRENT_YEAR) {
      return undefined;
    }
    return num;
  };

  const handleFromChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setFromText(cleaned);
  };

  const handleToChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setToText(cleaned);
  };

  const handleFromBlur = () => {
    const parsedFrom = parseYear(fromText);
    const parsedTo = parseYear(toText);
    onChange(parsedFrom, parsedTo);
  };

  const handleToBlur = () => {
    const parsedFrom = parseYear(fromText);
    const parsedTo = parseYear(toText);
    onChange(parsedFrom, parsedTo);
  };

  const inputStyle = {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
    borderWidth: theme.borders.thin,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    fontSize: 14,
    fontFamily: theme.fonts.body,
    color: theme.colors.foreground,
    textAlign: 'center' as const,
  };

  return (
    <View>
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
          placeholder="From"
          placeholderTextColor={theme.colors.foregroundMuted}
          style={inputStyle}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
        />
        <Text variant="caption" muted>
          to
        </Text>
        <TextInput
          value={toText}
          onChangeText={handleToChange}
          onBlur={handleToBlur}
          placeholder="To"
          placeholderTextColor={theme.colors.foregroundMuted}
          style={inputStyle}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}
