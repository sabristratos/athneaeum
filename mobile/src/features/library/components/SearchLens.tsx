import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  useWindowDimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Pressable, Icon, Text } from '@/components/atoms';
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

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isActive]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const searchContainerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(overlayOpacity.value, [0, 1], [-50, 0]) },
      { scale: interpolate(overlayOpacity.value, [0, 1], [0.9, 1]) },
    ],
    opacity: overlayOpacity.value,
  }));

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleClear = () => {
    onSearchChange('');
    inputRef.current?.focus();
  };

  if (!isActive) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, backdropStyle]}>
      {/* Touchable backdrop - captures all taps */}
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={theme.isDark ? 20 : 30}
            tint={theme.isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: theme.colors.overlay },
            ]}
          />
        </View>
      </TouchableWithoutFeedback>

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
        <View
          style={[
            styles.glowEffect,
            {
              backgroundColor: theme.colors.primaryGlow || theme.colors.primary,
              borderRadius: theme.radii.xl,
            },
          ]}
        />

        <View style={styles.iconContainer}>
          <Icon icon={Search01Icon} size={22} color={theme.colors.primary} />
        </View>

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

        {searchQuery.length > 0 && (
          <Pressable onPress={handleClear} haptic="light" style={styles.clearButton}>
            <Icon icon={Cancel01Icon} size={18} color={theme.colors.foregroundMuted} />
          </Pressable>
        )}
      </Animated.View>

      {/* Match count - pointerEvents none so taps pass through */}
      <Animated.View
        style={[
          styles.matchCount,
          { top: screenHeight * 0.15 + 70 },
          searchContainerStyle,
        ]}
        pointerEvents="none"
      >
        <Text
          variant="caption"
          style={{ color: theme.colors.paper, fontFamily: theme.fonts.body }}
        >
          {searchQuery.trim()
            ? `${matchingCount} of ${totalCount} books match`
            : `${totalCount} books in view`}
        </Text>
      </Animated.View>

      {/* Close hint - pointerEvents none so taps pass through */}
      <Animated.View style={[styles.closeHint, searchContainerStyle]} pointerEvents="none">
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
