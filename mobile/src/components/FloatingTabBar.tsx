import React, { memo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';

interface TabOption<T extends string> {
  key: T;
  label: string;
}

interface FloatingTabBarProps<T extends string> {
  options: TabOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  disabled?: boolean;
  /** When true, renders without the outer container (for use inside a wrapper) */
  bare?: boolean;
}

const CELL_HEIGHT = 44;
const CELL_GAP = 4;
const PADDING = 4;
const INDICATOR_INSET = 2;

function FloatingTabBarInner<T extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
  bare = false,
}: FloatingTabBarProps<T>) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const safeOptions = options ?? [];

  const currentIndex = safeOptions.findIndex((o) => o.key === selected);

  const cellWidths = safeOptions.map((opt) => {
    const charWidth = isScholar ? 9 : 8;
    const baseWidth = opt.label.length * charWidth + 32;
    return Math.max(baseWidth, 80);
  });

  const totalCellsWidth = cellWidths.reduce((a, b) => a + b, 0);
  const containerWidth = PADDING * 2 + totalCellsWidth + (safeOptions.length - 1) * CELL_GAP;
  const containerHeight = CELL_HEIGHT + PADDING * 2;

  const getIndicatorX = (index: number) => {
    let x = PADDING + INDICATOR_INSET;
    for (let i = 0; i < index; i++) {
      x += cellWidths[i] + CELL_GAP;
    }
    return x;
  };

  const indicatorX = useSharedValue(getIndicatorX(currentIndex));
  const indicatorWidth = useSharedValue(cellWidths[currentIndex] - INDICATOR_INSET * 2);

  useEffect(() => {
    indicatorX.value = withSpring(getIndicatorX(currentIndex), SPRINGS.snap);
    indicatorWidth.value = withSpring(cellWidths[currentIndex] - INDICATOR_INSET * 2, SPRINGS.snap);
  }, [currentIndex, cellWidths]);

  const handleSelect = useCallback(
    (key: T) => {
      if (disabled || key === selected) return;
      triggerHaptic('medium');
      onSelect(key);
    },
    [disabled, selected, onSelect]
  );

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const indicatorHeight = CELL_HEIGHT - INDICATOR_INSET * 2;
  const indicatorRadius = isScholar ? theme.radii.sm : indicatorHeight / 2;

  const content = (
    <>
      <Animated.View
        style={[
          styles.indicator,
          {
            top: bare ? INDICATOR_INSET : PADDING + INDICATOR_INSET,
            height: indicatorHeight,
            backgroundColor: theme.colors.primary,
            borderRadius: indicatorRadius,
          },
          indicatorStyle,
        ]}
      />

      <View style={[styles.optionsRow, { paddingHorizontal: bare ? 0 : PADDING }]}>
        {safeOptions.map((option, index) => {
          const isActive = option.key === selected;

          return (
            <Pressable
              key={option.key}
              onPress={() => handleSelect(option.key)}
              disabled={disabled}
              style={[
                styles.cell,
                {
                  width: cellWidths[index],
                  height: CELL_HEIGHT,
                  marginLeft: index > 0 ? CELL_GAP : 0,
                },
              ]}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isActive, disabled }}
            >
              <Text
                variant="label"
                style={{
                  color: isActive ? theme.colors.onPrimary : theme.colors.foregroundMuted,
                  textTransform: isScholar ? 'uppercase' : 'none',
                  letterSpacing: isScholar ? 1.5 : 0.5,
                  fontSize: 12,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );

  if (bare) {
    return (
      <View
        style={[
          styles.bareContainer,
          {
            width: totalCellsWidth + (safeOptions.length - 1) * CELL_GAP,
            height: CELL_HEIGHT,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
        accessibilityRole="tablist"
      >
        {content}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: containerWidth,
          height: containerHeight,
          backgroundColor: theme.colors.surface,
          borderRadius: isScholar ? theme.radii.md : containerHeight / 2,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
          ...theme.shadows.lg,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="tablist"
    >
      {content}
    </View>
  );
}

export const FloatingTabBar = memo(FloatingTabBarInner) as typeof FloatingTabBarInner;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  bareContainer: {
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    left: 0,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
