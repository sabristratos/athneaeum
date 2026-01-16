import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Pressable as RNPressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import {
  CheckmarkCircle02Icon,
  SparklesIcon,
  ArrowLeft02Icon,
} from '@hugeicons/core-free-icons';
import { SPRINGS } from '@/animations/constants';
import * as Haptics from 'expo-haptics';

interface CompletionStepProps {
  themeLabel: string;
  themeCopy: { welcome: string; completion: string };
  isCompleting: boolean;
  onComplete: () => void;
  onBack: () => void;
}

export function CompletionStep({
  themeLabel,
  themeCopy,
  isCompleting,
  onComplete,
  onBack,
}: CompletionStepProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(-30);
  const textOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    iconScale.value = withDelay(
      200,
      withSpring(1, SPRINGS.modal, (finished) => {
        if (finished) {
          runOnJS(triggerHaptic)();
        }
      })
    );

    iconRotation.value = withDelay(
      200,
      withSpring(0, SPRINGS.modal)
    );

    textOpacity.value = withDelay(
      500,
      withTiming(1, { duration: 300 })
    );

    buttonsOpacity.value = withDelay(
      800,
      withTiming(1, { duration: 300 })
    );
  }, []);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNPressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back to review your choices"
          accessibilityRole="button"
        >
          <Icon
            icon={ArrowLeft02Icon}
            size={24}
            color={theme.colors.foreground}
          />
        </RNPressable>
      </View>

      <View style={styles.content}>
        <Sparkles />

        <Animated.View style={[styles.iconContainer, iconStyle]}>
          <Icon
            icon={CheckmarkCircle02Icon}
            size={80}
            color={theme.colors.success}
          />
        </Animated.View>

        <Animated.View style={[styles.textContainer, textStyle]}>
          <Text
            variant="h1"
            style={[
              styles.title,
              {
                color: theme.colors.foreground,
                fontFamily: theme.fonts.heading,
              },
            ]}
          >
            {isScholar ? "You're All Set!" : 'All Done!'}
          </Text>

          <Text
            variant="body"
            style={[
              styles.subtitle,
              {
                color: theme.colors.primary,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            {themeCopy.completion}
          </Text>

          <Text
            variant="body"
            style={[
              styles.description,
              {
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Your {themeLabel.toLowerCase()} is ready.{'\n'}
            {isScholar
              ? 'Time to begin your literary journey.'
              : "Let's start reading!"}
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.footer, buttonsStyle]}>
        <Button
          variant="primary"
          size="lg"
          onPress={onComplete}
          disabled={isCompleting}
          fullWidth
        >
          {isCompleting ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text
              style={{
                color: theme.colors.onPrimary,
                fontFamily: theme.fonts.body,
                fontWeight: '600',
                fontSize: 16,
              }}
            >
              {isScholar ? 'Enter Your Library' : "Let's Go!"}
            </Text>
          )}
        </Button>
      </Animated.View>
    </View>
  );
}

function Sparkles() {
  const { theme } = useTheme();

  return (
    <View style={styles.sparklesContainer}>
      {[...Array(6)].map((_, i) => (
        <SparkleItem
          key={i}
          index={i}
          color={theme.colors.primary}
        />
      ))}
    </View>
  );
}

function SparkleItem({ index, color }: { index: number; color: string }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const positions = [
    { top: 20, left: 30 },
    { top: 40, right: 40 },
    { top: 100, left: 50 },
    { top: 80, right: 60 },
    { top: 160, left: 40 },
    { top: 140, right: 50 },
  ];

  useEffect(() => {
    const delay = 300 + index * 150;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(1000, withTiming(0.3, { duration: 500 }))
      )
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withSpring(1, SPRINGS.snappy),
        withDelay(1000, withSpring(0.6, SPRINGS.gentle))
      )
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        positions[index],
        animatedStyle,
      ]}
    >
      <Icon icon={SparklesIcon} size={20} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 48,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  sparkle: {
    position: 'absolute',
  },
  iconContainer: {
    marginBottom: 32,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingVertical: 24,
    width: '100%',
  },
});
