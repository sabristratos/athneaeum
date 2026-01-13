import React, { memo, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';
import { TIMING } from '@/animations/constants';

import { Pressable, Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { useSpineColor, useSpineColorActions } from '@/stores/spineColorStore';
import { getContrastingTextColor } from '@/utils/colorUtils';
import { SpineTexture } from './SpineTexture';
import { WearOverlay, getBookAge } from './WearOverlay';
import {
  SPINE_HEIGHT_MIN,
  SPINE_HEIGHT_MAX,
  SPINE_WIDTH_MIN,
  SPINE_WIDTH_MAX,
  REAL_HEIGHT_MIN_CM,
  REAL_HEIGHT_MAX_CM,
  REAL_THICKNESS_MIN_CM,
  REAL_THICKNESS_MAX_CM,
} from './constants';
import type { Book, UserBook } from '@/types';

const TEXT_PADDING = 6;
const MAX_TITLE_LENGTH = 35;
const MAX_STAGGER_INDEX = 15;
const LARGE_LIBRARY_THRESHOLD = 50;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash));
}

function getSpineWidth(
  pageCount: number | null | undefined,
  thicknessCm: number | null | undefined
): number {
  if (thicknessCm && thicknessCm > 0) {
    const normalized = (thicknessCm - REAL_THICKNESS_MIN_CM) / (REAL_THICKNESS_MAX_CM - REAL_THICKNESS_MIN_CM);
    return Math.round(SPINE_WIDTH_MIN + clamp(normalized, 0, 1) * (SPINE_WIDTH_MAX - SPINE_WIDTH_MIN));
  }

  if (!pageCount || pageCount < 1) {
    return Math.round((SPINE_WIDTH_MIN + SPINE_WIDTH_MAX) / 2);
  }

  const minPages = 50;
  const maxPages = 1200;
  const normalized = (pageCount - minPages) / (maxPages - minPages);
  const eased = Math.pow(clamp(normalized, 0, 1), 0.7);

  return Math.round(SPINE_WIDTH_MIN + eased * (SPINE_WIDTH_MAX - SPINE_WIDTH_MIN));
}

function getSpineHeight(
  pageCount: number | null | undefined,
  heightCm: number | null | undefined,
  bookId: string
): number {
  const heightRange = SPINE_HEIGHT_MAX - SPINE_HEIGHT_MIN;

  if (heightCm && heightCm > 0) {
    const normalized = (heightCm - REAL_HEIGHT_MIN_CM) / (REAL_HEIGHT_MAX_CM - REAL_HEIGHT_MIN_CM);
    return Math.round(SPINE_HEIGHT_MIN + clamp(normalized, 0, 1) * heightRange);
  }

  const pages = pageCount || 200;
  const normalizedPages = clamp(pages, 50, 1200);
  const pageRatio = (normalizedPages - 50) / (1200 - 50);
  const randomFactor = seededRandom(bookId);
  const blendedRatio = (pageRatio * 0.7) + (randomFactor * 0.3);
  return Math.round(SPINE_HEIGHT_MIN + (blendedRatio * heightRange));
}

interface BookSpineProps {
  book: Book;
  userBook?: UserBook;
  onPress?: () => void;
  index?: number;
  skewAngle?: SharedValue<number>;
  totalBooks?: number;
}

