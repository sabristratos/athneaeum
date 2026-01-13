import React, { useEffect, useRef, useCallback, useState, memo } from 'react';
import { View, useWindowDimensions, findNodeHandle, UIManager, type LayoutChangeEvent } from 'react-native';
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
import { TIMING } from '@/animations/constants';
import { useNavigation } from '@react-navigation/native';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import { BookHeroContent, type BookHeroContentProps } from './BookHeroContent';

export interface AnimatedBookHeroProps extends BookHeroContentProps {
  scrollY?: SharedValue<number>;
  stageHeight?: number;
  enableParallax?: boolean;
  onHeightMeasured?: (height: number) => void;
}

const HERO_WIDTH = HERO_COVER.width;
const HERO_HEIGHT = HERO_COVER.height;

export const AnimatedBookHero = memo(function AnimatedBookHero({
  book,
  userBook,
  onRatingChange,
  showRating = true,
  showStatus = true,
  scrollY,
  stageHeight = 350,
  enableParallax = false,
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
          ...TIMING.slow,
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
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: HERO_WIDTH,
            height: HERO_HEIGHT,
            borderRadius,
            backgroundColor: theme.colors.canvas,
            ...baseShadowStyle,
          }}
        />

        <View
          ref={coverRef}
          collapsable={false}
          style={{
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
          }}
        >
          {renderCover()}
        </View>
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
        <BookHeroContent
          book={book}
          userBook={userBook}
          onRatingChange={onRatingChange}
          showRating={showRating}
          showStatus={showStatus}
        />
      </Animated.View>
    </View>
  );
});
