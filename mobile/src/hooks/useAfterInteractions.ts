import { useEffect, useState, useCallback, useRef } from 'react';
import { InteractionManager } from 'react-native';

export function useAfterInteractions() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });

    return () => handle.cancel();
  }, []);

  return isReady;
}

export function useDeferredValue<T>(value: T, delay = 0): T {
  const [deferredValue, setDeferredValue] = useState<T>(value);
  const isReady = useAfterInteractions();

  useEffect(() => {
    if (!isReady) return;

    if (delay === 0) {
      setDeferredValue(value);
    } else {
      const timer = setTimeout(() => setDeferredValue(value), delay);
      return () => clearTimeout(timer);
    }
  }, [value, isReady, delay]);

  return isReady ? deferredValue : value;
}

export function useRunAfterInteractions<T extends (...args: any[]) => void>(callback: T) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    InteractionManager.runAfterInteractions(() => {
      callbackRef.current(...args);
    });
  }, []) as T;
}

export function useDeferredEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList
) {
  const isReady = useAfterInteractions();
  const cleanupRef = useRef<void | (() => void)>(undefined);

  useEffect(() => {
    if (!isReady) return;

    cleanupRef.current = effect();

    return () => {
      if (typeof cleanupRef.current === 'function') {
        cleanupRef.current();
      }
    };
  }, [isReady, ...deps]);
}

export function useDeferredCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const isReady = useAfterInteractions();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!isReady) {
        return InteractionManager.runAfterInteractions(() => {
          return callbackRef.current(...args);
        });
      }
      return callbackRef.current(...args);
    },
    [isReady, ...deps]
  ) as T;
}
