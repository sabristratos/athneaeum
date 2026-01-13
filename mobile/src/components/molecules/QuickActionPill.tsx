import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  interpolateColor,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Pressable, Icon, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';

export interface QuickActionPillProps {
  icon: IconSvgElement;
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: 'default' | 'accent';
  disabled?: boolean;
}

export const QuickActionPill = memo(function QuickActionPill({
  icon,
  label,
  sublabel,
  onPress,
  variant = 'default',
  disabled = false,
}: QuickActionPillProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';

  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, SPRINGS.snappy);
    pressed.value = withSpring(1, SPRINGS.snappy);
    triggerHaptic('light');
  }, [scale, pressed]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRINGS.snappy);
    pressed.value = withSpring(0, SPRINGS.snappy);
  }, [scale, pressed]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    scale.value = withSequence(
      withSpring(0.94, SPRINGS.quickPress),
      withSpring(1, SPRINGS.snappy)
    );
    triggerHaptic('medium');
    onPress();
  }, [disabled, onPress, scale]);

  const getThemeStyles = () => {
    const isAccent = variant === 'accent';

    if (isScholar) {
      return {
        backgroundColor: isAccent ? theme.colors.tintPrimary : theme.colors.surface,
        borderColor: isAccent ? theme.colors.primary : theme.colors.border,
        borderWidth: isAccent ? 1.5 : theme.borders.thin,
        iconBgColor: isAccent ? theme.colors.primary : theme.colors.surfaceAlt,
        iconColor: isAccent ? theme.colors.onPrimary : theme.colors.foregroundMuted,
        labelColor: theme.colors.foreground,
        sublabelColor: theme.colors.foregroundMuted,
        pressedBgColor: theme.colors.surfaceHover,
        radius: theme.radii.md,
        iconRadius: theme.radii.sm,
        shadow: theme.shadows.sm,
      };
    }

    if (isDreamer) {
      return {
        backgroundColor: isAccent ? theme.colors.tintPrimary : theme.colors.surface,
        borderColor: isAccent ? theme.colors.primary : theme.colors.border,
        borderWidth: isAccent ? 1.5 : theme.borders.thin,
        iconBgColor: isAccent ? theme.colors.primary : theme.colors.surfaceAlt,
        iconColor: isAccent ? theme.colors.onPrimary : theme.colors.foregroundMuted,
        labelColor: theme.colors.foreground,
        sublabelColor: theme.colors.foregroundMuted,
        pressedBgColor: theme.colors.surfaceHover,
        radius: theme.radii.xl,
        iconRadius: theme.radii.lg,
        shadow: theme.shadows.sm,
      };
    }

    return {
      backgroundColor: isAccent ? theme.colors.tintPrimary : theme.colors.surface,
      borderColor: isAccent ? theme.colors.primary : theme.colors.border,
      borderWidth: isAccent ? 1.5 : theme.borders.thin,
      iconBgColor: isAccent ? theme.colors.primary : theme.colors.surfaceAlt,
      iconColor: isAccent ? theme.colors.onPrimary : theme.colors.foregroundMuted,
      labelColor: theme.colors.foreground,
      sublabelColor: theme.colors.foregroundMuted,
      pressedBgColor: theme.colors.surfaceHover,
      radius: theme.radii.lg,
      iconRadius: theme.radii.md,
      shadow: theme.shadows.sm,
    };
  };

  const styles = getThemeStyles();

  const animatedContainerStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      [styles.backgroundColor, styles.pressedBgColor]
    );

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  }, [styles.backgroundColor, styles.pressedBgColor]);

  const animatedIconBgStyle = useAnimatedStyle(() => {
    const scale = 1 + pressed.value * 0.05;
    return {
      transform: [{ scale }],
    };
  }, []);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      haptic="none"
      style={{ flex: 1, opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={[
          localStyles.container,
          {
            borderColor: styles.borderColor,
            borderWidth: styles.borderWidth,
            borderRadius: styles.radius,
            ...styles.shadow,
          },
          animatedContainerStyle,
        ]}
      >
        <Animated.View
          style={[
            localStyles.iconContainer,
            {
              backgroundColor: styles.iconBgColor,
              borderRadius: styles.iconRadius,
              width: isScholar ? 40 : 44,
              height: isScholar ? 40 : 44,
              ...(variant === 'accent' && {
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 3,
              }),
            },
            animatedIconBgStyle,
          ]}
        >
          <Icon icon={icon} size={isScholar ? 20 : 22} color={styles.iconColor} />
        </Animated.View>

        <View style={localStyles.textContainer}>
          <Text
            variant="body"
            style={{
              color: styles.labelColor,
              fontSize: isScholar ? 14 : 15,
              fontWeight: isScholar ? '400' : '600',
              letterSpacing: isScholar ? 0.3 : 0,
            }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {sublabel && (
            <Text
              variant="caption"
              style={{
                color: styles.sublabelColor,
                fontSize: 11,
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {sublabel}
            </Text>
          )}
        </View>

        {isScholar && (
          <View
            style={[
              localStyles.scholarAccent,
              { backgroundColor: `${theme.colors.primary}15` },
            ]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
});

const localStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  scholarAccent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
