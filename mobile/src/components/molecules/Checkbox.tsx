import React from 'react';
import { View } from 'react-native';
import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';

type CheckboxSize = 'sm' | 'md' | 'lg';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  size?: CheckboxSize;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  size = 'md',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: CheckboxProps) {
  const { theme, themeName } = useTheme();

  const isScholar = themeName === 'scholar';

  const getSizeStyles = () => {
    const sizes = {
      sm: { box: 16, checkmark: 10, fontSize: 14, gap: 8 },
      md: { box: 20, checkmark: 12, fontSize: 16, gap: 10 },
      lg: { box: 24, checkmark: 14, fontSize: 18, gap: 12 },
    };
    return sizes[size];
  };

  const sizeStyles = getSizeStyles();

  const getBoxStyles = () => {
    if (disabled) {
      return {
        bg: theme.colors.surfaceAlt,
        border: theme.colors.borderMuted,
        checkColor: theme.colors.foregroundMuted,
      };
    }

    if (checked) {
      return {
        bg: theme.colors.primary,
        border: theme.colors.primary,
        checkColor: theme.colors.onPrimary,
      };
    }

    return {
      bg: 'transparent',
      border: theme.colors.border,
      checkColor: 'transparent',
    };
  };

  const boxStyles = getBoxStyles();
  const borderRadius = isScholar ? theme.radii.sm : theme.radii.md;

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      haptic={disabled ? 'none' : 'light'}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: sizeStyles.gap,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <View
          style={{
            width: sizeStyles.box,
            height: sizeStyles.box,
            borderRadius: borderRadius,
            borderWidth: theme.borders.thin,
            backgroundColor: boxStyles.bg,
            borderColor: boxStyles.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked && (
            <View
              style={{
                width: sizeStyles.checkmark,
                height: sizeStyles.checkmark * 0.6,
                borderLeftWidth: 2,
                borderBottomWidth: 2,
                borderColor: boxStyles.checkColor,
                transform: [{ rotate: '-45deg' }, { translateY: -1 }],
              }}
            />
          )}
        </View>
        {label && (
          <Text
            style={{
              fontSize: sizeStyles.fontSize,
              color: disabled ? theme.colors.foregroundMuted : theme.colors.foreground,
              fontFamily: theme.fonts.body,
            }}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
