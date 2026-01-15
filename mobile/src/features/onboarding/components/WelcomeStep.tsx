import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import { Book01Icon, Book02Icon, BookOpen01Icon } from '@hugeicons/core-free-icons';
import { useEffect } from 'react';

interface WelcomeStepProps {
  userName: string;
  themeCopy: { welcome: string; completion: string };
  onNext: () => void;
}

export function WelcomeStep({ userName, themeCopy, onNext }: WelcomeStepProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <AnimatedBooks theme={theme} />

        <View style={styles.textContainer}>
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
            Welcome, {userName}!
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
            {themeCopy.welcome}
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
            Your personal reading sanctuary awaits.{'\n'}
            Track your books, capture quotes, and{'\n'}
            discover your reading patterns.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button variant="primary" size="lg" onPress={onNext} fullWidth>
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontFamily: theme.fonts.body,
              fontWeight: '600',
              fontSize: 16,
            }}
          >
            {isScholar ? "Let's make it yours" : 'Get started'}
          </Text>
        </Button>
      </View>
    </View>
  );
}

function AnimatedBooks({ theme }: { theme: any }) {
  const book1Y = useSharedValue(0);
  const book2Y = useSharedValue(0);
  const book3Y = useSharedValue(0);

  useEffect(() => {
    book1Y.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      true
    );

    book2Y.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 2200 }),
          withTiming(0, { duration: 2200 })
        ),
        -1,
        true
      )
    );

    book3Y.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-10, { duration: 1800 }),
          withTiming(0, { duration: 1800 })
        ),
        -1,
        true
      )
    );
  }, []);

  const book1Style = useAnimatedStyle(() => ({
    transform: [{ translateY: book1Y.value }],
  }));

  const book2Style = useAnimatedStyle(() => ({
    transform: [{ translateY: book2Y.value }],
  }));

  const book3Style = useAnimatedStyle(() => ({
    transform: [{ translateY: book3Y.value }],
  }));

  return (
    <View style={styles.booksContainer}>
      <Animated.View style={[styles.bookIcon, book1Style]}>
        <Icon icon={Book01Icon} size={48} color={theme.colors.primary} />
      </Animated.View>
      <Animated.View style={[styles.bookIcon, styles.bookIconCenter, book2Style]}>
        <Icon icon={BookOpen01Icon} size={64} color={theme.colors.primary} />
      </Animated.View>
      <Animated.View style={[styles.bookIcon, book3Style]}>
        <Icon icon={Book02Icon} size={48} color={theme.colors.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  booksContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 48,
    gap: 16,
  },
  bookIcon: {
    opacity: 0.9,
  },
  bookIconCenter: {
    marginBottom: 8,
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
    marginBottom: 24,
    fontStyle: 'italic',
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
