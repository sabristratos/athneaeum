import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  FavouriteIcon,
  CancelCircleIcon,
  MinusSignIcon,
} from '@hugeicons/core-free-icons';
import { Pressable, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { SPRINGS } from '@/animations/constants';
import type { PreferenceState } from '@/types/preference';
import type { Theme } from '@/types/theme';

interface StateOption {
  state: PreferenceState;
  icon: IconSvgElement;
  label: string;
  color: (t: Theme) => string;
  activeColor: (t: Theme) => string;
  activeBg: (t: Theme) => string;
}

const STATE_OPTIONS: StateOption[] = [
  {
    state: 'none',
    icon: MinusSignIcon,
    label: 'None',
    color: (t) => t.colors.foregroundMuted,
    activeColor: (t) => t.colors.foreground,
    activeBg: (t) => t.colors.surface,
  },
  {
    state: 'favorite',
    icon: FavouriteIcon,
    label: 'Favorite',
    color: (t) => t.colors.foregroundMuted,
    activeColor: (t) => t.colors.primary,
    activeBg: (t) => t.colors.primarySubtle,
  },
  {
    state: 'excluded',
    icon: CancelCircleIcon,
    label: 'Exclude',
    color: (t) => t.colors.foregroundMuted,
    activeColor: (t) => t.colors.danger,
    activeBg: (t) => t.colors.dangerSubtle,
  },
];

export interface PreferenceStateSelectorProps {
  currentState: PreferenceState;
  onStateChange: (state: PreferenceState) => void;
  supportsExclude?: boolean;
  compact?: boolean;
  disabled?: boolean;
}

export function PreferenceStateSelector({
  currentState,
  onStateChange,
  supportsExclude = true,
  compact = false,
  disabled = false,
}: PreferenceStateSelectorProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const options = supportsExclude
    ? STATE_OPTIONS
    : STATE_OPTIONS.filter((o) => o.state !== 'excluded');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="radiogroup"
    >
      {options.map((option) => {
        const isActive = currentState === option.state;
        const color = isActive ? option.activeColor(theme) : option.color(theme);

        return (
          <StateButton
            key={option.state}
            option={option}
            isActive={isActive}
            color={color}
            compact={compact}
            disabled={disabled}
            theme={theme}
            isScholar={isScholar}
            onPress={() => !disabled && onStateChange(option.state)}
          />
        );
      })}
    </View>
  );
}

interface StateButtonProps {
  option: StateOption;
  isActive: boolean;
  color: string;
  compact: boolean;
  disabled: boolean;
  theme: Theme;
  isScholar: boolean;
  onPress: () => void;
}

function StateButton({
  option,
  isActive,
  color,
  compact,
  disabled,
  theme,
  isScholar,
  onPress,
}: StateButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(
      isActive ? option.activeBg(theme) : 'transparent',
      SPRINGS.snappy
    ),
  }));

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: isActive }}
      accessibilityLabel={option.label}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.option,
          {
            borderRadius: isScholar ? theme.radii.xs : theme.radii.full - 4,
          },
          animatedStyle,
        ]}
      >
        <Icon icon={option.icon} size={16} color={color} />
        {!compact && (
          <RNText
            style={{
              fontSize: 12,
              color,
              fontWeight: isActive ? '600' : '400',
              fontFamily: theme.fonts.body,
            }}
          >
            {option.label}
          </RNText>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sharedSpacing.sm,
    paddingHorizontal: sharedSpacing.sm + sharedSpacing.xs,
    gap: 6,
  },
});
