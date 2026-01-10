import React, { memo, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  type SharedValue,
} from 'react-native-reanimated';

let getPalette: ((uri: string) => Promise<{ dominant?: string; vibrant?: string; muted?: string }>) | null = null;
try {
  getPalette = require('@somesoap/react-native-image-palette').getPalette;
} catch {
}

import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import { useSpineColorStore } from '@/stores/spineColorStore';
import { getContrastingTextColor, parseToHex } from '@/utils/colorUtils';
import { SpineTexture } from './SpineTexture';
import { WearOverlay, getBookAge } from './WearOverlay';
import type { Book, UserBook } from '@/types';

const TEXT_PADDING = 6;
const MAX_TITLE_LENGTH = 35;

const SPINE_HEIGHT_MIN = 140;
const SPINE_HEIGHT_MAX = 160;

const SPINE_WIDTHS = {
  thin: 16,
  narrow: 20,
  medium: 26,
  wide: 32,
  thick: 38,
};

function getSpineWidth(pageCount: number | null | undefined): number {
  if (!pageCount || pageCount < 100) return SPINE_WIDTHS.thin;
  if (pageCount < 300) return SPINE_WIDTHS.narrow;
  if (pageCount < 600) return SPINE_WIDTHS.medium;
  if (pageCount < 1000) return SPINE_WIDTHS.wide;
  return SPINE_WIDTHS.thick;
}

/**
 * Seeded random number generator for consistent randomness per book.
 */
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(Math.sin(hash));
}

/**
 * Calculate spine height based on page count with deterministic randomness.
 * Height is ~60% determined by randomness, ~40% by page count.
 */
function getSpineHeight(pageCount: number | null | undefined, bookId: string): number {
  const heightRange = SPINE_HEIGHT_MAX - SPINE_HEIGHT_MIN;

  const pages = pageCount || 200;
  const normalizedPages = Math.min(Math.max(pages, 50), 1200);
  const pageRatio = (normalizedPages - 50) / (1200 - 50);

  const randomFactor = seededRandom(bookId);

  const blendedRatio = (pageRatio * 0.4) + (randomFactor * 0.6);

  return Math.round(SPINE_HEIGHT_MIN + (blendedRatio * heightRange));
}

interface BookSpineProps {
  book: Book;
  userBook?: UserBook;
  onPress?: () => void;
  index?: number;
  tiltAngle?: SharedValue<number>;
  skewAngle?: SharedValue<number>;
  enablePhysics?: boolean;
}

/**
 * A procedurally generated book spine with color extraction,
 * rotated title, texture overlay, and wear effects.
 */
export const BookSpine = memo(function BookSpine({
  book,
  userBook,
  onPress,
  index = 0,
  tiltAngle,
  skewAngle,
  enablePhysics = true,
}: BookSpineProps) {
  const { theme, themeName } = useTheme();

  const cachedColor = useSpineColorStore((s) => s.getColor(book.id.toString()));
  const setColor = useSpineColorStore((s) => s.setColor);

  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.min(index * 20, 400);
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, [index, opacity]);

  useEffect(() => {
    if (!cachedColor && book.cover_url) {
      extractColorFromCover(book.cover_url).then((color) => {
        if (color) {
          setColor(book.id.toString(), color);
        }
      });
    }
  }, [book.cover_url, book.id, cachedColor, setColor]);

  const spineColor = cachedColor || theme.colors.surfaceHover;

  const spineWidth = useMemo(() => {
    return getSpineWidth(book.page_count);
  }, [book.page_count]);

  const spineHeight = useMemo(() => {
    return getSpineHeight(book.page_count, book.id.toString());
  }, [book.page_count, book.id]);

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

  const physicsStyle = useAnimatedStyle(() => {
    if (!enablePhysics || !tiltAngle || !skewAngle) {
      return {};
    }

    const skewDirection = index % 2 === 0 ? 1 : -1;

    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${tiltAngle.value}deg` },
        { skewX: `${skewAngle.value * skewDirection}deg` },
      ],
    };
  }, [enablePhysics, index, tiltAngle, skewAngle]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[physicsStyle, fadeStyle]}>
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
});

/**
 * Extract dominant color from a cover image URL.
 */
async function extractColorFromCover(coverUrl: string): Promise<string | null> {
  if (!getPalette) {
    return null;
  }

  try {
    const result = await getPalette(coverUrl);
    const color = (result as any).dominantAndroid || result.vibrant || result.muted;
    return color ? parseToHex(color) : null;
  } catch (error) {
    console.warn('Failed to extract color from cover:', error);
    return null;
  }
}

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
