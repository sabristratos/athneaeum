import type { ThemeName } from '@/types/theme';
import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';
import { SPRINGS, TIMING, SCALES, TRANSFORMS } from './constants';

export interface ThemeAnimationConfig {
  spring: {
    press: WithSpringConfig;
    emphasis: WithSpringConfig;
    scroll: WithSpringConfig;
  };
  timing: {
    fade: WithTimingConfig;
    slide: WithTimingConfig;
  };
  scales: {
    pressed: number;
    emphasis: number;
  };
  scroll: {
    enableTilt: boolean;
    enableSkew: boolean;
    maxTiltAngle: number;
    maxSkewAngle: number;
  };
}

export const THEME_ANIMATIONS: Record<ThemeName, ThemeAnimationConfig> = {
  scholar: {
    spring: {
      press: SPRINGS.dramatic,
      emphasis: SPRINGS.responsive,
      scroll: SPRINGS.gentle,
    },
    timing: {
      fade: TIMING.fast,
      slide: TIMING.normal,
    },
    scales: {
      pressed: SCALES.pressedStrong,
      emphasis: SCALES.pop,
    },
    scroll: {
      enableTilt: true,
      enableSkew: true,
      maxTiltAngle: TRANSFORMS.maxTiltAngle,
      maxSkewAngle: TRANSFORMS.maxSkewAngle,
    },
  },
  dreamer: {
    spring: {
      press: SPRINGS.soft,
      emphasis: SPRINGS.bouncy,
      scroll: SPRINGS.settle,
    },
    timing: {
      fade: TIMING.normal,
      slide: TIMING.slow,
    },
    scales: {
      pressed: SCALES.pressedSubtle,
      emphasis: SCALES.emphasis,
    },
    scroll: {
      enableTilt: true,
      enableSkew: false,
      maxTiltAngle: TRANSFORMS.maxTiltAngle * 0.6,
      maxSkewAngle: 0,
    },
  },
  wanderer: {
    spring: {
      press: SPRINGS.responsive,
      emphasis: SPRINGS.bouncy,
      scroll: SPRINGS.gentle,
    },
    timing: {
      fade: TIMING.normal,
      slide: TIMING.normal,
    },
    scales: {
      pressed: SCALES.pressed,
      emphasis: SCALES.emphasis,
    },
    scroll: {
      enableTilt: true,
      enableSkew: true,
      maxTiltAngle: TRANSFORMS.maxTiltAngle,
      maxSkewAngle: TRANSFORMS.maxSkewAngle,
    },
  },
  midnight: {
    spring: {
      press: SPRINGS.dramatic,
      emphasis: SPRINGS.responsive,
      scroll: SPRINGS.gentle,
    },
    timing: {
      fade: TIMING.normal,
      slide: TIMING.normal,
    },
    scales: {
      pressed: SCALES.pressed,
      emphasis: SCALES.emphasis,
    },
    scroll: {
      enableTilt: true,
      enableSkew: false,
      maxTiltAngle: TRANSFORMS.maxTiltAngle * 0.8,
      maxSkewAngle: 0,
    },
  },
  dynamic: {
    spring: {
      press: SPRINGS.dramatic,
      emphasis: SPRINGS.responsive,
      scroll: SPRINGS.gentle,
    },
    timing: {
      fade: TIMING.normal,
      slide: TIMING.normal,
    },
    scales: {
      pressed: SCALES.pressed,
      emphasis: SCALES.emphasis,
    },
    scroll: {
      enableTilt: true,
      enableSkew: false,
      maxTiltAngle: TRANSFORMS.maxTiltAngle * 0.8,
      maxSkewAngle: 0,
    },
  },
};

export function getThemeAnimation(themeName: ThemeName): ThemeAnimationConfig {
  return THEME_ANIMATIONS[themeName];
}
