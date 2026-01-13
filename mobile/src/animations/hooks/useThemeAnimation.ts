import { useMemo } from 'react';
import { useTheme } from '@/themes';
import { getThemeAnimation, type ThemeAnimationConfig } from '../themeAnimations';
import { useReducedMotion } from './useReducedMotion';
import { SPRINGS, TIMING } from '../constants';

export interface ThemeAnimationResult extends ThemeAnimationConfig {
  reducedMotion: boolean;
}

export function useThemeAnimation(): ThemeAnimationResult {
  const { themeName } = useTheme();
  const reducedMotion = useReducedMotion();

  return useMemo(() => {
    const config = getThemeAnimation(themeName);

    if (reducedMotion) {
      return {
        ...config,
        spring: {
          press: SPRINGS.reducedMotion,
          emphasis: SPRINGS.reducedMotion,
          scroll: SPRINGS.reducedMotion,
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
