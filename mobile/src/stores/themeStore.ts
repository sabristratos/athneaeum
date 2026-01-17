import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';
import { useToastStore } from '@/stores/toastStore';
import type { ThemeName, Theme } from '@/types/theme';
import { themes } from '@/themes/themes';

export interface ThemeMetadata {
  name: ThemeName;
  label: string;
  editionLabel: string;
  description: string;
  fonts: string;
  corners: string;
  ratingLabel: string;
  ratingIcon: 'star' | 'heart' | 'compass' | 'moon';
  theme: Theme;
}

export const THEME_CONFIG: Record<ThemeName, ThemeMetadata> = {
  scholar: {
    name: 'scholar',
    label: 'Scholar',
    editionLabel: 'Scholar Edition',
    description: 'Dark Academia',
    fonts: 'Classic Serif',
    corners: 'Sharp',
    ratingLabel: 'Stars',
    ratingIcon: 'star',
    theme: themes.scholar,
  },
  dreamer: {
    name: 'dreamer',
    label: 'Dreamer',
    editionLabel: 'Dreamer Edition',
    description: 'Cozy Cottagecore',
    fonts: 'Friendly Sans',
    corners: 'Soft',
    ratingLabel: 'Hearts',
    ratingIcon: 'heart',
    theme: themes.dreamer,
  },
  wanderer: {
    name: 'wanderer',
    label: 'Wanderer',
    editionLabel: 'Wanderer Edition',
    description: 'Desert Explorer',
    fonts: 'Warm Serif',
    corners: 'Medium',
    ratingLabel: 'Compass',
    ratingIcon: 'compass',
    theme: themes.wanderer,
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    editionLabel: 'Midnight Edition',
    description: 'Celestial Library',
    fonts: 'Elegant Serif',
    corners: 'Medium',
    ratingLabel: 'Moons',
    ratingIcon: 'moon',
    theme: themes.midnight,
  },
  dynamic: {
    name: 'dynamic',
    label: 'Horizon',
    editionLabel: 'Horizon Edition',
    description: 'Living Sky',
    fonts: 'Modern Sans',
    corners: 'Smooth',
    ratingLabel: 'Stars',
    ratingIcon: 'star',
    theme: themes.dynamic,
  },
};

export const SELECTABLE_THEMES: ThemeMetadata[] = Object.values(THEME_CONFIG);

export const EDITION_LABELS: Record<ThemeName, string> = Object.fromEntries(
  Object.entries(THEME_CONFIG).map(([key, value]) => [key, value.editionLabel])
) as Record<ThemeName, string>;

export const EDITION_DESCRIPTIONS: Record<ThemeName, string> = Object.fromEntries(
  Object.entries(THEME_CONFIG).map(([key, value]) => [key, value.description])
) as Record<ThemeName, string>;

interface ThemeStore {
  themeName: ThemeName;
  isHydrated: boolean;
  setTheme: (name: ThemeName) => void;
  setThemeSilent: (name: ThemeName) => void;
  toggleTheme: () => void;
  setHydrated: (hydrated: boolean) => void;
}

const useThemeStoreBase = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeName: 'scholar',
      isHydrated: false,
      setTheme: (name: ThemeName) => {
        set({ themeName: name });
        useToastStore.getState().addToast({
          message: `Switched to ${EDITION_LABELS[name]}`,
          variant: 'info',
        });
      },
      setThemeSilent: (name: ThemeName) => {
        set({ themeName: name });
      },
      toggleTheme: () => {
        const newTheme = get().themeName === 'scholar' ? 'dreamer' : 'scholar';
        set({ themeName: newTheme });
        useToastStore.getState().addToast({
          message: `Switched to ${EDITION_LABELS[newTheme]}`,
          variant: 'info',
        });
      },
      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'athenaeum-theme',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({ themeName: state.themeName }),
    }
  )
);

export const useThemeStore = useThemeStoreBase;

export const useThemeActions = () =>
  useThemeStoreBase(
    useShallow((state) => ({
      setTheme: state.setTheme,
      setThemeSilent: state.setThemeSilent,
      toggleTheme: state.toggleTheme,
    }))
  );

export const useThemeName = () => useThemeStoreBase((state) => state.themeName);

export const useThemeHydrated = () => useThemeStoreBase((state) => state.isHydrated);
