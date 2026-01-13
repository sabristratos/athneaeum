import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { mmkvStorage } from '@/lib/storage';
import { setToken, removeToken } from '@/api/client';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setAuth: (user: User, token: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setHydrated: (hydrated: boolean) => void;
}

const useAuthStoreBase = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      setAuth: async (user: User, token: string) => {
        await setToken(token);
        set({ user, isAuthenticated: true });
      },

      clearAuth: async () => {
        await removeToken();
        set({ user: null, isAuthenticated: false });
      },

      setUser: (user: User) => set({ user }),

      setHydrated: (hydrated: boolean) => set({ isHydrated: hydrated }),
    }),
    {
      name: 'athenaeum-auth',
      storage: createJSONStorage(() => mmkvStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useAuthStore = useAuthStoreBase;

export const useAuthActions = () =>
  useAuthStoreBase(
    useShallow((state) => ({
      setAuth: state.setAuth,
      clearAuth: state.clearAuth,
      setUser: state.setUser,
    }))
  );

export const useUser = () => useAuthStoreBase((state) => state.user);

export const useIsAuthenticated = () => useAuthStoreBase((state) => state.isAuthenticated);

export const useAuthHydrated = () => useAuthStoreBase((state) => state.isHydrated);
