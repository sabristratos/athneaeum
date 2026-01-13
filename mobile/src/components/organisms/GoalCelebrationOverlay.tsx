import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { CheckmarkCircle02Icon, Target02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components';
import { useTheme } from '@/themes';
import { useCelebrationStore } from '@/stores/celebrationStore';
import { SPRINGS } from '@/animations/constants';

const GOAL_TYPE_CONFIG: Record<string, { label: string; unit: string }> = {
  books: { label: 'Books', unit: 'books' },
  pages: { label: 'Pages', unit: 'pages' },
  minutes: { label: 'Minutes', unit: 'minutes' },
  streak: { label: 'Streak', unit: 'days' },
};

const GOAL_PERIOD_CONFIG: Record<string, { label: string }> = {
  yearly: { label: 'Yearly' },
  monthly: { label: 'Monthly' },
  weekly: { label: 'Weekly' },
  daily: { label: 'Daily' },
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPieceProps {
  delay: number;
  startX: number;
  color: string;
}

function ConfettiPiece({ delay, startX, color }: ConfettiPieceProps) {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, { duration: 2500 })
    );
    translateX.value = withDelay(
      delay,
      withTiming(startX + (Math.random() - 0.5) * 100, { duration: 2500 })
    );
    rotation.value = withDelay(
      delay,
      withTiming(360 * (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random()), {
        duration: 2500,
      })
    );
    opacity.value = withDelay(2000, withTiming(0, { duration: 500 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

export function GoalCelebrationOverlay() {
  const { theme, themeName } = useTheme();
  const currentCelebration = useCelebrationStore((state) => state.currentCelebration);
  const dismissCelebration = useCelebrationStore((state) => state.dismissCelebration);

  const scale = useSharedValue(0.5);
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (currentCelebration) {
      triggerHaptic('success');

      scale.value = withSequence(
        withSpring(1.1, SPRINGS.bouncy),
        withSpring(1, SPRINGS.gentle)
      );

      checkScale.value = withDelay(
        300,
        withSequence(
          withSpring(1.3, SPRINGS.bouncy),
          withSpring(1, SPRINGS.gentle)
        )
      );

      const timer = setTimeout(() => {
        dismissCelebration();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [currentCelebration]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  if (!currentCelebration) return null;

  const confettiColors = [
    theme.colors.primary,
    theme.colors.success,
    theme.colors.warning,
    theme.colors.accent,
    '#FFD700',
    '#FF69B4',
  ];

  const confettiPieces = Array.from({ length: 30 }, (_, i) => ({
    key: `confetti-${i}`,
    delay: Math.random() * 500,
    startX: Math.random() * SCREEN_WIDTH,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
    >
      <Pressable style={styles.touchArea} onPress={dismissCelebration}>
        {confettiPieces.map((piece) => (
          <ConfettiPiece
            key={piece.key}
            delay={piece.delay}
            startX={piece.startX}
            color={piece.color}
          />
        ))}

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.radii.xl,
              borderColor: theme.colors.success,
              borderWidth: 2,
            },
            cardStyle,
          ]}
        >
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.successSubtle,
                borderRadius: 40,
              },
              checkStyle,
            ]}
          >
            <Icon
              icon={CheckmarkCircle02Icon}
              size={48}
              color={theme.colors.success}
            />
          </Animated.View>

          <Text
            variant="h2"
            style={{
              color: theme.colors.success,
              textAlign: 'center',
              marginTop: theme.spacing.md,
            }}
          >
            Goal Achieved!
          </Text>

          <Text
            variant="body"
            style={{
              color: theme.colors.foreground,
              textAlign: 'center',
              marginTop: theme.spacing.sm,
            }}
          >
            {GOAL_PERIOD_CONFIG[currentCelebration.goalPeriod].label}{' '}
            {GOAL_TYPE_CONFIG[currentCelebration.goalType].label} Goal
          </Text>

          <View
            style={[
              styles.targetBadge,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderRadius: theme.radii.full,
              },
            ]}
          >
            <Icon
              icon={Target02Icon}
              size={16}
              color={theme.colors.primary}
            />
            <Text
              variant="body"
              style={{
                color: theme.colors.primary,
                fontWeight: '700',
                marginLeft: 6,
              }}
            >
              {currentCelebration.target} reached!
            </Text>
          </View>

          <Text
            variant="caption"
            muted
            style={{
              textAlign: 'center',
              marginTop: theme.spacing.lg,
              fontStyle: themeName === 'scholar' ? 'italic' : 'normal',
            }}
          >
            Tap anywhere to dismiss
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 32,
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

