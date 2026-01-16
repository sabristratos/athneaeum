import React, { useEffect, useCallback, useState } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SPRINGS, TIMING } from '@/animations/constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { triggerHaptic } from '@/hooks/useHaptic';

let BlurView: typeof import('expo-blur').BlurView | null = null;
try {
  BlurView = require('expo-blur').BlurView;
} catch {
}
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import type { IconSvgElement } from '@hugeicons/react-native';
import {
  Home01Icon,
  Book02Icon,
  UserIcon,
  DiscoverCircleIcon,
} from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing, iconSizes } from '@/themes/shared';
import { useNavBarVisible } from '@/stores/navBarStore';
import { useUser } from '@/stores/authStore';
import { useAvatarUri } from '@/stores/preferencesStore';
import { normalizeAvatarUrl } from '@/utils';

export function useFloatingNavBarHeight() {
  const insets = useSafeAreaInsets();
  const barHeight = 64;
  const barMargin = sharedSpacing.md;

  return barHeight + barMargin * 2 + insets.bottom;
}

const TAB_ICONS: Record<string, IconSvgElement> = {
  HomeTab: Home01Icon,
  DiscoveryTab: DiscoverCircleIcon,
  LibraryTab: Book02Icon,
  ProfileTab: UserIcon,
};

const TAB_LABELS: Record<string, string> = {
  HomeTab: 'Home',
  DiscoveryTab: 'Discover',
  LibraryTab: 'Library',
  ProfileTab: 'Profile',
};

interface TabItemProps {
  routeName: string;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  themeName: string;
  onLayout: (event: LayoutChangeEvent) => void;
  avatarUrl?: string | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TabItem({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  theme,
  themeName,
  onLayout,
  avatarUrl,
}: TabItemProps) {
  const icon = TAB_ICONS[routeName];
  const label = TAB_LABELS[routeName];

  const pressScale = useSharedValue(1);
  const iconScale = useSharedValue(1);

  const isScholar = themeName === 'scholar';
  const isProfileTab = routeName === 'ProfileTab';
  const showAvatar = isProfileTab && avatarUrl;

  useEffect(() => {
    iconScale.value = withSpring(isFocused ? 1.1 : 1, SPRINGS.tabItem);
  }, [isFocused]);

  const handlePressIn = useCallback(() => {
    pressScale.value = withTiming(0.9, { ...TIMING.quick, easing: Easing.out(Easing.quad) });
  }, []);

  const handlePressOut = useCallback(() => {
    pressScale.value = withSpring(1, SPRINGS.tabItem);
  }, []);

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const iconColor = isFocused ? theme.colors.primary : theme.colors.foregroundMuted;
  const labelColor = isFocused ? theme.colors.primary : theme.colors.foregroundSubtle;

  const avatarSize = 22;
  const avatarBorderRadius = isScholar ? 4 : avatarSize / 2;

  const labelStyle = isScholar
    ? { fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' as const }
    : { fontSize: 10, letterSpacing: 0.2 };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={onLongPress}
      onLayout={onLayout}
      style={[styles.tabItem, containerAnimatedStyle]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.tabItemInner, iconAnimatedStyle]}>
        {showAvatar ? (
          <View
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarBorderRadius,
              borderWidth: isFocused ? 2 : 1.5,
              borderColor: isFocused ? theme.colors.primary : theme.colors.foregroundMuted,
              overflow: 'hidden',
            }}
          >
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          </View>
        ) : (
          <Icon
            icon={icon}
            size={iconSizes.md}
            color={iconColor}
            strokeWidth={isFocused ? 2 : 1.5}
          />
        )}
        <Text
          variant="caption"
          style={{
            color: labelColor,
            marginTop: 3,
            fontFamily: theme.fonts.body,
            fontWeight: isFocused ? '600' : '400',
            ...labelStyle,
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </AnimatedPressable>
  );
}

interface TabLayout {
  x: number;
  width: number;
}

