export const sharedSpacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const iconSizes = {
  xs: 14,
  sm: 16,
  'sm-md': 18,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
} as const;

export const coverSizes = {
  xs: { width: 40, height: 60 },
  sm: { width: 50, height: 75 },
  md: { width: 70, height: 105 },
  lg: { width: 100, height: 150 },
  xl: { width: 140, height: 210 },
  stack: { width: 220, height: 330 },
} as const;

export const componentSizes = {
  buttonHeight: {
    sm: 32,
    md: 40,
    lg: 48,
  },
  inputHeight: 48,
  chipHeight: 32,
  tabBarHeight: 64,
  headerHeight: 56,
  fabSize: 56,
  checkboxSize: 20,
  radioSize: 20,
} as const;
