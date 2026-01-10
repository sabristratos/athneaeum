import React, { createContext, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { vars } from 'nativewind';
import { useThemeStore } from '@/stores/themeStore';
import { getTheme, getThemeCSSVars } from '@/themes/utils';
import type { ThemeContextValue, ThemeName } from '@/types/theme';

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ThemeName;
}

export function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const { themeName, setTheme, toggleTheme } = useThemeStore();

  const activeThemeName = defaultTheme ?? themeName;
  const theme = useMemo(() => getTheme(activeThemeName), [activeThemeName]);
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

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, vars(cssVars)]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
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
