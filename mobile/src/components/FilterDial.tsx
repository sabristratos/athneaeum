import React, { useCallback, useEffect, useState, useMemo, memo } from 'react';
import {
  View,
  Pressable,
  LayoutChangeEvent,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';

export interface FilterDialOption {
  key: string;
  label: string;
  count?: number;
}

interface FilterDialProps {
  options: FilterDialOption[];
  selected: string;
  onSelect: (key: string) => void;
  showCounts?: boolean;
  disabled?: boolean;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
};

interface LabelMeasurement {
  x: number;
  width: number;
}

/**
 * A tab-style filter with animated underline indicator.
 * Tap any label to select that filter.
 */
export const FilterDial = memo(function FilterDial({
  options,
  selected,
  onSelect,
  showCounts = true,
  disabled = false,
}: FilterDialProps) {
  const { theme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);
  const [labelMeasurements, setLabelMeasurements] = useState<LabelMeasurement[]>([]);

  // Animation values for indicator
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  // Find current selected index
  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.key === selected),
    [options, selected]
  );

  // Check for reduced motion preference
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );
    return () => subscription.remove();
  }, []);

  // Update indicator position when selection or measurements change
  useEffect(() => {
    if (labelMeasurements.length > 0 && selectedIndex >= 0) {
      const measurement = labelMeasurements[selectedIndex];
      if (measurement) {
        if (reduceMotion) {
          indicatorX.value = withTiming(measurement.x, { duration: 150 });
          indicatorWidth.value = withTiming(measurement.width, { duration: 150 });
        } else {
          indicatorX.value = withSpring(measurement.x, SPRING_CONFIG);
          indicatorWidth.value = withSpring(measurement.width, SPRING_CONFIG);
        }
      }
    }
  }, [selectedIndex, labelMeasurements, reduceMotion, indicatorX, indicatorWidth]);

  // Handle label layout to measure positions
  const handleLabelLayout = useCallback(
    (index: number, event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setLabelMeasurements((prev) => {
        const updated = [...prev];
        updated[index] = { x, width };
        return updated;
      });
    },
    []
  );

  // Handle selection
  const handleSelect = useCallback(
    (key: string) => {
      if (disabled || key === selected) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSelect(key);
    },
    [disabled, selected, onSelect]
  );

  // Animated styles for indicator
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  return (
    <View
      style={[styles.container, { opacity: disabled ? 0.5 : 1 }]}
      accessible={true}
      accessibilityRole="tablist"
      accessibilityLabel="Filter options"
    >
      {/* Labels row */}
      <View style={styles.labelsRow}>
        {options.map((option, index) => {
          const isSelected = index === selectedIndex;
          return (
            <Pressable
              key={option.key}
              onLayout={(e) => handleLabelLayout(index, e)}
              onPress={() => handleSelect(option.key)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.labelButton,
                pressed && styles.labelButtonPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${option.label}${showCounts && option.count !== undefined ? `, ${option.count} items` : ''}`}
            >
              <Text
                variant="caption"
                style={[
                  styles.label,
                  {
                    color: isSelected
                      ? theme.colors.foreground
                      : theme.colors.foregroundMuted,
                    fontFamily: theme.fonts.body,
                  },
                  isSelected && styles.labelActive,
                ]}
              >
                {option.label}
                {showCounts && option.count !== undefined ? ` (${option.count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Animated underline indicator */}
      {labelMeasurements.length > 0 && (
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.colors.primary,
            },
            indicatorStyle,
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
  },
  labelButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  labelButtonPressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    textAlign: 'center',
  },
  labelActive: {
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 1.5,
  },
});
