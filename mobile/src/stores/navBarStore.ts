import { create } from 'zustand';
import { useCallback, useRef } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface NavBarStore {
  isVisible: boolean;
  setVisible: (visible: boolean) => void;
}

export const useNavBarStore = create<NavBarStore>((set) => ({
  isVisible: true,
  setVisible: (visible) => set({ isVisible: visible }),
}));

export const useNavBarVisible = () => useNavBarStore((state) => state.isVisible);
export const useSetNavBarVisible = () => useNavBarStore((state) => state.setVisible);

const SCROLL_THRESHOLD = 15;
const MIN_SCROLL_TO_HIDE = 60;

export function useNavBarScrollHandler() {
  const setVisible = useSetNavBarVisible();
  const lastScrollY = useRef(0);
  const lastDirection = useRef<'up' | 'down' | null>(null);
  const accumulatedScroll = useRef(0);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;

      if (currentY <= 0) {
        setVisible(true);
        accumulatedScroll.current = 0;
        lastDirection.current = null;
        lastScrollY.current = currentY;
        return;
      }

      const currentDirection = diff > 0 ? 'down' : 'up';

      if (currentDirection !== lastDirection.current) {
        accumulatedScroll.current = 0;
        lastDirection.current = currentDirection;
      }

      accumulatedScroll.current += Math.abs(diff);

      if (accumulatedScroll.current > SCROLL_THRESHOLD) {
        if (currentDirection === 'down' && currentY > MIN_SCROLL_TO_HIDE) {
          setVisible(false);
        } else if (currentDirection === 'up') {
          setVisible(true);
        }
      }

      lastScrollY.current = currentY;
    },
    [setVisible]
  );

  const onScrollEnd = useCallback(() => {
    if (lastScrollY.current <= MIN_SCROLL_TO_HIDE) {
      setVisible(true);
    }
  }, [setVisible]);

  return { onScroll, onScrollEnd };
}

export function useShowNavBar() {
  const setVisible = useSetNavBarVisible();
  return useCallback(() => setVisible(true), [setVisible]);
}
