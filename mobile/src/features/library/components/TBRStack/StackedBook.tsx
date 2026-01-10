import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { CoverImage } from '@/components/CoverImage';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useTheme } from '@/themes';
import type { UserBook } from '@/types';
import { BookOpen01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface StackedBookProps {
  item: UserBook;
  index: number;
  totalBooks: number;
  onPress: (item: UserBook) => void;
  onSwipeLeft?: (item: UserBook) => void;
  onSwipeRight?: (item: UserBook) => void;
  isTopBook: boolean;
}

const SPRING_CONFIG = {
  damping: 15,
  stiffness: 200,
  mass: 0.8,
};

const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const STACK_OFFSET = 28;

/**
 * A single book in the TBR stack with 3D perspective and gesture handling.
 * - Tap: Pull-out animation then navigate to detail
 * - Swipe right: Quick-add to "reading" status
 */
export const StackedBook = memo(function StackedBook({
  item,
  index,
  totalBooks,
  onPress,
  onSwipeLeft,
  onSwipeRight,
  isTopBook,
}: StackedBookProps) {
  const { theme, themeName } = useTheme();

  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotateZ = useSharedValue(0);

  // Calculate stack position - books overlap with offset
  const stackOffset = index * STACK_OFFSET;
  const baseScale = 1 - index * 0.03;
  // More variation in rotation for natural "messy pile" look
  const baseRotation = (index % 2 === 0 ? -1 : 1) * (1.5 + index * 1);

  // Swipe progress for feedback animation (-1 to 1, negative for left, positive for right)
  const swipeLeftProgress = useDerivedValue(() => {
    return Math.min(Math.max(-translateX.value / SWIPE_THRESHOLD, 0), 1);
  });

  const swipeRightProgress = useDerivedValue(() => {
    return Math.min(Math.max(translateX.value / SWIPE_THRESHOLD, 0), 1);
  });

  // Haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy') => {
    const styles = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    Haptics.impactAsync(styles[type]);
  };

  // Handle tap - pull out animation then navigate
  const handleTap = () => {
    triggerHaptic('medium');

    // Pull-out animation
    translateX.value = withSpring(SCREEN_WIDTH * 0.15, SPRING_CONFIG);
    scale.value = withSpring(1.05, SPRING_CONFIG);
    rotateZ.value = withSpring(3, SPRING_CONFIG);

    // Navigate after animation
    setTimeout(() => {
      onPress(item);
      // Reset after navigation
      translateX.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(1, { duration: 200 });
      rotateZ.value = withTiming(0, { duration: 200 });
    }, 200);
  };

  // Handle swipe left complete (Start Reading)
  const handleSwipeLeftComplete = () => {
    triggerHaptic('heavy');
    onSwipeLeft?.(item);

    // Animate off screen to the left then reset
    translateX.value = withTiming(-SCREEN_WIDTH, { duration: 250 }, () => {
      translateX.value = 0;
      scale.value = 1;
      rotateZ.value = 0;
    });
  };

  // Handle swipe right complete (Read Later)
  const handleSwipeRightComplete = () => {
    triggerHaptic('heavy');
    onSwipeRight?.(item);

    // Animate off screen to the right then reset
    translateX.value = withTiming(SCREEN_WIDTH, { duration: 250 }, () => {
      translateX.value = 0;
      scale.value = 1;
      rotateZ.value = 0;
    });
  };

  // Pan gesture for swipe actions
  const panGesture = Gesture.Pan()
    .enabled(isTopBook)
    .onUpdate((event) => {
      // Allow both left and right swipe
      translateX.value = event.translationX;
      rotateZ.value = event.translationX * 0.015;
      scale.value = 1 + Math.abs(event.translationX) * 0.0003;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD) {
        // Swiped left - Start Reading
        runOnJS(handleSwipeLeftComplete)();
      } else if (event.translationX > SWIPE_THRESHOLD) {
        // Swiped right - Read Later
        runOnJS(handleSwipeRightComplete)();
      } else {
        // Spring back
        translateX.value = withSpring(0, SPRING_CONFIG);
        rotateZ.value = withSpring(0, SPRING_CONFIG);
        scale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  // Tap gesture
  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  // Combine gestures
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  // Animated style for the book
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { translateY: stackOffset },
      { translateX: translateX.value },
      { scale: scale.value * baseScale },
      { rotateZ: `${rotateZ.value + baseRotation}deg` },
      { rotateX: '8deg' },
    ],
    zIndex: totalBooks - index,
  }));

  // Animated style for the left action zone (Start Reading - swipe left)
  const leftActionZoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeLeftProgress.value,
      [0.2, 0.7],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          swipeLeftProgress.value,
          [0.3, 1],
          [0.8, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Animated style for the right action zone (Read Later - swipe right)
  const rightActionZoneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      swipeRightProgress.value,
      [0.2, 0.7],
      [0, 1],
      Extrapolation.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          swipeRightProgress.value,
          [0.3, 1],
          [0.8, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Shadow increases for deeper books in stack
  const shadowStyle = {
    ...theme.shadows.lg,
    shadowOpacity: (theme.shadows.lg.shadowOpacity || 0.25) + index * 0.03,
  };

  const borderRadius = themeName === 'scholar' ? theme.radii.sm : theme.radii.lg;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <View
          style={[
            styles.bookContainer,
            {
              borderRadius,
              backgroundColor: theme.colors.surface,
              ...shadowStyle,
            },
          ]}
        >
          {/* Cover image */}
          <CoverImage
            uri={item.book.cover_url}
            size="stack"
          />

          {/* Swipe left action zone (Start Reading) - only on top book */}
          {isTopBook && (
            <Animated.View
              style={[
                styles.actionZone,
                {
                  backgroundColor: theme.colors.success,
                  borderRadius,
                },
                leftActionZoneStyle,
              ]}
            >
              <Icon
                icon={BookOpen01Icon}
                size={32}
                color={theme.colors.paper}
              />
              <Text
                variant="caption"
                style={{
                  color: theme.colors.paper,
                  fontFamily: theme.fonts.heading,
                  marginTop: theme.spacing.xs,
                  textAlign: 'center',
                }}
              >
                Start Reading
              </Text>
            </Animated.View>
          )}

          {/* Swipe right action zone (Read Later) - only on top book */}
          {isTopBook && (
            <Animated.View
              style={[
                styles.actionZone,
                {
                  backgroundColor: theme.colors.foregroundMuted,
                  borderRadius,
                },
                rightActionZoneStyle,
              ]}
            >
              <Icon
                icon={ArrowRight01Icon}
                size={32}
                color={theme.colors.paper}
              />
              <Text
                variant="caption"
                style={{
                  color: theme.colors.paper,
                  fontFamily: theme.fonts.heading,
                  marginTop: theme.spacing.xs,
                  textAlign: 'center',
                }}
              >
                Read Later
              </Text>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
  },
  bookContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  actionZone: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
  },
});
