import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { useOnboardingController } from './hooks/useOnboardingController';
import { WelcomeStep } from './components/WelcomeStep';
import { ThemeStep } from './components/ThemeStep';
import { PreferencesStep } from './components/PreferencesStep';
import { GoalStep } from './components/GoalStep';
import { CompletionStep } from './components/CompletionStep';
import { OnboardingProgress } from './components/OnboardingProgress';

export function OnboardingScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const controller = useOnboardingController();

  const renderStep = () => {
    switch (controller.currentStep) {
      case 1:
        return (
          <WelcomeStep
            userName={controller.userName}
            themeCopy={controller.themeCopy}
            onNext={controller.nextStep}
          />
        );
      case 2:
        return (
          <ThemeStep
            selectedTheme={controller.selectedTheme}
            onSelectTheme={controller.selectTheme}
            onNext={controller.nextStep}
            onBack={controller.prevStep}
          />
        );
      case 3:
        return (
          <PreferencesStep
            selectedFormats={controller.selectedFormats}
            selectedGenres={controller.selectedGenres}
            popularGenres={controller.popularGenres}
            onToggleFormat={controller.toggleFormat}
            onToggleGenre={controller.toggleGenre}
            onNext={controller.nextStep}
            onBack={controller.prevStep}
          />
        );
      case 4:
        return (
          <GoalStep
            yearlyGoal={controller.yearlyGoal}
            onSetGoal={controller.setYearlyGoal}
            onNext={controller.nextStep}
            onBack={controller.prevStep}
          />
        );
      case 5:
        return (
          <CompletionStep
            themeLabel={controller.themeLabel}
            themeCopy={controller.themeCopy}
            isCompleting={controller.isCompleting}
            onComplete={controller.completeOnboarding}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.canvas,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {controller.currentStep < 5 && (
        <OnboardingProgress
          currentStep={controller.currentStep}
          totalSteps={4}
        />
      )}

      <Animated.View
        key={controller.currentStep}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={styles.stepContainer}
      >
        {renderStep()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
});
