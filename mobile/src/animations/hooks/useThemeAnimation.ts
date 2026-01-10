import { useMemo } from 'react';
import { useTheme } from '@/themes';
import { getThemeAnimation, type ThemeAnimationConfig } from '../themeAnimations';
import { useReducedMotion } from './useReducedMotion';
import { TIMING } from '../constants';

export interface ThemeAnimationResult extends ThemeAnimationConfig {
  reducedMotion: boolean;
}

export function useThemeAnimation(): ThemeAnimationResult {
  const { themeName } = useTheme();
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    const config = getThemeAnimation(themeName);

    if (reducedMotion) {
      const instantSpring = { stiffness: 500, damping: 50, mass: 0.5 };
      return {
        ...config,
        spring: {
          press: instantSpring,
          emphasis: instantSpring,
          scroll: instantSpring,
        },
        timing: {
          fade: TIMING.instant,
          slide: TIMING.fast,
        },
        scroll: {
          ...config.scroll,
          enableTilt: false,
          enableSkew: false,
        },
        reducedMotion: true,
      };
    }

    return { ...config, reducedMotion: false };
  }, [themeName, reducedMotion]);
}
