import React, { memo, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import { Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations/constants';
import { Loading03Icon, Book02Icon } from '@hugeicons/core-free-icons';

interface ThemedRefreshControlProps {
  refreshing: boolean;
  pullProgress?: number;
}

export const ThemedRefreshControl = memo(function ThemedRefreshControl({
  refreshing,
  pullProgress = 0,
}: ThemedRefreshControlProps) {
  const { theme, themeName } = useTheme();
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);

  const isScholar = themeName === 'scholar';

  useEffect(() => {
    if (refreshing) {
      scale.value = withSpring(1, SPRINGS.smoothGentle);
      iconOpacity.value = withTiming(1, TIMING.normal);

      if (!reducedMotion) {
        rotation.value = withRepeat(
          withTiming(360, TIMING.rotation),
          -1,
          false
        );
      }
    } else {
      scale.value = withSpring(0, SPRINGS.toastFade);
      iconOpacity.value = withTiming(0, TIMING.medium);
      cancelAnimation(rotation);
      rotation.value = 0;
    }

    return () => {
      cancelAnimation(rotation);
    };
  }, [refreshing, reducedMotion]);

  useEffect(() => {
    if (!refreshing && pullProgress > 0) {
      scale.value = withTiming(Math.min(pullProgress, 1), TIMING.instant);
      iconOpacity.value = withTiming(Math.min(pullProgress * 1.5, 1), TIMING.instant);
    }
  }, [pullProgress, refreshing]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: iconOpacity.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (reducedMotion && refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.colors.primary,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
            },
          ]}
        >
          <Icon icon={Book02Icon} size={20} color={theme.colors.onPrimary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: 'transparent' }]}>
      <Animated.View
        style={[
          styles.indicator,
          containerStyle,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: isScholar ? theme.radii.md : theme.radii.full,
            borderWidth: 1,
            borderColor: theme.colors.border,
            ...theme.shadows.sm,
          },
        ]}
      >
        <Animated.View style={spinnerStyle}>
          <Icon
            icon={isScholar ? Book02Icon : Loading03Icon}
            size={20}
            color={theme.colors.primary}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
});

interface RefreshControlWrapperProps {
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

export function useThemedRefreshControl(refreshing: boolean) {
  const { theme } = useTheme();

  return {
    refreshing,
    tintColor: theme.colors.primary,
    colors: [theme.colors.primary],
    progressBackgroundColor: theme.colors.surface,
  };
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  indicator: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
