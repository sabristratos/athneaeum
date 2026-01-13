import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { AuthenticationError } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

function handleGlobalError(error: unknown): void {
  if (error instanceof AuthenticationError) {
    useAuthStore.getState().clearAuth();
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleGlobalError,
    }),
    mutationCache: new MutationCache({
      onError: handleGlobalError,
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: (failureCount, error) => {
          if (error instanceof AuthenticationError) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: (failureCount, error) => {
          if (error instanceof AuthenticationError) {
            return false;
          }
          return failureCount < 1;
        },
      },
    },
  });
}

export function setupQueryClientListeners(): () => void {
  const appStateSubscription = AppState.addEventListener(
    'change',
    (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    }
  );

  const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    onlineManager.setOnline(!!state.isConnected);
  });

  return () => {
    appStateSubscription.remove();
    netInfoUnsubscribe();
  };
}

export const queryClient = createQueryClient();
