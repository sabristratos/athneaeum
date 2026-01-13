import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useTheme } from '@/themes';
import { Text, Pressable } from '@/components/atoms';
import { SPRINGS } from '@/animations';

export type DayLabel = 'M' | 'T' | 'W' | 'T' | 'F' | 'S' | 'S';

export interface PulseDotProps {
  day: DayLabel;
  pagesRead: number;
  isActive: boolean;
  isToday: boolean;
  onPress?: () => void;
  size?: number;
}

export const PulseDot = memo(function PulseDot({
  day,
  pagesRead,
  isActive,
  isToday,
  onPress,
  size = 36,
}: PulseDotProps) {
  const { theme, themeName } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = () => {
    if (onPress) {
      scale.value = withSequence(
        withSpring(0.9, SPRINGS.quickPress),
        withSpring(1, SPRINGS.snappy)
      );
      triggerHaptic('light');
      onPress();
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderRadius = themeName === 'scholar' ? theme.radii.xs : theme.radii.md;

  const dotStyle = {
    width: size,
    height: size,
    borderRadius,
    backgroundColor: isActive ? theme.colors.primary : 'transparent',
    borderWidth: isActive ? 0 : 1.5,
    borderColor: isToday ? theme.colors.primary : theme.colors.borderMuted,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const glowStyle = isActive && themeName === 'scholar' ? {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  } : {};

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress} haptic="light" disabled={!onPress}>
        <Animated.View style={[dotStyle, glowStyle, animatedStyle]}>
          {isActive && pagesRead > 0 && (
            <Text
              variant="caption"
              style={{
                color: theme.colors.onPrimary,
                fontSize: 9,
                fontWeight: '600',
              }}
            >
              {pagesRead > 99 ? '99+' : pagesRead}
            </Text>
          )}
        </Animated.View>
      </Pressable>
      <Text
        variant="caption"
        style={{
          color: isToday ? theme.colors.primary : theme.colors.foregroundMuted,
          fontSize: 10,
          marginTop: 4,
          fontWeight: isToday ? '600' : '400',
        }}
      >
        {day}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
