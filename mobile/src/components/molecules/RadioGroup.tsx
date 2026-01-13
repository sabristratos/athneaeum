import React from 'react';
import { View } from 'react-native';
import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';

type RadioGroupSize = 'sm' | 'md' | 'lg';
type RadioGroupGap = 'xs' | 'sm' | 'md';

interface RadioOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps<T extends string | number> {
  options: RadioOption<T>[];
  value: T | undefined;
  onChange: (value: T) => void;
  size?: RadioGroupSize;
  disabled?: boolean;
  label?: string;
  gap?: RadioGroupGap;
  wrap?: boolean;
}

export function RadioGroup<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  disabled = false,
  label,
  gap = 'xs',
  wrap = true,
}: RadioGroupProps<T>) {
  const { theme, themeName } = useTheme();
  const safeOptions = options ?? [];

  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';

  const getSizeStyles = () => {
    const sizes = {
      sm: { px: 10, py: 4, fontSize: 12 },
      md: { px: 14, py: 6, fontSize: 14 },
      lg: { px: 18, py: 8, fontSize: 16 },
    };
    return sizes[size];
  };

  const getChipStyles = (isSelected: boolean, isOptionDisabled: boolean) => {
    const isDisabledState = disabled || isOptionDisabled;

    if (isDisabledState) {
      return {
        bg: theme.colors.surfaceAlt,
        border: theme.colors.borderMuted,
        text: theme.colors.foregroundMuted,
        opacity: 0.5,
      };
    }

    if (isSelected) {
      return {
        bg: isScholar ? theme.colors.primary : theme.colors.tintPrimary,
        border: theme.colors.primary,
        text: isScholar ? theme.colors.paper : theme.colors.foreground,
        opacity: 1,
      };
    }

    return {
      bg: isScholar ? 'transparent' : theme.colors.surfaceAlt,
      border: isDreamer ? 'transparent' : theme.colors.border,
      text: theme.colors.foregroundMuted,
      opacity: 1,
    };
  };

  const sizeStyles = getSizeStyles();

  const getBorderRadius = () => {
    if (isDreamer) {
      return 9999;
    }
    if (isScholar) {
      return theme.radii.sm;
    }
    return theme.radii.md;
  };

  return (
    <View>
      {label && (
        <Text variant="label" muted style={{ marginBottom: theme.spacing.xs }}>
          {label}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: wrap ? 'wrap' : 'nowrap',
          gap: theme.spacing[gap],
        }}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
      >
        {safeOptions.map((option) => {
          const isSelected = value === option.value;
          const chipStyles = getChipStyles(isSelected, option.disabled ?? false);

          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              disabled={disabled || option.disabled}
              haptic={disabled || option.disabled ? 'none' : 'light'}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: isSelected, disabled: disabled || option.disabled }}
            >
              <View
                style={{
                  backgroundColor: chipStyles.bg,
                  borderWidth: theme.borders.thin,
                  borderColor: chipStyles.border,
                  borderRadius: getBorderRadius(),
                  paddingHorizontal: sizeStyles.px,
                  paddingVertical: sizeStyles.py,
                  opacity: chipStyles.opacity,
                }}
              >
                <Text
                  style={{
                    fontSize: sizeStyles.fontSize,
                    color: chipStyles.text,
                    fontWeight: isScholar ? '400' : '600',
                    textTransform: isScholar ? 'uppercase' : 'none',
                    letterSpacing: isScholar ? 0.5 : 0,
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {option.label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
