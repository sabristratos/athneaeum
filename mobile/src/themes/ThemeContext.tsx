import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { vars } from 'nativewind';
import { useThemeStore } from '@/stores/themeStore';
import { getTheme, getThemeCSSVars } from '@/themes/utils';
import { getDynamicThemeState, buildDynamicTheme, DEBUG_FAST_CYCLE, type DynamicThemeState } from '@/themes/themes/dynamic';
import { DynamicSky } from '@/components/DynamicSky';
import type { ThemeContextValue, ThemeName, Theme } from '@/types/theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface DynamicThemeContextValue {
  phase: DynamicThemeState['phase'];
  progress: number;
  celestialProgress: number;
  starOpacity: number;
}

const DynamicThemeContext = createContext<DynamicThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const { themeName, setTheme, toggleTheme } = useThemeStore();

  const activeThemeName = defaultTheme ?? themeName;

  const [dynamicState, setDynamicState] = useState<DynamicThemeState | null>(null);

  useEffect(() => {
    if (activeThemeName !== 'dynamic') {
      setDynamicState(null);
      return;
    }

    const updateDynamicTheme = () => {
      setDynamicState(getDynamicThemeState(new Date()));
    };

    updateDynamicTheme();

    const intervalMs = DEBUG_FAST_CYCLE ? 100 : 60000;
    const interval = setInterval(updateDynamicTheme, intervalMs);

    return () => clearInterval(interval);
  }, [activeThemeName]);

  const theme: Theme = useMemo(() => {
    if (activeThemeName === 'dynamic' && dynamicState) {
      return buildDynamicTheme(dynamicState);
    }
    return getTheme(activeThemeName === 'dynamic' ? 'midnight' : activeThemeName);
  }, [activeThemeName, dynamicState]);

  const cssVars = useMemo(() => getThemeCSSVars(theme), [theme]);

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      themeName: activeThemeName,
      toggleTheme,
      setTheme,
      isDark: theme.isDark,
    }),
    [theme, activeThemeName, toggleTheme, setTheme]
  );

  const dynamicContextValue = useMemo<DynamicThemeContextValue | null>(() => {
    if (activeThemeName !== 'dynamic' || !dynamicState) {
      return null;
    }
    return {
      phase: dynamicState.phase,
      progress: dynamicState.progress,
      celestialProgress: dynamicState.celestialProgress,
      starOpacity: dynamicState.starOpacity,
    };
  }, [activeThemeName, dynamicState]);

  return (
    <ThemeContext.Provider value={value}>
      <DynamicThemeContext.Provider value={dynamicContextValue}>
        <View style={[styles.container, vars(cssVars), { backgroundColor: theme.colors.canvas }]}>
          {activeThemeName === 'dynamic' && dynamicState && (
            <DynamicSky
              progress={dynamicState.celestialProgress}
              phase={dynamicState.phase}
              isDark={theme.isDark}
              starOpacity={dynamicState.starOpacity}
            />
          )}
          <View style={styles.content}>{children}</View>
        </View>
      </DynamicThemeContext.Provider>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useDynamicTheme(): DynamicThemeContextValue | null {
  return useContext(DynamicThemeContext);
}

export function useThemeColors() {
  const { theme } = useTheme();
  return theme.colors;
}

export function useThemeRadii() {
  const { theme } = useTheme();
  return theme.radii;
}

export function useThemeFonts() {
  const { theme } = useTheme();
  return theme.fonts;
}