export const BookSpine = memo(
  function BookSpine({
    book,
    userBook,
    onPress,
    index = 0,
    skewAngle,
    totalBooks = 0,
  }: BookSpineProps) {
    const { theme, themeName } = useTheme();

    const bookIdString = book.id.toString();
    const cachedColor = useSpineColor(bookIdString);
    const { queueExtraction } = useSpineColorActions();

    const isLargeLibrary = totalBooks > LARGE_LIBRARY_THRESHOLD;
    const shouldStagger = !isLargeLibrary && index < MAX_STAGGER_INDEX;
    const opacity = useSharedValue(shouldStagger ? 0 : 1);

    useEffect(() => {
      if (shouldStagger) {
        const delay = index * 12;
        opacity.value = withDelay(delay, withTiming(1, TIMING.normal));
      }
    }, [index, opacity, shouldStagger]);

    useEffect(() => {
      if (!cachedColor && book.cover_url) {
        queueExtraction(bookIdString, book.cover_url);
      }
    }, [book.cover_url, bookIdString, cachedColor, queueExtraction]);

    const spineColor = cachedColor || theme.colors.surfaceHover;

    const spineWidth = useMemo(() => {
      return getSpineWidth(book.page_count, book.thickness_cm);
    }, [book.page_count, book.thickness_cm]);

    const spineHeight = useMemo(() => {
      return getSpineHeight(book.page_count, book.height_cm, book.id.toString());
    }, [book.page_count, book.height_cm, book.id]);

    const textColor = useMemo(() => {
      return getContrastingTextColor(spineColor, '#ffffff', '#1a1a1a');
    }, [spineColor]);

    const displayTitle = useMemo(() => {
      if (book.title.length > MAX_TITLE_LENGTH) {
        return book.title.slice(0, MAX_TITLE_LENGTH - 2) + '...';
      }
      return book.title;
    }, [book.title]);

    const bookAge = useMemo(() => {
      return getBookAge(userBook?.created_at || null);
    }, [userBook?.created_at]);

    const skewStyle = useAnimatedStyle(() => {
      if (!skewAngle) {
        return {};
      }
      const skewDirection = index % 2 === 0 ? 1 : -1;
      return {
        transform: [
          { skewX: `${skewAngle.value * skewDirection * 0.5}deg` },
        ],
      };
    }, [index, skewAngle]);

    const fadeStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    return (
      <Animated.View style={[skewStyle, fadeStyle]}>
        <Pressable onPress={onPress} haptic="light" activeScale={0.98}>
          <View
            style={[
              styles.spineContainer,
              {
                width: spineWidth,
                height: spineHeight,
                backgroundColor: spineColor,
                borderRadius: themeName === 'scholar' ? 1 : themeName === 'dreamer' ? 4 : 2,
                ...theme.shadows.sm,
              },
            ]}
          >
            <SpineTexture
              themeName={themeName}
              width={spineWidth}
              height={spineHeight}
            />

            <WearOverlay age={bookAge} themeName={themeName} height={spineHeight} />

            <View
              style={[
                styles.edgeHighlight,
                { opacity: theme.isDark ? 0.15 : 0.25 },
              ]}
            />

            <View
              style={[
                styles.edgeShadow,
                { opacity: theme.isDark ? 0.3 : 0.15 },
              ]}
            />

            <View style={styles.textWrapper}>
              <View style={styles.rotatedTextContainer}>
                <Text
                  variant="caption"
                  numberOfLines={1}
                  style={[
                    styles.spineText,
                    {
                      color: textColor,
                      fontFamily: theme.fonts.body,
                      width: spineHeight - TEXT_PADDING * 2,
                    },
                  ]}
                >
                  {displayTitle}
                </Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.book.id === nextProps.book.id &&
      prevProps.book.cover_url === nextProps.book.cover_url &&
      prevProps.book.title === nextProps.book.title &&
      prevProps.book.page_count === nextProps.book.page_count &&
      prevProps.book.height_cm === nextProps.book.height_cm &&
      prevProps.book.thickness_cm === nextProps.book.thickness_cm &&
      prevProps.userBook?.created_at === nextProps.userBook?.created_at &&
      prevProps.index === nextProps.index
    );
  }
);

const styles = StyleSheet.create({
  spineContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  textWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rotatedTextContainer: {
    transform: [{ rotate: '-90deg' }],
  },
  spineText: {
    fontSize: 9,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  edgeHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#ffffff',
  },
  edgeShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#000000',
  },
});
