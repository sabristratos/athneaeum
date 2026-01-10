import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const SPRINGS = {
  snappy: { damping: 15, stiffness: 400, mass: 0.5 } as WithSpringConfig,
  responsive: { damping: 15, stiffness: 300, mass: 0.5 } as WithSpringConfig,
  gentle: { damping: 20, stiffness: 150, mass: 0.8 } as WithSpringConfig,
  bouncy: { damping: 8, stiffness: 400, mass: 0.5 } as WithSpringConfig,
  settle: { damping: 20, stiffness: 120, mass: 0.8 } as WithSpringConfig,
  dramatic: { damping: 12, stiffness: 350, mass: 0.6 } as WithSpringConfig,
  soft: { damping: 25, stiffness: 200, mass: 1.0 } as WithSpringConfig,
} as const;

export const TIMING = {
  instant: { duration: 50 } as WithTimingConfig,
  fast: { duration: 100 } as WithTimingConfig,
  normal: { duration: 200 } as WithTimingConfig,
  slow: { duration: 300 } as WithTimingConfig,
  slower: { duration: 450 } as WithTimingConfig,
  shimmer: { duration: 1200 } as WithTimingConfig,
} as const;

export const SCALES = {
  pressedSubtle: 0.98,
  pressed: 0.96,
  pressedStrong: 0.94,
  hover: 1.02,
  emphasis: 1.05,
  pop: 1.2,
  popSettle: 1.05,
} as const;

export const OPACITIES = {
  pressed: 0.8,
  disabled: 0.5,
  muted: 0.6,
  shimmerMin: 0.3,
  shimmerMax: 0.7,
} as const;

export const TRANSFORMS = {
  maxTiltAngle: 8,
  maxSkewAngle: 3,
  perspectiveDefault: 1000,
  perspectiveClose: 800,
} as const;

export const VELOCITY = {
  tiltThreshold: 50,
  skewThreshold: 150,
  maxVelocity: 200,
} as const;

export const STAGGER = {
  fast: 30,
  normal: 50,
  slow: 100,
} as const;

export type SpringKey = keyof typeof SPRINGS;
export type TimingKey = keyof typeof TIMING;
export type ScaleKey = keyof typeof SCALES;
