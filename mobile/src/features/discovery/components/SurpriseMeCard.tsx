import React, { memo, useCallback, useState, useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import {
  DiceIcon,
  RefreshIcon,
  Add01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons';
import { Text, Icon, Button, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS, TIMING } from '@/animations/constants';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { CatalogBook } from '@/types/discovery';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SurpriseMeCardProps {
  books: CatalogBook[];
  onBookPress: (book: CatalogBook) => void;
  onAddToLibrary: (book: CatalogBook) => void;
}

function SurpriseMeCardComponent({
  books,
  onBookPress,
  onAddToLibrary,
}: SurpriseMeCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [currentBook, setCurrentBook] = useState<CatalogBook | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());

  const flipProgress = useSharedValue(0);
  const shakeProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const getRandomBook = useCallback(() => {
    if (books.length === 0) return null;

    const availableIndices = books
      .map((_, idx) => idx)
      .filter((idx) => !usedIndices.has(idx));

    if (availableIndices.length === 0) {
      setUsedIndices(new Set());
      return books[Math.floor(Math.random() * books.length)];
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setUsedIndices((prev) => new Set([...prev, randomIndex]));
    return books[randomIndex];
  }, [books, usedIndices]);

  const handleReveal = useCallback(() => {
    triggerHaptic('medium');

    shakeProgress.value = withSequence(
      withTiming(-3, { duration: 50 }),
      withTiming(3, { duration: 50 }),
      withTiming(-2, { duration: 50 }),
      withTiming(2, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );

    const newBook = getRandomBook();
    if (newBook) {
      setTimeout(() => {
        setCurrentBook(newBook);
        flipProgress.value = withSpring(1, SPRINGS.modal);
        glowOpacity.value = withSequence(
          withTiming(0.8, { duration: 200 }),
          withTiming(0, { duration: 400 })
        );
        setIsRevealed(true);
      }, 300);
    }
  }, [getRandomBook]);

  const handleShuffle = useCallback(() => {
    triggerHaptic('light');

    flipProgress.value = withTiming(0, TIMING.fast, () => {
      runOnJS(setIsRevealed)(false);
    });

    setTimeout(() => {
      handleReveal();
    }, 200);
  }, [handleReveal]);

  const handleBookPress = useCallback(() => {
    if (currentBook) {
      triggerHaptic('light');
      onBookPress(currentBook);
    }
  }, [currentBook, onBookPress]);

  const handleAddPress = useCallback(() => {
    if (currentBook) {
      triggerHaptic('success');
      onAddToLibrary(currentBook);
    }
  }, [currentBook, onAddToLibrary]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${shakeProgress.value}deg` },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flipProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const borderRadius = isScholar ? theme.radii.md : theme.radii.lg;

  if (books.length === 0) return null;

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderRadius,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
            ...theme.shadows.md,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: theme.colors.primary,
              borderRadius,
            },
            glowAnimatedStyle,
          ]}
        />

        <View style={styles.cardInner}>
          {!isRevealed && (
            <Animated.View style={[styles.face, styles.frontFace, frontAnimatedStyle]}>
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.colors.tintPrimary,
                    borderRadius: isScholar ? theme.radii.md : theme.radii.full,
                  },
                ]}
              >
                <Icon icon={DiceIcon} size={32} color={theme.colors.primary} />
              </View>

              <Text
                variant="h3"
                style={{ color: theme.colors.foreground, textAlign: 'center', marginTop: 16 }}
              >
                Surprise Me!
              </Text>
              <Text
                variant="body"
                style={{ color: theme.colors.foregroundMuted, textAlign: 'center', marginTop: 8 }}
              >
                Feeling adventurous? Let us pick your next read.
              </Text>

              <View style={{ marginTop: 20 }}>
                <Button variant="primary" size="md" onPress={handleReveal}>
                  Discover a Random Book
                </Button>
              </View>
            </Animated.View>
          )}

          {isRevealed && currentBook && (
            <Animated.View style={[styles.face, styles.backFace, backAnimatedStyle]}>
              <Pressable onPress={handleBookPress}>
                <View style={styles.revealedContent}>
                  {currentBook.cover_url ? (
                    <Image
                      source={{ uri: currentBook.cover_url }}
                      style={[
                        styles.revealedCover,
                        { borderRadius: isScholar ? theme.radii.sm : theme.radii.md },
                      ]}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.revealedCover,
                        styles.placeholderCover,
                        {
                          backgroundColor: theme.colors.surfaceAlt,
                          borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                        },
                      ]}
                    >
                      <Text variant="caption" numberOfLines={2} style={{ textAlign: 'center' }}>
                        {currentBook.title}
                      </Text>
                    </View>
                  )}

                  <View style={styles.revealedInfo}>
                    <Text variant="body" numberOfLines={2} style={{ fontWeight: '600' }}>
                      {currentBook.title}
                    </Text>
                    {currentBook.author && (
                      <Text variant="caption" muted numberOfLines={1}>
                        {currentBook.author}
                      </Text>
                    )}
                    <View style={styles.viewDetails}>
                      <Text variant="caption" style={{ color: theme.colors.primary }}>
                        View details
                      </Text>
                      <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.primary} />
                    </View>
                  </View>
                </View>
              </Pressable>

              <View style={styles.revealedActions}>
                <Button variant="primary" size="md" onPress={handleAddPress}>
                  <Icon icon={Add01Icon} size={18} color={theme.colors.onPrimary} />
                  <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', marginLeft: 6 }}>
                    Add
                  </Text>
                </Button>

                <Button variant="ghost" size="md" onPress={handleShuffle}>
                  <Icon icon={RefreshIcon} size={18} color={theme.colors.foregroundMuted} />
                  <Text style={{ color: theme.colors.foregroundMuted, marginLeft: 6 }}>
                    Not this one
                  </Text>
                </Button>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

export const SurpriseMeCard = memo(SurpriseMeCardComponent);

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInner: {
    minHeight: 260,
  },
  face: {
    padding: 24,
  },
  frontFace: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  backFace: {
    justifyContent: 'space-between',
    minHeight: 260,
  },
  iconContainer: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealedContent: {
    flexDirection: 'row',
    gap: 16,
  },
  revealedCover: {
    width: 80,
    height: 120,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  revealedInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  revealedActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
});
