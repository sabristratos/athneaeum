import React, { memo, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  interpolateColor,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations/constants';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  showCharacterCount?: boolean;
  accessibilityLabel?: string;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const AnimatedText = Animated.createAnimatedComponent(Text);

interface CharacterCounterProps {
  current: number;
  max: number;
  warningThreshold: number;
  dangerColor: string;
  warningColor: string;
  normalColor: string;
}

const CharacterCounter = memo(function CharacterCounter({
  current,
  max,
  warningThreshold,
  dangerColor,
  warningColor,
  normalColor,
}: CharacterCounterProps) {
  const progress = useSharedValue(current / max);
  const scale = useSharedValue(1);

  useEffect(() => {
    const newProgress = current / max;
    const oldProgress = progress.value;

    progress.value = withTiming(newProgress, TIMING.medium);

    if (newProgress >= warningThreshold && oldProgress < warningThreshold) {
      scale.value = withSequence(
        withSpring(1.1, SPRINGS.bouncy),
        withSpring(1, SPRINGS.settle)
      );
    }
  }, [current, max, warningThreshold]);

  const animatedStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progress.value,
      [0, warningThreshold, 1],
      [normalColor, warningColor, dangerColor]
    );

    return {
      color,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <Animated.Text style={[styles.counter, animatedStyle]}>
      {current}/{max}
    </Animated.Text>
  );
});

export const Input = memo(function Input({
  label,
  error,
  hint,
  showCharacterCount = false,
  maxLength,
  value,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const focusProgress = useSharedValue(0);
  const errorProgress = useSharedValue(error ? 1 : 0);
  const shakeX = useSharedValue(0);
  const prevErrorRef = useRef(error);

  const currentLength = typeof value === 'string' ? value.length : 0;
  const shouldShowCounter = showCharacterCount && maxLength;

  useEffect(() => {
    const hadError = !!prevErrorRef.current;
    const hasError = !!error;

    if (!hadError && hasError) {
      triggerHaptic('error');
      shakeX.value = withSequence(
        withTiming(-8, TIMING.instant),
        withTiming(8, TIMING.instant),
        withTiming(-8, TIMING.instant),
        withTiming(8, TIMING.instant),
        withTiming(0, TIMING.instant)
      );
    }

    errorProgress.value = withTiming(hasError ? 1 : 0, TIMING.normal);
    prevErrorRef.current = error;
  }, [error]);

  const handleFocus = useCallback<NonNullable<TextInputProps['onFocus']>>(
    (e) => {
      focusProgress.value = withTiming(1, TIMING.normal);
      onFocus?.(e);
    },
    [onFocus]
  );

  const handleBlur = useCallback<NonNullable<TextInputProps['onBlur']>>(
    (e) => {
      focusProgress.value = withTiming(0, TIMING.normal);
      onBlur?.(e);
    },
    [onBlur]
  );

  const animatedStyle = useAnimatedStyle(() => {
    const borderColor = errorProgress.value > 0
      ? interpolateColor(
          errorProgress.value,
          [0, 1],
          [theme.colors.border, theme.colors.danger]
        )
      : interpolateColor(
          focusProgress.value,
          [0, 1],
          [theme.colors.border, theme.colors.primary]
        );

    const borderWidth = errorProgress.value > 0
      ? 2
      : focusProgress.value > 0.5
        ? 2
        : theme.borders.thin;

    return {
      borderColor,
      borderWidth,
      borderRadius: theme.radii.md,
      fontFamily: theme.fonts.body,
      fontSize: 16,
      transform: [{ translateX: shakeX.value }],
    };
  });

  return (
    <View className="gap-1.5">
      <View style={styles.labelRow}>
        {label && (
          <Text variant="label" color="muted">
            {label}
          </Text>
        )}
        {shouldShowCounter && (
          <CharacterCounter
            current={currentLength}
            max={maxLength}
            warningThreshold={0.8}
            dangerColor={theme.colors.danger}
            warningColor={theme.colors.warning}
            normalColor={theme.colors.foregroundMuted}
          />
        )}
      </View>

      <AnimatedTextInput
        className="px-4 py-3 text-foreground bg-surface"
        style={animatedStyle}
        placeholderTextColor={theme.colors.foregroundMuted}
        onFocus={handleFocus}
        onBlur={handleBlur}
        maxLength={maxLength}
        value={value}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={hint}
        accessibilityState={{ disabled: props.editable === false }}
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

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    fontSize: 12,
    fontWeight: '500',
  },
});
