import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Pressable } from '@/components/Pressable';
import { Icon } from '@/components/Icon';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import { Cancel01Icon, Search01Icon } from '@hugeicons/core-free-icons';

interface SearchLensProps {
  isActive: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClose: () => void;
  matchingCount: number;
  totalCount: number;
  overlayOpacity: SharedValue<number>;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
};

/**
 * SearchLens overlay component.
 * Displays a blurred backdrop with a glowing search input.
 * Shows matching count as user types.
 */
export const SearchLens = memo(function SearchLens({
  isActive,
  searchQuery,
  onSearchChange,
  onClose,
  matchingCount,
  totalCount,
  overlayOpacity,
}: SearchLensProps) {
  const { theme, themeName } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  // Focus input when lens opens
  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isActive]);

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const searchContainerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(overlayOpacity.value, [0, 1], [-50, 0]),
      },
      {
        scale: interpolate(overlayOpacity.value, [0, 1], [0.9, 1]),
      },
    ],
    opacity: overlayOpacity.value,
  }));

  // Handle backdrop press (close lens)
  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  // Handle clear search
  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, backdropStyle]} pointerEvents={isActive ? 'auto' : 'none'}>
      {/* Blurred backdrop */}
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={handleBackdropPress}
        haptic="none"
      >
        <BlurView
          intensity={theme.isDark ? 40 : 60}
          tint={theme.isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.colors.overlay },
          ]}
        />
      </Pressable>

      {/* Search container */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            top: screenHeight * 0.15,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.xl,
            borderWidth: 2,
            borderColor: theme.colors.primary,
            ...theme.shadows.lg,
          },
          searchContainerStyle,
        ]}
      >
        {/* Glow effect */}
        <View
          style={[
            styles.glowEffect,
            {
              backgroundColor: theme.colors.primaryGlow || theme.colors.primary,
              borderRadius: theme.radii.xl,
            },
          ]}
        />

        {/* Search icon */}
        <View style={styles.iconContainer}>
          <Icon
            icon={Search01Icon}
            size={22}
            color={theme.colors.primary}
          />
        </View>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
          placeholder={
            themeName === 'scholar'
              ? 'Search the archives...'
              : themeName === 'dreamer'
                ? 'Find a story...'
                : 'Search your collection...'
          }
          placeholderTextColor={theme.colors.foregroundSubtle}
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          selectionColor={theme.colors.primary}
        />

        {/* Clear button */}
        {searchQuery.length > 0 && (
          <Pressable
            onPress={handleClear}
            haptic="light"
            style={styles.clearButton}
          >
            <Icon
              icon={Cancel01Icon}
              size={18}
              color={theme.colors.foregroundMuted}
            />
          </Pressable>
        )}
      </Animated.View>

      {/* Match count */}
      <Animated.View
        style={[
          styles.matchCount,
          {
            top: screenHeight * 0.15 + 70,
          },
          searchContainerStyle,
        ]}
      >
        <Text
          variant="caption"
          style={{
            color: theme.colors.paper,
            fontFamily: theme.fonts.body,
          }}
        >
          {searchQuery.trim()
            ? `${matchingCount} of ${totalCount} books match`
            : `${totalCount} books in view`}
        </Text>
      </Animated.View>

      {/* Close hint */}
      <Animated.View
        style={[
          styles.closeHint,
          searchContainerStyle,
        ]}
      >
        <Text
          variant="caption"
          style={{
            color: theme.colors.paper,
            opacity: 0.7,
            fontFamily: theme.fonts.body,
          }}
        >
          Tap outside to close
        </Text>
      </Animated.View>
    </Animated.View>
  );
});

/**
 * Floating search button that opens the SearchLens
 */
interface SearchLensButtonProps {
  onPress: () => void;
  isActive?: boolean;
}

export const SearchLensButton = memo(function SearchLensButton({
  onPress,
  isActive = false,
}: SearchLensButtonProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      haptic="medium"
      style={[
        styles.floatingButton,
        {
          backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
          borderRadius: theme.radii.full,
          borderWidth: theme.borders.thin,
          borderColor: isActive ? theme.colors.primary : theme.colors.border,
          ...theme.shadows.md,
        },
      ]}
      accessibilityLabel="Search library"
      accessibilityRole="button"
    >
      <Icon
        icon={Search01Icon}
        size={22}
        color={isActive ? theme.colors.onPrimary : theme.colors.foreground}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  searchContainer: {
    position: 'absolute',
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  glowEffect: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.1,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  matchCount: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  closeHint: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  floatingButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
