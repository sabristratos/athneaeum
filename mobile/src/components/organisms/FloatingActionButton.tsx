import React, { memo, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { IconSvgElement } from '@hugeicons/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { iconSizes } from '@/themes/shared';
import { SPRINGS } from '@/animations';

interface FloatingActionButtonProps {
  label: string;
  icon: IconSvgElement;
  onPress: () => void;
  /** Animated visibility value (0 = hidden, 1 = visible). If not provided, always visible. */
  visible?: SharedValue<number>;
  /** When true, renders inline without absolute positioning (parent controls position) */
  inline?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const FloatingActionButton = memo(function FloatingActionButton({
  label,
  icon,
  onPress,
  visible,
  inline = false,
}: FloatingActionButtonProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, SPRINGS.snappy);
    triggerHaptic('medium');
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRINGS.snappy);
  };

  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!visible) {
      return { transform: [{ scale: scale.value }] };
    }

    const translateY = interpolate(
      visible.value,
      [0, 1],
      [100, 0],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      visible.value,
      [0, 0.5, 1],
      [0, 0.5, 1],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale: scale.value }],
      opacity,
    };
  }, [visible, scale]);

  const bottomPadding = inline ? 0 : Math.max(theme.spacing.xl, insets.bottom + theme.spacing.md);

  const buttonStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: theme.spacing.sm,
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.xl,
      backgroundColor: theme.colors.primary,
      borderRadius: isScholar ? theme.radii.md : theme.radii.full,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 6,
    }),
    [theme, isScholar]
  );

  const textStyle = useMemo(
    () => ({
      color: theme.colors.onPrimary,
      fontWeight: '600' as const,
      fontSize: 15,
      letterSpacing: 0.3,
    }),
    [theme.colors.onPrimary]
  );

  const containerStyle = useMemo(() => {
    if (inline) {
      return {
        alignItems: 'center' as const,
        paddingHorizontal: 24,
      };
    }
    return {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center' as const,
      paddingHorizontal: 24,
      paddingBottom: bottomPadding,
    };
  }, [inline, bottomPadding]);

  return (
    <View style={containerStyle}>
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[buttonStyle, animatedContainerStyle]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={`Tap to ${label.toLowerCase()}`}
      >
        <Icon icon={icon} size={iconSizes.md} color={theme.colors.onPrimary} />
        <Text variant="body" style={textStyle}>
          {label}
        </Text>
      </AnimatedTouchable>
    </View>
  );
});

