import React, { useState, useCallback } from 'react';
import { View, StyleSheet, type GestureResponderEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { FlipContainer, Text, Pressable, Progress } from '@/components/atoms';
import { QuickLogKeypad } from '@/components/molecules';
import { CoverImage } from './CoverImage';
import { useTheme } from '@/themes';
import { SPRINGS, TRANSFORMS } from '@/animations';
import type { UserBook, ReadingStats } from '@/types/book';

export interface HeroFlipCardProps {
  book: UserBook;
  stats: ReadingStats | null;
  onLogSession: (endPage: number, durationSeconds?: number) => Promise<void>;
  onLongPress?: () => void;
  isLogging?: boolean;
}

const CARD_WIDTH = 280;
const CARD_HEIGHT = 360;
const MAX_TILT = TRANSFORMS.maxTiltAngle;

export function HeroFlipCard({
  book,
  stats,
  onLogSession,
  onLongPress,
  isLogging = false,
}: HeroFlipCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [isFlipped, setIsFlipped] = useState(false);

  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);

  const handleTouchStart = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      const centerX = CARD_WIDTH / 2;
      const centerY = CARD_HEIGHT / 2;

      const offsetX = (locationX - centerX) / centerX;
      const offsetY = (locationY - centerY) / centerY;

      rotateY.value = withSpring(offsetX * MAX_TILT, SPRINGS.responsive);
      rotateX.value = withSpring(-offsetY * MAX_TILT, SPRINGS.responsive);
    },
    [rotateX, rotateY]
  );

  const handleTouchMove = useCallback(
    (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      const centerX = CARD_WIDTH / 2;
      const centerY = CARD_HEIGHT / 2;

      const offsetX = Math.max(-1, Math.min(1, (locationX - centerX) / centerX));
      const offsetY = Math.max(-1, Math.min(1, (locationY - centerY) / centerY));

      rotateY.value = withSpring(offsetX * MAX_TILT, SPRINGS.responsive);
      rotateX.value = withSpring(-offsetY * MAX_TILT, SPRINGS.responsive);
    },
    [rotateX, rotateY]
  );

  const handleTouchEnd = useCallback(() => {
    rotateX.value = withSpring(0, SPRINGS.settle);
    rotateY.value = withSpring(0, SPRINGS.settle);
  }, [rotateX, rotateY]);

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    triggerHaptic('medium');
  }, []);

  const handleLogSession = useCallback(
    async (endPage: number, durationSeconds?: number) => {
      await onLogSession(endPage, durationSeconds);
      setIsFlipped(false);
    },
    [onLogSession]
  );

  const tiltStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: TRANSFORMS.perspectiveDefault + 200 },
      { rotateX: `${rotateX.value}deg` },
      { rotateY: `${rotateY.value}deg` },
    ],
  }));

  const cardRadius = isScholar ? theme.radii.sm : theme.radii.xl;
  const progressPercentage = book.progress_percentage ?? 0;

  const frontContent = (
    <View
      style={[
        styles.cardFace,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: cardRadius,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
          ...theme.shadows.lg,
        },
      ]}
    >
      <View style={styles.coverContainer}>
        <CoverImage
          uri={book.book.cover_url}
          size="hero"
          fallbackText={book.book.title}
        />
      </View>

      <View style={styles.infoContainer}>
        <Text
          variant="h3"
          numberOfLines={1}
          style={{
            color: theme.colors.foreground,
            textAlign: 'center',
            fontSize: 18,
          }}
        >
          {book.book.title}
        </Text>

        <Text
          variant="caption"
          numberOfLines={1}
          style={{
            color: theme.colors.foregroundMuted,
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {book.book.author}
        </Text>

        <View style={styles.progressSection}>
          <Progress
            value={progressPercentage}
            size="md"
            showPercentage={false}
          />

          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              marginTop: 4,
            }}
          >
            Page {book.current_page}
            {book.book.page_count ? ` of ${book.book.page_count}` : ''}
            {' Â· '}
            {Math.round(progressPercentage)}%
          </Text>
        </View>
      </View>

      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundFaint,
          position: 'absolute',
          bottom: 8,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 10,
        }}
      >
        Tap to log reading
      </Text>
    </View>
  );

  const backContent = (
    <View
      style={[
        styles.cardFace,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: cardRadius,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
          ...theme.shadows.lg,
        },
      ]}
    >
      <Text
        variant="h3"
        style={{
          color: theme.colors.foreground,
          textAlign: 'center',
          marginTop: 16,
          marginBottom: 8,
          fontSize: 18,
        }}
      >
        Log Reading
      </Text>

      <QuickLogKeypad
        currentPage={book.current_page}
        pageCount={book.book.page_count}
        onLog={handleLogSession}
        isLogging={isLogging}
      />

      <Pressable
        onPress={handleFlip}
        haptic="light"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          alignItems: 'center',
        }}
      >
        <Text
          variant="caption"
          style={{
            color: theme.colors.primary,
            fontSize: 12,
          }}
        >
          â† Back to book
        </Text>
      </Pressable>
    </View>
  );

  return (
    <Pressable
      onPress={handleFlip}
      onLongPress={onLongPress}
      haptic="none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={styles.container}
    >
      <Animated.View style={[styles.cardWrapper, tiltStyle]}>
        <FlipContainer
          isFlipped={isFlipped}
          frontContent={frontContent}
          backContent={backContent}
          style={styles.flipContainer}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  flipContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardFace: {
    width: '100%',
    height: '100%',
    padding: 12,
    alignItems: 'center',
  },
  coverContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
  },
});

