import React, { useEffect, useRef, useCallback, useState, memo } from 'react';
import { View, useWindowDimensions, findNodeHandle, UIManager, Platform, type LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { InteractiveRating } from '@/components/InteractiveRating';
import { useTheme } from '@/themes';
import { useGyroscopeParallax } from '@/hooks';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import type { Book, UserBook, BookStatus } from '@/types';

interface AnimatedBookHeroProps {
  book: Book;
  userBook?: UserBook;
  onRatingChange?: (rating: number) => void;
  showRating?: boolean;
  showStatus?: boolean;
  /** Scroll position for parallax effects */
  scrollY?: SharedValue<number>;
  /** Height of the stage section for parallax calculations (default: 350) */
  stageHeight?: number;
  /** Enable scroll-based parallax effects (default: false) */
  enableParallax?: boolean;
  /** Enable gyroscope-based 3D tilt effect (default: true) */
  enableGyroscope?: boolean;
  /** Callback when hero section height is measured */
  onHeightMeasured?: (height: number) => void;
}

const STATUS_VARIANT_MAP: Record<BookStatus, 'primary' | 'success' | 'danger' | 'muted'> = {
  reading: 'primary',
  read: 'success',
  dnf: 'danger',
  want_to_read: 'muted',
};

const HERO_WIDTH = HERO_COVER.width;
const HERO_HEIGHT = HERO_COVER.height;

const SHADOW_MAX_OFFSET = 12;
const GYRO_MAX_ANGLE = 8;

export const AnimatedBookHero = memo(function AnimatedBookHero({
  book,
  userBook,
  onRatingChange,
  showRating = true,
  showStatus = true,
  scrollY,
  stageHeight = 350,
  enableParallax = false,
  enableGyroscope = true,
  onHeightMeasured,
}: AnimatedBookHeroProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { width: screenWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const coverRef = useRef<View>(null);

  const [isHeroVisible, setIsHeroVisible] = useState(true);

  useAnimatedReaction(
    () => {
      if (!scrollY || !enableParallax) return true;
      return scrollY.value < stageHeight * 0.8;
    },
    (visible, prevVisible) => {
      if (visible !== prevVisible) {
        runOnJS(setIsHeroVisible)(visible);
      }
    },
    [scrollY, stageHeight, enableParallax]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height } = event.nativeEvent.layout;
      if (onHeightMeasured && height > 0) {
        onHeightMeasured(height);
      }
    },
    [onHeightMeasured]
  );

  const { animatedStyle: gyroStyle, tiltX, tiltY } = useGyroscopeParallax({
    enabled: enableGyroscope && Platform.OS !== 'web',
    maxAngle: GYRO_MAX_ANGLE,
    damping: 20,
    stiffness: 120,
  });

  const isTransitioning = useSharedElementStore((state) => state.isTransitioning);
  const direction = useSharedElementStore((state) => state.direction);
  const transitioningUserBookId = useSharedElementStore((state) => state.userBookId);
  const startBackwardTransition = useSharedElementStore((state) => state.startBackwardTransition);

  const contentOpacity = useSharedValue(0);

  const isThisHeroTransitioning = isTransitioning && transitioningUserBookId === userBook?.id;

  useEffect(() => {
    if (!isTransitioning || direction === null) {
      contentOpacity.value = withDelay(
        100,
        withTiming(1, {
          duration: 300,
          easing: Easing.out(Easing.ease),
        })
      );
    }
  }, [isTransitioning, direction]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isTransitioning && direction === 'backward') {
        return;
      }

      if (!userBook || !book.cover_url) {
        return;
      }

      e.preventDefault();

      if (coverRef.current) {
        const handle = findNodeHandle(coverRef.current);
        if (handle) {
          UIManager.measureInWindow(handle, (x, y, width, height) => {
            startBackwardTransition(
              { x, y, width, height },
              book.cover_url || '',
              userBook.id
            );

            setTimeout(() => {
              navigation.dispatch(e.data.action);
            }, 50);
          });
        } else {
          navigation.dispatch(e.data.action);
        }
      } else {
        navigation.dispatch(e.data.action);
      }
    });

    return unsubscribe;
  }, [navigation, userBook, book.cover_url, isTransitioning, direction, startBackwardTransition]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.lg;

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const coverParallaxStyle = useAnimatedStyle(() => {
    if (!enableParallax || !scrollY) {
      return {};
    }

    const translateY = interpolate(
      scrollY.value,
      [0, stageHeight],
      [0, stageHeight * 0.5],
      Extrapolation.CLAMP
    );

    const scale = interpolate(
      scrollY.value,
      [0, stageHeight],
      [1, 0.8],
      Extrapolation.CLAMP
    );

    const opacity = interpolate(
      scrollY.value,
      [stageHeight * 0.3, stageHeight * 1.2],
      [1, 0],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ translateY }, { scale }],
      opacity,
    };
  }, [enableParallax, scrollY, stageHeight]);

  const dynamicShadowStyle = useAnimatedStyle(() => {
    if (!enableGyroscope || Platform.OS === 'web') {
      return {};
    }

    const shadowOffsetX = interpolate(
      tiltY.value,
      [-GYRO_MAX_ANGLE, GYRO_MAX_ANGLE],
      [SHADOW_MAX_OFFSET, -SHADOW_MAX_OFFSET],
      Extrapolation.CLAMP
    );

    const shadowOffsetY = interpolate(
      tiltX.value,
      [-GYRO_MAX_ANGLE, GYRO_MAX_ANGLE],
      [-SHADOW_MAX_OFFSET, SHADOW_MAX_OFFSET],
      Extrapolation.CLAMP
    );

    return {
      shadowOffset: {
        width: shadowOffsetX,
        height: shadowOffsetY + 8,
      },
    };
  }, [enableGyroscope, tiltX, tiltY]);

  const textParallaxStyle = useAnimatedStyle(() => {
    if (!enableParallax || !scrollY) {
      return {};
    }

    const opacity = interpolate(
      scrollY.value,
      [stageHeight * 0.2, stageHeight * 0.9],
      [1, 0],
      Extrapolation.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      [0, stageHeight],
      [0, stageHeight * 0.3],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  }, [enableParallax, scrollY, stageHeight]);

  const renderCover = () => {
    const uri = book.cover_url;

    if (!uri) {
      return (
        <View
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            variant="caption"
            muted
            style={{ textAlign: 'center', paddingHorizontal: 4 }}
          >
            {book.title || 'No Cover'}
          </Text>
        </View>
      );
    }

    return (
      <Image
        source={{ uri }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius,
        }}
        contentFit="cover"
        transition={200}
      />
    );
  };

  const baseShadowStyle = isScholar
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
      }
    : {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
      };

  return (
    <View
      style={{ alignItems: 'center', gap: theme.spacing.lg }}
      onLayout={handleLayout}
    >
            <Animated.View
        style={[
          { alignItems: 'center' },
          enableParallax && coverParallaxStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: HERO_WIDTH,
              height: HERO_HEIGHT,
              borderRadius,
              backgroundColor: theme.colors.canvas,
              ...baseShadowStyle,
            },
            enableGyroscope && gyroStyle,
            enableGyroscope && dynamicShadowStyle,
          ]}
        />

        <Animated.View
          ref={coverRef}
          collapsable={false}
          style={[
            {
              width: HERO_WIDTH,
              height: HERO_HEIGHT,
              borderRadius,
              overflow: 'hidden',
              backgroundColor: theme.colors.surfaceAlt,
              opacity: isThisHeroTransitioning ? 0 : 1,
              ...(isScholar && {
                borderWidth: 1,
                borderColor: theme.colors.border,
              }),
            },
            enableGyroscope && gyroStyle,
          ]}
        >
          {renderCover()}
        </Animated.View>
      </Animated.View>

            <Animated.View
        style={[
          {
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
          },
          animatedContentStyle,
          enableParallax && textParallaxStyle,
        ]}
      >
        <Text
          variant="h1"
          style={{
            textAlign: 'center',
            lineHeight: isScholar ? 36 : 32,
          }}
        >
          {book.title}
        </Text>

        <Text variant="body" muted style={{ textAlign: 'center' }}>
          {book.author}
        </Text>

                <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginTop: theme.spacing.xs,
          }}
        >
          {book.page_count != null && book.page_count > 0 && (
            <Text variant="caption" muted>
              {book.page_count} pages
            </Text>
          )}

          {book.published_date && (
            <>
              {book.page_count != null && book.page_count > 0 && (
                <Text variant="caption" muted>
                  ·
                </Text>
              )}
              <Text variant="caption" muted>
                {new Date(book.published_date).getFullYear()}
              </Text>
            </>
          )}
        </View>

                {showRating && userBook && onRatingChange && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <InteractiveRating
              value={userBook.rating ?? 0}
              onChange={onRatingChange}
              size="lg"
              showValue={false}
            />
          </View>
        )}

                {showStatus && userBook && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Chip
              label={userBook.status_label}
              variant={STATUS_VARIANT_MAP[userBook.status]}
              selected
              size="md"
            />
          </View>
        )}
      </Animated.View>
    </View>
  );
});
