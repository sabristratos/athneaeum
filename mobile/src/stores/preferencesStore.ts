import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';

export type BookFormat = 'ebook' | 'physical' | 'audiobook';

export type ProgressInputMode = 'absolute' | 'increment' | 'percentage';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY' | 'INR' | 'BRL';

export const CURRENCY_OPTIONS: { code: Currency; symbol: string; label: string }[] = [
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar (C$)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (A$)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (¥)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian Real (R$)' },
];

export function getCurrencySymbol(code: Currency): string {
  return CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? '$';
}

export interface UserPreferences {
  defaultFormat: BookFormat;
  defaultPrivate: boolean;
  spoilerShield: boolean;
  showReadingStreak: boolean;
  hapticsEnabled: boolean;
  currency: Currency;
  progressInputMode: ProgressInputMode;
}

interface PreferencesStore {
  preferences: UserPreferences;
  isHydrated: boolean;
  avatarUri: string | null;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setAvatarUri: (uri: string | null) => void;
  setHydrated: (hydrated: boolean) => void;
  resetPreferences: () => void;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultFormat: 'physical',
  defaultPrivate: false,
  spoilerShield: false,
  showReadingStreak: true,
  hapticsEnabled: true,
  currency: 'USD',
  progressInputMode: 'increment',
};

const usePreferencesStoreBase = create<PreferencesStore>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      isHydrated: false,
      avatarUri: null,

      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),

      setPreferences: (prefs) =>
        set((state) => ({
          preferences: { ...state.preferences, ...prefs },
        })),

      setAvatarUri: (uri) => set({ avatarUri: uri }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),

      resetPreferences: () =>
        set({
          preferences: DEFAULT_PREFERENCES,
          avatarUri: null,
        }),
    }),
    {
      name: 'athenaeum-preferences',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        preferences: state.preferences,
        avatarUri: state.avatarUri,
      }),
    }
  )
);

export const usePreferencesStore = usePreferencesStoreBase;

export const usePreferences = () =>
  usePreferencesStoreBase((state) => state.preferences);

export const usePreferencesActions = () =>
  usePreferencesStoreBase(
    useShallow((state) => ({
      setPreference: state.setPreference,
      setPreferences: state.setPreferences,
      setAvatarUri: state.setAvatarUri,
      resetPreferences: state.resetPreferences,
    }))
  );

export const useAvatarUri = () =>
  usePreferencesStoreBase((state) => state.avatarUri);

export const usePreferencesHydrated = () =>
  usePreferencesStoreBase((state) => state.isHydrated);
