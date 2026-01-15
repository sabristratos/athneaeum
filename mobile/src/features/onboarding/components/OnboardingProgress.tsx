import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index + 1 === currentStep;
        const isCompleted = index + 1 < currentStep;

        return (
          <ProgressDot
            key={index}
            isActive={isActive}
            isCompleted={isCompleted}
            activeColor={theme.colors.primary}
            completedColor={theme.colors.primary}
            inactiveColor={theme.colors.border}
          />
        );
      })}
    </View>
  );
}

interface ProgressDotProps {
  isActive: boolean;
  isCompleted: boolean;
  activeColor: string;
  completedColor: string;
  inactiveColor: string;
}

function ProgressDot({
  isActive,
  isCompleted,
  activeColor,
  completedColor,
  inactiveColor,
}: ProgressDotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(isActive ? 24 : 8, SPRINGS.snappy),
    backgroundColor: isActive || isCompleted ? activeColor : inactiveColor,
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
