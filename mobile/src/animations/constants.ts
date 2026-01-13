import type { WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

export const SPRINGS = {
  snappy: { damping: 20, stiffness: 300, mass: 0.5 } as WithSpringConfig,
  responsive: { damping: 20, stiffness: 250, mass: 0.5 } as WithSpringConfig,
  gentle: { damping: 25, stiffness: 120, mass: 0.8 } as WithSpringConfig,
  bouncy: { damping: 12, stiffness: 300, mass: 0.5 } as WithSpringConfig,
  settle: { damping: 25, stiffness: 100, mass: 0.8 } as WithSpringConfig,
  dramatic: { damping: 18, stiffness: 280, mass: 0.6 } as WithSpringConfig,
  soft: { damping: 28, stiffness: 150, mass: 1.0 } as WithSpringConfig,
  press: { damping: 18, stiffness: 350 } as WithSpringConfig,
  quickPress: { damping: 18, stiffness: 400 } as WithSpringConfig,
  smoothGentle: { damping: 18, stiffness: 120 } as WithSpringConfig,
  toast: { damping: 20, stiffness: 140 } as WithSpringConfig,
  toastSubtle: { damping: 35, stiffness: 180 } as WithSpringConfig,
  toastFade: { damping: 20, stiffness: 180 } as WithSpringConfig,
  snap: { damping: 25, stiffness: 250 } as WithSpringConfig,
  tabItem: { damping: 25, stiffness: 250, mass: 0.8 } as WithSpringConfig,
  slideIndicator: { damping: 22, stiffness: 200, mass: 1 } as WithSpringConfig,
  hideShow: { damping: 25, stiffness: 160, mass: 0.9 } as WithSpringConfig,
  segmentedControl: { damping: 25, stiffness: 240, mass: 0.9 } as WithSpringConfig,
  swipeReturn: { damping: 25, stiffness: 180, mass: 0.8 } as WithSpringConfig,
  cardStack: { damping: 20, stiffness: 180, mass: 0.8 } as WithSpringConfig,
  reducedMotion: { stiffness: 500, damping: 50, mass: 0.5 } as WithSpringConfig,
  sharedElement: { damping: 30, stiffness: 200, mass: 0.9 } as WithSpringConfig,
  sharedElementFast: { damping: 38, stiffness: 350, mass: 0.6 } as WithSpringConfig,
  modal: { damping: 28, stiffness: 200, mass: 0.9 } as WithSpringConfig,
} as const;

export const TIMING = {
  instant: { duration: 50 } as WithTimingConfig,
  quick: { duration: 80 } as WithTimingConfig,
  fast: { duration: 100 } as WithTimingConfig,
  medium: { duration: 150 } as WithTimingConfig,
  normal: { duration: 200 } as WithTimingConfig,
  slow: { duration: 300 } as WithTimingConfig,
  slower: { duration: 450 } as WithTimingConfig,
  rotation: { duration: 1000 } as WithTimingConfig,
  shimmer: { duration: 1200 } as WithTimingConfig,
  pulse: { duration: 1500 } as WithTimingConfig,
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

export const CELEBRATION = {
  glintDuration: 400,
  bloomScale: 1.35,
  bloomSettleScale: 1.1,
  spinDegrees: 360,
  glowOpacity: 1.3,
  confettiCount: 25,
  confettiDuration: 1200,
  cooldownMs: 500,
} as const;

export type SpringKey = keyof typeof SPRINGS;
export type TimingKey = keyof typeof TIMING;
export type ScaleKey = keyof typeof SCALES;
export type CelebrationKey = keyof typeof CELEBRATION;
