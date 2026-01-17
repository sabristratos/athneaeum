import React, { useMemo } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useIsAuthenticated, useAuthHydrated, useHasCompletedOnboarding } from '@/stores/authStore';
import { useThemeHydrated } from '@/stores/themeStore';
import { useTheme } from '@/themes';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { MainNavigator } from '@/navigation/MainNavigator';
import { OnboardingScreen } from '@/features/onboarding';
import { GoalCelebrationOverlay } from '@/components/organisms';

const prefix = Linking.createURL('/');

export function RootNavigator() {
  const isAuthenticated = useIsAuthenticated();
  const hasCompletedOnboarding = useHasCompletedOnboarding();
  const authHydrated = useAuthHydrated();
  const themeHydrated = useThemeHydrated();
  const { theme, themeName } = useTheme();

  const isDynamicTheme = themeName === 'dynamic';

  const linking = useMemo(
    () => ({
      prefixes: [prefix, 'athenaeum://'],
      config: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
    }),
    []
  );

  // Memoize navigation theme to prevent recreation on every render
  // Use transparent background for dynamic theme to show DynamicSky
  const navigationTheme = useMemo(
    () => ({
      ...(theme.isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(theme.isDark ? DarkTheme : DefaultTheme).colors,
        background: isDynamicTheme ? 'transparent' : theme.colors.canvas,
        card: theme.colors.surface,
        text: theme.colors.foreground,
        border: theme.colors.border,
        primary: theme.colors.primary,
        notification: theme.colors.primary,
      },
    }),
    [
      theme.isDark,
      theme.colors.canvas,
      theme.colors.surface,
      theme.colors.foreground,
      theme.colors.border,
      theme.colors.primary,
      isDynamicTheme,
    ]
  );

  if (!authHydrated || !themeHydrated) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.canvas,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.foreground, marginTop: 10 }}>
          Loading...
        </Text>
      </View>
    );
  }

  const renderContent = () => {
    if (!isAuthenticated) {
      return <AuthNavigator />;
    }

    if (!hasCompletedOnboarding) {
      return <OnboardingScreen />;
    }

    return <MainNavigator />;
  };

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      {renderContent()}
      <GoalCelebrationOverlay />
    </NavigationContainer>
  );
}