export function FloatingNavBar({ state, navigation }: BottomTabBarProps) {
  const { theme, themeName, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isVisible = useNavBarVisible();
  const user = useUser();
  const localAvatarUri = useAvatarUri();
  const avatarUrl = normalizeAvatarUrl(user?.avatar_url || localAvatarUri);

  const isScholar = themeName === 'scholar';
  const isDreamer = themeName === 'dreamer';
  const isWanderer = themeName === 'wanderer';

  const barHeight = 64;
  const barMargin = sharedSpacing.md;
  const barPadding = sharedSpacing.xs;

  const totalBarHeight = barHeight + barMargin + insets.bottom + 20;
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withSpring(isVisible ? 0 : totalBarHeight, SPRINGS.hideShow);
  }, [isVisible, totalBarHeight]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const [tabLayouts, setTabLayouts] = useState<TabLayout[]>([]);
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);

  const currentIndex = state.index;

  useEffect(() => {
    if (tabLayouts.length > currentIndex && tabLayouts[currentIndex]) {
      const { x, width } = tabLayouts[currentIndex];
      indicatorX.value = withSpring(x, SPRINGS.slideIndicator);
      indicatorWidth.value = withSpring(width, SPRINGS.slideIndicator);
    }
  }, [currentIndex, tabLayouts]);

  const handleTabLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const { x, width } = event.nativeEvent.layout;
      setTabLayouts((prev) => {
        const next = [...prev];
        next[index] = { x, width };
        return next;
      });
    },
    []
  );

  const borderRadius = isDreamer
    ? barHeight / 2
    : isScholar
    ? theme.radii.md
    : theme.radii.lg;

  const borderWidth = isScholar ? 1 : isWanderer ? 1.5 : 0;
  const borderColor = isScholar
    ? theme.colors.border
    : isWanderer
    ? theme.colors.borderMuted
    : 'transparent';

  const shadowStyle = isScholar
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }
    : isDreamer
    ? {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 6,
      }
    : {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 7,
      };

  const indicatorHeight = barHeight - 12;
  const indicatorRadius = isScholar ? theme.radii.sm : indicatorHeight / 2;
  const indicatorInset = 4;

  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value + indicatorInset }],
      width: indicatorWidth.value - indicatorInset * 2,
      opacity: indicatorWidth.value > 0 ? 1 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + barMargin,
          paddingHorizontal: barMargin,
        },
        containerAnimatedStyle,
      ]}
    >
      <View
        style={[
          styles.barOuter,
          {
            borderRadius,
            ...shadowStyle,
          },
        ]}
      >
        {isDark || !BlurView ? (
          <View
            style={[
              styles.barBackground,
              {
                backgroundColor: isDark
                  ? theme.colors.surface
                  : isWanderer
                    ? 'rgba(250, 245, 236, 0.95)'
                    : 'rgba(255, 251, 247, 0.95)',
                borderRadius,
                borderWidth,
                borderColor,
              },
            ]}
          />
        ) : (
          <>
            <BlurView
              intensity={80}
              tint="light"
              style={[
                styles.barBackground,
                { borderRadius, overflow: 'hidden' },
              ]}
            />
            <View
              style={[
                styles.barBackground,
                {
                  backgroundColor: isWanderer
                    ? 'rgba(250, 245, 236, 0.85)'
                    : 'rgba(255, 251, 247, 0.88)',
                  borderRadius,
                  borderWidth,
                  borderColor,
                },
              ]}
            />
          </>
        )}

        <View
          style={[
            styles.barContent,
            {
              height: barHeight,
              paddingHorizontal: barPadding,
            },
          ]}
          accessibilityRole="tablist"
          accessibilityLabel="Main navigation"
        >
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                height: indicatorHeight,
                borderRadius: indicatorRadius,
                backgroundColor: theme.colors.tintPrimary,
                top: (barHeight - indicatorHeight) / 2,
              },
              indicatorAnimatedStyle,
            ]}
          />

          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                theme={theme}
                themeName={themeName}
                onLayout={handleTabLayout(index)}
                avatarUrl={avatarUrl}
              />
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  barOuter: {
    position: 'relative',
  },
  barBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  barContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 0,
  },
});
