import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { ArrowLeft02Icon, MoreVerticalIcon } from '@hugeicons/core-free-icons';
import { Text, IconButton } from '@/components/atoms';
import { useTheme } from '@/themes';

interface StickyHeaderProps {
  title: string;
  scrollY: SharedValue<number>;
  /** scrollY at which title starts fading in (default: 150) */
  titleFadeStart?: number;
  /** scrollY at which title is fully visible (default: 250) */
  titleFadeEnd?: number;
  onBackPress: () => void;
  onMenuPress: () => void;
}

/**
 * A sticky header with blur effect that shows the book title
 * when the main title scrolls out of view.
 */
export function StickyHeader({
  title,
  scrollY,
  titleFadeStart = 150,
  titleFadeEnd = 250,
  onBackPress,
  onMenuPress,
}: StickyHeaderProps) {
  const { theme, themeName } = useTheme();
  const isDark = themeName === 'scholar';
  const insets = useSafeAreaInsets();

  // Animated title opacity
  const titleAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [titleFadeStart, titleFadeEnd],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Animated opacity for background and border (shows when scrolled)
  const scrollFadeStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 50],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const headerHeight = 56;
  const blurIntensity = isDark ? 80 : 60;

  // Fallback background for web or if blur fails
  const fallbackBackground = isDark
    ? 'rgba(18, 16, 14, 0.95)'
    : 'rgba(253, 251, 247, 0.95)';

  const renderContent = () => (
    <View
      style={[
        styles.row,
        {
          height: headerHeight,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
    >
      <IconButton
        icon={ArrowLeft02Icon}
        onPress={onBackPress}
        variant="ghost"
        accessibilityLabel="Go back"
      />

      <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
        <Text
          variant="body"
          numberOfLines={1}
          style={{
            fontWeight: '600',
            textAlign: 'center',
            color: theme.colors.foreground,
          }}
        >
          {title}
        </Text>
      </Animated.View>

      <IconButton
        icon={MoreVerticalIcon}
        onPress={onMenuPress}
        variant="ghost"
        accessibilityLabel="More options"
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      {/* Animated background - fades in on scroll */}
      <Animated.View style={[StyleSheet.absoluteFill, scrollFadeStyle]}>
        {Platform.OS !== 'web' ? (
          <BlurView
            intensity={blurIntensity}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: fallbackBackground }]}
          />
        )}
      </Animated.View>

      {renderContent()}

      {/* Animated border at bottom */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: theme.colors.border,
          },
          scrollFadeStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
});
