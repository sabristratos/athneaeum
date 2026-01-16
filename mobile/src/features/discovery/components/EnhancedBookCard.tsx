import React, { memo, useCallback } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { StarIcon } from '@hugeicons/core-free-icons';
import { Text, Icon, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';
import { formatMood } from '@/utils/moodLabels';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { CatalogBook } from '@/types/discovery';
import type { Intensity } from '@/types/book';

const CARD_WIDTH = 140;
const COVER_HEIGHT = 200;

const INTENSITY_COLORS: Record<Intensity, string> = {
  light: '#22c55e',
  moderate: '#f59e0b',
  dark: '#f97316',
  intense: '#ef4444',
};

interface EnhancedBookCardProps {
  book: CatalogBook;
  onPress: () => void;
  onLongPress?: () => void;
}

function EnhancedBookCardComponent({ book, onPress, onLongPress }: EnhancedBookCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const scale = useSharedValue(1);
  const elevation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: -elevation.value * 2 },
    ],
  }));

  const shadowAnimatedStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.15 + elevation.value * 0.1,
    shadowRadius: 8 + elevation.value * 4,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, SPRINGS.snappy);
    elevation.value = withSpring(3, SPRINGS.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRINGS.snappy);
    elevation.value = withSpring(0, SPRINGS.snappy);
  }, []);

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      triggerHaptic('medium');
      onLongPress();
    }
  }, [onLongPress]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.md;
  const chipRadius = isScholar ? theme.radii.xs : theme.radii.full;

  const hasRating = book.average_rating && book.average_rating > 0;
  const hasPageCount = book.page_count && book.page_count > 0;
  const showOverlay = hasRating || hasPageCount;

  const moodChips = book.moods?.slice(0, 2) || [];
  const genreChips = book.genres?.slice(0, 1) || [];
  const hasIntensity = book.intensity && book.is_classified;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLongPress={handleLongPress}
      delayLongPress={400}
    >
      <Animated.View
        style={[
          styles.card,
          {
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            elevation: 4,
          },
          shadowAnimatedStyle,
          animatedStyle,
        ]}
      >
        <View style={[styles.coverContainer, { borderRadius }]}>
          {book.cover_url ? (
            <Image
              source={{ uri: book.cover_url }}
              style={[styles.cover, { borderRadius }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cover,
                styles.placeholderCover,
                { backgroundColor: theme.colors.surface, borderRadius },
              ]}
            >
              <Text
                variant="caption"
                numberOfLines={3}
                style={{ textAlign: 'center', paddingHorizontal: 8 }}
              >
                {book.title}
              </Text>
            </View>
          )}

          {showOverlay && (
            <View style={[styles.overlayContainer, { borderRadius }]}>
              <BlurView
                intensity={60}
                tint="dark"
                style={[styles.overlay, { borderRadius: chipRadius }]}
              >
                {hasRating && (
                  <View style={styles.overlayItem}>
                    <Icon icon={StarIcon} size={12} color="#FFD700" />
                    <Text
                      style={[styles.overlayText, { color: '#fff' }]}
                    >
                      {book.average_rating?.toFixed(1)}
                    </Text>
                  </View>
                )}
                {hasRating && hasPageCount && (
                  <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                )}
                {hasPageCount && (
                  <View style={styles.overlayItem}>
                    <Text style={[styles.overlayText, { color: '#fff' }]}>
                      {book.page_count}p
                    </Text>
                  </View>
                )}
              </BlurView>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text
            variant="caption"
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.foreground }]}
          >
            {book.title}
          </Text>
          {book.author && (
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}
            >
              {book.author}
            </Text>
          )}

          {(genreChips.length > 0 || moodChips.length > 0 || hasIntensity) && (
            <View style={styles.chips}>
              {genreChips.map((genre) => (
                <View
                  key={genre}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.tintPrimary,
                      borderRadius: chipRadius,
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: theme.colors.primary }]}
                  >
                    {genre}
                  </Text>
                </View>
              ))}
              {hasIntensity && (
                <View
                  style={[
                    styles.chip,
                    styles.intensityChip,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: chipRadius,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.intensityDot,
                      { backgroundColor: INTENSITY_COLORS[book.intensity!] },
                    ]}
                  />
                  <Text
                    style={[styles.chipText, { color: theme.colors.foregroundMuted }]}
                  >
                    {book.intensity_label || book.intensity}
                  </Text>
                </View>
              )}
              {moodChips.map((mood) => (
                <View
                  key={mood}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: chipRadius,
                    },
                  ]}
                >
                  <Text
                    style={[styles.chipText, { color: theme.colors.foregroundMuted }]}
                  >
                    {formatMood(mood)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

export const EnhancedBookCard = memo(EnhancedBookCardComponent);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  coverContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  cover: {
    width: CARD_WIDTH,
    height: COVER_HEIGHT,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    overflow: 'hidden',
  },
  overlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  overlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  overlayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 12,
    marginHorizontal: 8,
  },
  info: {
    marginTop: 8,
    gap: 2,
  },
  title: {
    fontWeight: '600',
    fontSize: 13,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '500',
  },
  intensityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  intensityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
