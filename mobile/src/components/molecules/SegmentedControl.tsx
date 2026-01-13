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

interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selected: T;
  onSelect: (key: T) => void;
  disabled?: boolean;
}

function SegmentedControlInner<T extends string>({
  options,
  selected,
  onSelect,
  disabled = false,
}: SegmentedControlProps<T>) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';

  const currentIndex = options.findIndex((o) => o.key === selected);
  const indicatorX = useSharedValue(currentIndex);

  useEffect(() => {
    indicatorX.value = withSpring(currentIndex, SPRINGS.segmentedControl);
  }, [currentIndex]);

  const handleSelect = useCallback(
    (key: T) => {
      if (disabled || key === selected) return;
      triggerHaptic('light');
      onSelect(key);
    },
    [disabled, selected, onSelect]
  );

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    left: `${(indicatorX.value / options.length) * 100}%`,
  }));

  const containerRadius = isScholar
    ? theme.radii.sm
    : isDreamer
    ? theme.radii.xl
    : theme.radii.md;

  const indicatorRadius = isScholar
    ? theme.radii.xs
    : isDreamer
    ? theme.radii.lg
    : theme.radii.sm;

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: containerRadius,
          padding: 4,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.innerContainer}>
        <Animated.View
          style={[
            styles.indicator,
            {
              width: `${100 / options.length}%`,
              backgroundColor: theme.colors.surface,
              borderRadius: indicatorRadius,
              ...theme.shadows.sm,
            },
            indicatorAnimatedStyle,
          ]}
        />

        {options.map((option) => {
          const isActive = option.key === selected;

          return (
            <Pressable
              key={option.key}
              onPress={() => handleSelect(option.key)}
              disabled={disabled}
              style={styles.segment}
              accessibilityRole="tab"
              accessibilityLabel={option.label}
              accessibilityState={{ selected: isActive, disabled }}
            >
              <Text
                variant="body"
                style={{
                  color: isActive ? theme.colors.foreground : theme.colors.foregroundMuted,
                  fontWeight: isActive ? '600' : '400',
                  fontSize: 15,
                  textAlign: 'center',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const SegmentedControl = memo(SegmentedControlInner) as typeof SegmentedControlInner;

const styles = StyleSheet.create({
  outerContainer: {},
  innerContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    minHeight: 44,
    zIndex: 1,
  },
});
