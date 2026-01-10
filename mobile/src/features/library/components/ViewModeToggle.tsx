import React, { memo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/themes';
import {
  GridViewIcon,
  Menu01Icon,
  BookOpen01Icon,
  AlignBoxMiddleCenterIcon,
} from '@hugeicons/core-free-icons';

export type ViewMode = 'list' | 'grid' | 'spines' | 'stack';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  showStackOption?: boolean;
  disabled?: boolean;
}

interface ViewModeOption {
  mode: ViewMode;
  icon: typeof GridViewIcon;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
};

// Core dimensions - all calculations derive from these
const CELL_SIZE = 44;
const CELL_GAP = 8;
const PADDING = 6;
const INDICATOR_SIZE = 34; // Slightly smaller for visual breathing room

// Derived values
const CELL_STEP = CELL_SIZE + CELL_GAP; // 52
const INDICATOR_OFFSET = (CELL_SIZE - INDICATOR_SIZE) / 2; // 5 - centers indicator in cell

/**
 * A floating toggle bar for switching between library view modes.
 * Uses absolute positioning for deterministic layout.
 */
export const ViewModeToggle = memo(function ViewModeToggle({
  currentMode,
  onModeChange,
  showStackOption = false,
  disabled = false,
}: ViewModeToggleProps) {
  const { theme } = useTheme();

  // Build options list
  const options: ViewModeOption[] = [
    { mode: 'list', icon: Menu01Icon },
    { mode: 'grid', icon: GridViewIcon },
    { mode: 'spines', icon: AlignBoxMiddleCenterIcon },
  ];

  if (showStackOption) {
    options.push({ mode: 'stack', icon: BookOpen01Icon });
  }

  const optionCount = options.length;
  const currentIndex = options.findIndex((o) => o.mode === currentMode);

  // Calculate container dimensions
  const containerWidth = PADDING * 2 + optionCount * CELL_SIZE + (optionCount - 1) * CELL_GAP;
  const containerHeight = CELL_SIZE + PADDING * 2;

  // Animation for indicator (translateX from base position)
  const indicatorX = useSharedValue(currentIndex * CELL_STEP);

  // Update indicator position when mode changes
  useEffect(() => {
    indicatorX.value = withSpring(currentIndex * CELL_STEP, SPRING_CONFIG);
  }, [currentIndex, indicatorX]);

  // Handle mode change
  const handleModeChange = useCallback(
    (mode: ViewMode) => {
      if (disabled || mode === currentMode) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onModeChange(mode);
    },
    [disabled, currentMode, onModeChange]
  );

  // Animated style for indicator
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      style={[
        styles.container,
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
      {/* Sliding indicator - centered in first cell, animated via translateX */}
      <Animated.View
        style={[
          styles.indicator,
          {
            left: PADDING + INDICATOR_OFFSET,
            top: PADDING + INDICATOR_OFFSET,
            width: INDICATOR_SIZE,
            height: INDICATOR_SIZE,
            backgroundColor: theme.colors.primary,
            borderRadius: INDICATOR_SIZE / 2,
          },
          indicatorStyle,
        ]}
      />

      {/* Option buttons - absolutely positioned */}
      {options.map((option, index) => {
        const isActive = option.mode === currentMode;
        const buttonLeft = PADDING + index * CELL_STEP;

        return (
          <Pressable
            key={option.mode}
            onPress={() => handleModeChange(option.mode)}
            disabled={disabled}
            style={[
              styles.cell,
              {
                left: buttonLeft,
                top: PADDING,
                width: CELL_SIZE,
                height: CELL_SIZE,
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
  container: {
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
  },
  cell: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
