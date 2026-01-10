import React, { memo, useState, useCallback, useMemo } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = memo(function Input({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      setIsFocused(true);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (e) => {
      setIsFocused(false);
      onBlur?.(e);
    },
    [onBlur]
  );

  const borderColor = error
    ? theme.colors.danger
    : isFocused
    ? theme.colors.primary
    : theme.colors.border;

  const inputStyle = useMemo(
    () => ({
      borderRadius: theme.radii.md,
      borderWidth: theme.borders.thin,
      borderColor,
      fontFamily: theme.fonts.body,
      fontSize: 16,
    }),
    [theme.radii.md, theme.borders.thin, borderColor, theme.fonts.body]
  );

  return (
    <View className="gap-1.5">
      {label && (
        <Text variant="label" color="muted">
          {label}
        </Text>
      )}

      <TextInput
        className="px-4 py-3 text-foreground bg-surface"
        style={inputStyle}
        placeholderTextColor={theme.colors.foregroundMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />

      {error && (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      )}

      {hint && !error && (
        <Text variant="caption" muted>
          {hint}
        </Text>
      )}
    </View>
  );
});
