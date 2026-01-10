import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';
import type { ThemeName } from '@/types/theme';

interface ThemeStore {
  themeName: ThemeName;
  isHydrated: boolean;
  setTheme: (name: ThemeName) => void;
  toggleTheme: () => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      themeName: 'scholar',
      isHydrated: false,
      setTheme: (name: ThemeName) => set({ themeName: name }),
      toggleTheme: () =>
        set((state) => ({
          themeName: state.themeName === 'scholar' ? 'dreamer' : 'scholar',
        })),
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
