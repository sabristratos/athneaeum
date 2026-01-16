import React, { useState, useRef, useCallback } from 'react';
import { View, TextInput, Pressable as RNPressable, Keyboard, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Search01Icon, Cancel01Icon, ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components';
import { useTheme } from '@/themes';
import { triggerHaptic } from '@/hooks/useHaptic';
import { SPRINGS } from '@/animations/constants';

interface DiscoveryHeaderProps {
  onSearch: (query: string) => void;
  onSearchFocus?: () => void;
  onSearchBlur?: () => void;
  recentSearches?: string[];
  onRecentSearchPress?: (query: string) => void;
  onClearRecentSearches?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export function DiscoveryHeader({
  onSearch,
  onSearchFocus,
  onSearchBlur,
  recentSearches = [],
  onRecentSearchPress,
  onClearRecentSearches,
}: DiscoveryHeaderProps) {
  const { theme, themeName } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const expandProgress = useSharedValue(0);
  const iconScale = useSharedValue(1);

  const isScholar = themeName === 'scholar';

  const handleExpandSearch = useCallback(() => {
    triggerHaptic('light');
    setIsExpanded(true);
    expandProgress.value = withSpring(1, SPRINGS.soft);
    onSearchFocus?.();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [onSearchFocus]);

  const handleCollapseSearch = useCallback(() => {
    triggerHaptic('light');
    Keyboard.dismiss();
    setIsExpanded(false);
    setSearchQuery('');
    expandProgress.value = withSpring(0, SPRINGS.soft);
    onSearchBlur?.();
  }, [onSearchBlur]);

  const handleSubmitSearch = useCallback(() => {
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  }, [searchQuery, onSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    inputRef.current?.focus();
  }, []);

  const handleIconPressIn = useCallback(() => {
    iconScale.value = withTiming(0.9, { duration: 100 });
  }, []);

  const handleIconPressOut = useCallback(() => {
    iconScale.value = withSpring(1, SPRINGS.snappy);
  }, []);

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(expandProgress.value, [0, 1], [0, -20], Extrapolation.CLAMP) },
    ],
  }));

  const searchBarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0.3, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(expandProgress.value, [0, 1], [50, 0], Extrapolation.CLAMP) },
    ],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const searchIconAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.3], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(expandProgress.value, [0, 0.5], [1, 0.8], Extrapolation.CLAMP) },
    ],
  }));

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {!isExpanded ? (
          <>
            <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
              <Text variant="h2" style={{ color: theme.colors.foreground }}>
                Discover
              </Text>
            </Animated.View>

            <AnimatedPressable
              onPress={handleExpandSearch}
              onPressIn={handleIconPressIn}
              onPressOut={handleIconPressOut}
              style={[iconAnimatedStyle, searchIconAnimatedStyle]}
            >
              <View
                style={[
                  styles.searchIconContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderRadius,
                    borderWidth: theme.borders.thin,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Icon icon={Search01Icon} size={20} color={theme.colors.foreground} />
              </View>
            </AnimatedPressable>
          </>
        ) : (
          <Animated.View style={[styles.searchBarContainer, searchBarAnimatedStyle]}>
            <RNPressable onPress={handleCollapseSearch} style={styles.backButton}>
              <Icon icon={ArrowLeft02Icon} size={22} color={theme.colors.foreground} />
            </RNPressable>

            <View
              style={[
                styles.searchInputContainer,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius,
                  borderWidth: theme.borders.thin,
                  borderColor: theme.colors.borderMuted,
                },
              ]}
            >
              <View style={{ marginRight: theme.spacing.sm }}>
                <Icon
                  icon={Search01Icon}
                  size={18}
                  color={theme.colors.foregroundMuted}
                />
              </View>
              <TextInput
                ref={inputRef}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSubmitSearch}
                placeholder="Search books..."
                placeholderTextColor={theme.colors.foregroundMuted}
                style={[
                  styles.searchInput,
                  {
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.body,
                  },
                ]}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <RNPressable onPress={handleClearSearch} style={styles.clearButton}>
                  <Icon icon={Cancel01Icon} size={18} color={theme.colors.foregroundMuted} />
                </RNPressable>
              )}
            </View>
          </Animated.View>
        )}
      </View>

      {isExpanded && recentSearches.length > 0 && !searchQuery && (
        <View style={[styles.recentSearches, { marginTop: theme.spacing.md }]}>
          <View style={styles.recentHeader}>
            <Text variant="caption" muted>
              Recent
            </Text>
            {onClearRecentSearches && (
              <RNPressable onPress={onClearRecentSearches}>
                <Text variant="caption" style={{ color: theme.colors.primary }}>
                  Clear
                </Text>
              </RNPressable>
            )}
          </View>
          <View style={styles.recentChips}>
            {recentSearches.slice(0, 5).map((search, index) => (
              <RNPressable
                key={`${search}-${index}`}
                onPress={() => {
                  triggerHaptic('light');
                  setSearchQuery(search);
                  onRecentSearchPress?.(search);
                }}
              >
                <View
                  style={[
                    styles.recentChip,
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                      borderWidth: theme.borders.thin,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text variant="caption">{search}</Text>
                </View>
              </RNPressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  titleContainer: {
    flex: 1,
  },
  searchIconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  recentSearches: {
    paddingLeft: 48,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});
