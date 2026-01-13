import React, { memo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Icon, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';
import {
  GridViewIcon,
  Menu01Icon,
  BookOpen01Icon,
  AlignBoxMiddleCenterIcon,
  Layers01Icon,
} from '@hugeicons/core-free-icons';

export type ViewMode = 'list' | 'grid' | 'spines' | 'stack' | 'series';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  showStackOption?: boolean;
  showSeriesOption?: boolean;
  disabled?: boolean;
  variant?: 'floating' | 'inline';
}

interface ViewModeOption {
  mode: ViewMode;
  icon: typeof GridViewIcon;
  label: string;
}

const FLOATING_CELL_SIZE = 44;
const FLOATING_CELL_GAP = 8;
const FLOATING_PADDING = 6;
const FLOATING_INDICATOR_SIZE = 34;
const FLOATING_CELL_STEP = FLOATING_CELL_SIZE + FLOATING_CELL_GAP;
const FLOATING_INDICATOR_OFFSET = (FLOATING_CELL_SIZE - FLOATING_INDICATOR_SIZE) / 2;

export const ViewModeToggle = memo(function ViewModeToggle({
  currentMode,
  onModeChange,
  showStackOption = false,
  showSeriesOption = false,
  disabled = false,
  variant = 'floating',
}: ViewModeToggleProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';

  const options: ViewModeOption[] = [
    { mode: 'list', icon: Menu01Icon, label: 'List' },
    { mode: 'grid', icon: GridViewIcon, label: 'Grid' },
    { mode: 'spines', icon: AlignBoxMiddleCenterIcon, label: 'Spines' },
  ];

  if (showSeriesOption) {
    options.push({ mode: 'series', icon: Layers01Icon, label: 'Series' });
  }

  if (showStackOption) {
    options.push({ mode: 'stack', icon: BookOpen01Icon, label: 'Stack' });
  }

  const optionCount = options.length;
  const currentIndex = options.findIndex((o) => o.mode === currentMode);

  const indicatorX = useSharedValue(currentIndex);

  useEffect(() => {
    indicatorX.value = withSpring(currentIndex, SPRINGS.snap);
  }, [currentIndex, indicatorX]);

  const handleModeChange = useCallback(
    (mode: ViewMode) => {
      if (disabled || mode === currentMode) return;
      triggerHaptic('medium');
      onModeChange(mode);
    },
    [disabled, currentMode, onModeChange]
  );

  if (variant === 'inline') {
    const indicatorAnimatedStyle = useAnimatedStyle(() => ({
      left: `${(indicatorX.value / optionCount) * 100}%`,
    }));

    return (
      <View
        style={[
          styles.inlineContainer,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: isScholar ? theme.radii.sm : isDreamer ? theme.radii.lg : theme.radii.md,
            padding: 4,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.inlineIndicator,
            {
              width: `${100 / optionCount}%`,
              backgroundColor: theme.colors.surface,
              borderRadius: isScholar ? theme.radii.xs : isDreamer ? theme.radii.md : theme.radii.sm,
              ...theme.shadows.sm,
            },
            indicatorAnimatedStyle,
          ]}
        />

        {options.map((option) => {
          const isActive = option.mode === currentMode;

          return (
            <Pressable
              key={option.mode}
              onPress={() => handleModeChange(option.mode)}
              disabled={disabled}
              style={[styles.inlineCell, { flex: 1 }]}
              accessibilityLabel={`${option.label} view`}
              accessibilityState={{ selected: isActive }}
            >
              <Icon
                icon={option.icon}
                size={18}
                color={isActive ? theme.colors.primary : theme.colors.foregroundMuted}
              />
              <Text
                variant="caption"
                style={{
                  color: isActive ? theme.colors.primary : theme.colors.foregroundMuted,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const containerWidth = FLOATING_PADDING * 2 + optionCount * FLOATING_CELL_SIZE + (optionCount - 1) * FLOATING_CELL_GAP;
  const containerHeight = FLOATING_CELL_SIZE + FLOATING_PADDING * 2;

  const floatingIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value * FLOATING_CELL_STEP }],
  }));

  return (
    <View
      style={[
        styles.floatingContainer,
        {
          width: containerWidth,
          height: containerHeight,
          backgroundColor: theme.colors.surface,
          borderRadius: containerHeight / 2,
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.lg,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.floatingIndicator,
          {
            left: FLOATING_PADDING + FLOATING_INDICATOR_OFFSET,
            top: FLOATING_PADDING + FLOATING_INDICATOR_OFFSET,
            width: FLOATING_INDICATOR_SIZE,
            height: FLOATING_INDICATOR_SIZE,
            backgroundColor: theme.colors.primary,
            borderRadius: FLOATING_INDICATOR_SIZE / 2,
          },
          floatingIndicatorStyle,
        ]}
      />

      {options.map((option, index) => {
        const isActive = option.mode === currentMode;
        const buttonLeft = FLOATING_PADDING + index * FLOATING_CELL_STEP;

        return (
          <Pressable
            key={option.mode}
            onPress={() => handleModeChange(option.mode)}
            disabled={disabled}
            style={[
              styles.floatingCell,
              {
                left: buttonLeft,
                top: FLOATING_PADDING,
                width: FLOATING_CELL_SIZE,
                height: FLOATING_CELL_SIZE,
              },
            ]}
            accessibilityLabel={`${option.mode} view`}
            accessibilityState={{ selected: isActive }}
          >
            <Icon
              icon={option.icon}
              size={20}
              color={isActive ? theme.colors.onPrimary : theme.colors.foregroundMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'relative',
  },
  floatingIndicator: {
    position: 'absolute',
  },
  floatingCell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  inlineIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
  },
  inlineCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    zIndex: 1,
  },
});
