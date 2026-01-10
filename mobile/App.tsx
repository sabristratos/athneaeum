import './global.css';

console.log('[App] Module loading started');

import { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

console.log('[App] Core imports loaded');

import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import {
  CrimsonText_400Regular,
  CrimsonText_600SemiBold,
} from '@expo-google-fonts/crimson-text';
import {
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

console.log('[App] Fonts imports loaded');

import { ThemeProvider, useTheme } from './src/themes';
console.log('[App] ThemeProvider imported');

import { RootNavigator } from './src/navigation';
console.log('[App] RootNavigator imported');

import { DatabaseProvider } from './src/database/DatabaseProvider';
console.log('[App] DatabaseProvider imported');

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupQueryClientListeners } from './src/lib/queryClient';
console.log('[App] QueryClientProvider imported');

SplashScreen.preventAutoHideAsync();
console.log('[App] SplashScreen.preventAutoHideAsync called');

function AppContent() {
  console.log('[AppContent] Rendering');
  const { isDark, theme } = useTheme();
  console.log('[AppContent] Theme loaded:', theme.name);

  useEffect(() => {
    console.log('[AppContent] Mounted');
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
    </View>
  );
}

export default function App() {
  console.log('[App] App component rendering');

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    CrimsonText_400Regular,
    CrimsonText_600SemiBold,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  console.log('[App] Fonts loaded:', fontsLoaded);

  useEffect(() => {
    console.log('[App] App mounted, fontsLoaded:', fontsLoaded);
  }, [fontsLoaded]);

  useEffect(() => {
    const cleanup = setupQueryClientListeners();
    return cleanup;
  }, []);

  const onLayoutRootView = useCallback(async () => {
    console.log('[App] onLayoutRootView called, fontsLoaded:', fontsLoaded);
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
      console.log('[App] Splash screen hidden');
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    console.log('[App] Showing loading screen (fonts not loaded)');
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#12100e' }}>
          <ActivityIndicator size="large" color="#8b2e2e" />
          <Text style={{ color: '#fff', marginTop: 10 }}>Loading fonts...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  console.log('[App] Rendering main app with providers');
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <DatabaseProvider>
              <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
                <AppContent />
              </View>
            </DatabaseProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
