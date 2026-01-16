import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import {
  FavouriteIcon,
  CancelCircleIcon,
  Cancel01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Pressable, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { SPRINGS } from '@/animations/constants';
import type { PreferenceState } from '@/types/preference';

export interface PreferenceChipProps {
  label: string;
  state: PreferenceState;
  onPress?: () => void;
  onLongPress?: () => void;
  size?: 'sm' | 'md';
  showStateIcon?: boolean;
  showRemove?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
}

const sizeMap = {
  sm: {
    paddingH: sharedSpacing.sm,
    paddingV: sharedSpacing.xs,
    fontSize: 12,
    iconSize: 12,
  },
  md: {
    paddingH: sharedSpacing.sm + sharedSpacing.xs,
    paddingV: sharedSpacing.xs + sharedSpacing.xxs,
    fontSize: 14,
    iconSize: 14,
  },
};

export function PreferenceChip({
  label,
  state,
  onPress,
  onLongPress,
  size = 'md',
  showStateIcon = true,
  showRemove = false,
  onRemove,
  disabled = false,
}: PreferenceChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { paddingH, paddingV, fontSize, iconSize } = sizeMap[size];

  const getStateColors = () => {
    switch (state) {
      case 'favorite':
        return {
          background: theme.colors.primarySubtle,
          text: theme.colors.primary,
          border: theme.colors.primary,
          icon: FavouriteIcon,
        };
      case 'excluded':
        return {
          background: theme.colors.dangerSubtle,
          text: theme.colors.danger,
          border: theme.colors.danger,
          icon: CancelCircleIcon,
        };
      default:
        return {
          background: theme.colors.surfaceAlt,
          text: theme.colors.foreground,
          border: theme.colors.border,
          icon: null,
        };
    }
  };

  const colors = getStateColors();
  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(colors.background, SPRINGS.snappy),
    borderColor: withSpring(colors.border, SPRINGS.snappy),
  }));

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius,
          borderWidth: state !== 'none' ? 1.5 : theme.borders.thin,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      {showStateIcon && colors.icon && (
        <Icon icon={colors.icon} size={iconSize} color={colors.text} />
      )}
      <RNText
        style={{
          fontSize,
          color: colors.text,
          fontFamily: theme.fonts.body,
          fontWeight: state !== 'none' ? '600' : '400',
        }}
        numberOfLines={1}
      >
        {label}
      </RNText>
      {showRemove && onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          haptic="light"
          accessibilityLabel={`Remove ${label}`}
        >
          <Icon icon={Cancel01Icon} size={iconSize} color={colors.text} />
        </Pressable>
      )}
    </Animated.View>
  );

  if ((onPress || onLongPress) && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        activeScale={0.95}
        activeOpacity={0.9}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${state === 'none' ? 'not set' : state}`}
        accessibilityState={{ selected: state !== 'none', disabled }}
        style={{ alignSelf: 'flex-start' }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export interface SelectableChipProps {
  label: string;
  selected: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function SelectableChip({
  label,
  selected,
  onPress,
  size = 'md',
  disabled = false,
}: SelectableChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { paddingH, paddingV, fontSize, iconSize } = sizeMap[size];

  const colors = selected
    ? {
        background: theme.colors.primary,
        text: theme.colors.onPrimary,
        border: theme.colors.primary,
      }
    : {
        background: theme.colors.surfaceAlt,
        text: theme.colors.foreground,
        border: theme.colors.border,
      };

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(colors.background, SPRINGS.snappy),
    borderColor: withSpring(colors.border, SPRINGS.snappy),
  }));

  const content = (
    <Animated.View
      style={[
        styles.container,
        {
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          borderRadius,
          borderWidth: theme.borders.thin,
          opacity: disabled ? 0.5 : 1,
        },
        animatedStyle,
      ]}
    >
      {selected && <Icon icon={Tick02Icon} size={iconSize} color={colors.text} />}
      <RNText
        style={{
          fontSize,
          color: colors.text,
          fontFamily: theme.fonts.body,
          fontWeight: selected ? '600' : '400',
        }}
        numberOfLines={1}
      >
        {label}
      </RNText>
    </Animated.View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        activeScale={0.95}
        activeOpacity={0.9}
        haptic="light"
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected, disabled }}
        style={{ alignSelf: 'flex-start' }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    flexGrow: 0,
  },
});
