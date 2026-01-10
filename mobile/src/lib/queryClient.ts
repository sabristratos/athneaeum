import { QueryClient } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 1,
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
