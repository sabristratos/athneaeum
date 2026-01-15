import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';
import { useToastStore } from '@/stores/toastStore';
import type { ThemeName } from '@/types/theme';

export const EDITION_LABELS: Record<ThemeName, string> = {
  scholar: 'Scholar Edition',
  dreamer: 'Dreamer Edition',
  wanderer: 'Wanderer Edition',
  midnight: 'Midnight Edition',
};

export const EDITION_DESCRIPTIONS: Record<ThemeName, string> = {
  scholar: 'Dark Academia',
  dreamer: 'Cozy Cottagecore',
  wanderer: 'Desert Explorer',
  midnight: 'Celestial Library',
};

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
