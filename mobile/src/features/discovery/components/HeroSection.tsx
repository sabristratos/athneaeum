import React, { memo, useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { SparklesIcon, Add01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon, Pressable } from '@/components';
import { Card } from '@/components/organisms/cards';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { CatalogBook } from '@/types/discovery';

const COVER_WIDTH = 100;
const COVER_HEIGHT = 150;

interface HeroSectionProps {
  book: CatalogBook;
  onPress: (book: CatalogBook) => void;
  onAddToLibrary: (book: CatalogBook) => void;
}

function HeroSectionComponent({ book, onPress, onAddToLibrary }: HeroSectionProps) {
  const { theme, themeName } = useTheme();

  const entranceProgress = useSharedValue(0);
  const coverScale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);

  const isScholar = themeName === 'scholar';

  useEffect(() => {
    entranceProgress.value = withSpring(1, SPRINGS.soft);
    coverScale.value = withDelay(100, withSpring(1, SPRINGS.gentle));
    contentOpacity.value = withDelay(200, withSpring(1, SPRINGS.soft));
  }, [book.id]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(entranceProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(entranceProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
    ],
  }));

  const coverAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coverScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [10, 0], Extrapolation.CLAMP) },
    ],
  }));

  const handlePress = () => {
    triggerHaptic('light');
    onPress(book);
  };

  const handleAddPress = () => {
    triggerHaptic('success');
    onAddToLibrary(book);
  };

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <Pressable onPress={handlePress} activeOpacity={0.95} activeScale={0.98}>
        <Card variant="elevated" padding="md">
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.labelBadge,
                {
                  backgroundColor: theme.colors.tintPrimary,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
                },
              ]}
            >
              <Icon icon={SparklesIcon} size={14} color={theme.colors.primary} />
              <Text
                variant="caption"
                style={{
                  color: theme.colors.primary,
                  fontWeight: '600',
                  marginLeft: 4,
                }}
              >
                Today's Pick
              </Text>
            </View>
          </View>

          <View style={styles.contentRow}>
            <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
              {book.cover_url ? (
                <Image
                  source={{ uri: book.cover_url }}
                  style={[
                    styles.cover,
                    {
                      borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                    },
                  ]}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[
                    styles.cover,
                    styles.placeholderCover,
                    {
                      backgroundColor: theme.colors.surfaceAlt,
                      borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                    },
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
            </Animated.View>

            <Animated.View style={[styles.textContent, contentAnimatedStyle]}>
              <Text
                variant="h3"
                numberOfLines={2}
                style={{ color: theme.colors.foreground }}
              >
                {book.title}
              </Text>

              {book.author && (
                <Text
                  variant="body"
                  numberOfLines={1}
                  style={{
                    color: theme.colors.foregroundMuted,
                    marginTop: 4,
                  }}
                >
                  {book.author}
                </Text>
              )}

              {book.recommendation_reason && (
                <Text
                  variant="caption"
                  numberOfLines={2}
                  style={{
                    color: theme.colors.foregroundSubtle,
                    marginTop: theme.spacing.sm,
                    fontStyle: 'italic',
                  }}
                >
                  "{book.recommendation_reason}"
                </Text>
              )}

              <View style={{ marginTop: theme.spacing.md }}>
                <Button variant="primary" size="md" onPress={handleAddPress}>
                  <Icon icon={Add01Icon} size={18} color={theme.colors.onPrimary} />
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}
                  >
                    Add to Library
                  </Text>
                </Button>
              </View>
            </Animated.View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

export const HeroSection = memo(HeroSectionComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 16,
  },
  coverContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cover: {
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  },
  placeholderCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
