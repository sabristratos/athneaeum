import './global.css';

import { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

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
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';

import { ThemeProvider, useTheme } from './src/themes';
import { RootNavigator } from './src/navigation';
import { DatabaseProvider } from './src/database/DatabaseProvider';
import { ToastContainer, PerformanceOverlay } from './src/components';
import { ShareImportHandler } from './src/components/ShareImportHandler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, setupQueryClientListeners } from './src/lib/queryClient';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isDark, theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <ToastContainer />
      <ShareImportHandler />
      <PerformanceOverlay />
    </View>
  );
}

const LOADING_SCREEN_BG = '#1a1a1a';
const LOADING_SCREEN_ACCENT = '#6b7280';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    CrimsonText_400Regular,
    CrimsonText_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
  });

  useEffect(() => {
    const cleanup = setupQueryClientListeners();
    return cleanup;
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: LOADING_SCREEN_BG }}>
          <ActivityIndicator size="large" color={LOADING_SCREEN_ACCENT} />
          <Text style={{ color: '#9ca3af', marginTop: 10 }}>Loading...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

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
