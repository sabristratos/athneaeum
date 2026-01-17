import type { Theme, ThemeColors, ThemeShadows, ThemeRadii, ThemeBorders, ThemeTagColors, TagColorValue } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';
import { lerpColor, lerpNumber } from '@/utils/colorMath';

export const DEBUG_FAST_CYCLE = false;

const DAWN_START = 5 * 60;    // 5:00 AM - night→dawn begins
const DAWN_END = 8 * 60;      // 8:00 AM - dawn→day begins
const MORNING_END = 10 * 60;  // 10:00 AM - stable day begins
const AFTERNOON_START = 16 * 60; // 4:00 PM - day→dusk begins
const DUSK_START = 18 * 60;   // 6:00 PM - dusk→night begins
const DUSK_END = 21 * 60;     // 9:00 PM - full night

export interface DynamicThemeState {
  colors: ThemeColors;
  shadows: ThemeShadows;
  radii: ThemeRadii;
  borders: ThemeBorders;
  tagColors: ThemeTagColors;
  isDark: boolean;
  progress: number;
  celestialProgress: number;
  starOpacity: number;
  phase: 'night' | 'dawn' | 'day' | 'dusk';
}

const nightColors: ThemeColors = {
  canvas: '#0d1321',
  surface: '#151d2e',
  surfaceAlt: '#111827',
  surfaceHover: '#1c2941',
  muted: '#1e293b',
  border: '#2a3a52',
  borderHover: '#3b4f6b',
  borderMuted: '#1e2d42',
  primary: '#a8b5d6',
  primaryHover: '#c4cee6',
  primaryDark: '#7b8bb5',
  primaryGlow: 'rgba(168,181,214,0.25)',
  primarySubtle: 'rgba(168,181,214,0.12)',
  foreground: '#e8ecf4',
  foregroundMuted: '#9ca8c4',
  foregroundSubtle: '#6b7a96',
  foregroundFaint: '#4a5872',
  accent: '#5eead4',
  success: '#34d399',
  successSubtle: 'rgba(52,211,153,0.15)',
  danger: '#f87171',
  dangerSubtle: 'rgba(248,113,113,0.15)',
  warning: '#fbbf24',
  warningSubtle: 'rgba(251,191,36,0.15)',
  onPrimary: '#0d1321',
  onDanger: '#ffffff',
  paper: '#e8ecf4',
  tintPrimary: 'rgba(168,181,214,0.12)',
  tintAccent: 'rgba(94,234,212,0.12)',
  overlay: 'rgba(0,0,0,0.65)',
  overlayDark: 'rgba(0,0,0,0.8)',
  overlayLight: 'rgba(255,255,255,0.35)',
  shadow: '#000000',
};

const dawnColors: ThemeColors = {
  canvas: '#fef7f0',
  surface: '#fff9f5',
  surfaceAlt: '#fef3ea',
  surfaceHover: '#fdeee2',
  muted: '#f5e6d8',
  border: '#e8d4c4',
  borderHover: '#d9c2ae',
  borderMuted: '#f0dfd0',
  primary: '#e07850',
  primaryHover: '#d4623a',
  primaryDark: '#c54e2a',
  primaryGlow: 'rgba(224,120,80,0.25)',
  primarySubtle: 'rgba(224,120,80,0.12)',
  foreground: '#4a3728',
  foregroundMuted: '#7a6352',
  foregroundSubtle: '#9a887a',
  foregroundWarm: '#6b4d3a',
  accent: '#f4a261',
  accentWarm: '#e9c46a',
  success: '#6a9a5b',
  successSubtle: 'rgba(106,154,91,0.15)',
  danger: '#c94a4a',
  dangerSubtle: 'rgba(201,74,74,0.12)',
  warning: '#d4963a',
  warningSubtle: 'rgba(212,150,58,0.15)',
  onPrimary: '#ffffff',
  onDanger: '#ffffff',
  paper: '#4a3728',
  tintPrimary: 'rgba(224,120,80,0.10)',
  tintAccent: 'rgba(244,162,97,0.12)',
  tintPeach: 'rgba(254,215,170,0.5)',
  tintYellow: 'rgba(233,196,106,0.3)',
  overlay: 'rgba(0,0,0,0.4)',
  overlayDark: 'rgba(0,0,0,0.55)',
  overlayLight: 'rgba(255,255,255,0.6)',
  shadow: '#4a3728',
};

const dayColors: ThemeColors = {
  canvas: '#f0f7fc',
  surface: '#ffffff',
  surfaceAlt: '#f5fafd',
  surfaceHover: '#e8f2f8',
  muted: '#dce8f0',
  border: '#c5d8e8',
  borderHover: '#a8c4d8',
  borderMuted: '#dae6f0',
  primary: '#2e8bc9',
  primaryHover: '#1a7ab8',
  primaryDark: '#1565a0',
  primaryGlow: 'rgba(46,139,201,0.2)',
  primarySubtle: 'rgba(46,139,201,0.10)',
  foreground: '#1a3a4a',
  foregroundMuted: '#4a6a7a',
  foregroundSubtle: '#6a8a9a',
  accent: '#f4c542',
  accentLight: '#fad568',
  success: '#38a169',
  successSubtle: 'rgba(56,161,105,0.12)',
  danger: '#e53e3e',
  dangerSubtle: 'rgba(229,62,62,0.12)',
  warning: '#dd9a2c',
  warningSubtle: 'rgba(221,154,44,0.12)',
  onPrimary: '#ffffff',
  onDanger: '#ffffff',
  paper: '#1a3a4a',
  tintPrimary: 'rgba(46,139,201,0.08)',
  tintAccent: 'rgba(244,197,66,0.15)',
  overlay: 'rgba(0,0,0,0.35)',
  overlayDark: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(255,255,255,0.7)',
  shadow: '#1a3a4a',
};

const duskColors: ThemeColors = {
  canvas: '#1f1428',
  surface: '#2a1c35',
  surfaceAlt: '#241830',
  surfaceHover: '#3a2848',
  muted: '#3d2a4a',
  border: '#4a3558',
  borderHover: '#5c4570',
  borderMuted: '#3a2848',
  primary: '#e879a9',
  primaryHover: '#f08aba',
  primaryDark: '#d65a90',
  primaryGlow: 'rgba(232,121,169,0.3)',
  primarySubtle: 'rgba(232,121,169,0.15)',
  foreground: '#f5e6f0',
  foregroundMuted: '#c8a8c0',
  foregroundSubtle: '#9a7890',
  foregroundFaint: '#6b5068',
  accent: '#f4a355',
  accentWarm: '#e89040',
  success: '#6dd4a0',
  successSubtle: 'rgba(109,212,160,0.15)',
  danger: '#f87171',
  dangerSubtle: 'rgba(248,113,113,0.15)',
  warning: '#fbbf24',
  warningSubtle: 'rgba(251,191,36,0.15)',
  onPrimary: '#1f1428',
  onDanger: '#ffffff',
  paper: '#f5e6f0',
  tintPrimary: 'rgba(232,121,169,0.12)',
  tintAccent: 'rgba(244,163,85,0.15)',
  overlay: 'rgba(0,0,0,0.55)',
  overlayDark: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(255,255,255,0.4)',
  shadow: '#0f0a14',
};

const nightShadows: ThemeShadows = {
  sm: { shadowColor: '#5eead4', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  md: { shadowColor: '#5eead4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 5 },
  lg: { shadowColor: '#5eead4', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
};

const dawnShadows: ThemeShadows = {
  sm: { shadowColor: '#e07850', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 2 },
  md: { shadowColor: '#e07850', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  lg: { shadowColor: '#e07850', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 6 },
};

const dayShadows: ThemeShadows = {
  sm: { shadowColor: '#2e8bc9', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  md: { shadowColor: '#2e8bc9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#2e8bc9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 5 },
};

const duskShadows: ThemeShadows = {
  sm: { shadowColor: '#e879a9', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  md: { shadowColor: '#e879a9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5 },
  lg: { shadowColor: '#e879a9', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 22, elevation: 7 },
};

const nightTagColors: ThemeTagColors = {
  primary: { bg: '#a8b5d6', text: '#0d1321' },
  gold: { bg: '#fbbf24', text: '#0d1321' },
  green: { bg: '#5eead4', text: '#0d1321' },
  purple: { bg: '#c4b5fd', text: '#0d1321' },
  copper: { bg: '#f4a261', text: '#0d1321' },
  blue: { bg: '#7dd3fc', text: '#0d1321' },
  orange: { bg: '#fb923c', text: '#0d1321' },
  teal: { bg: '#5eead4', text: '#0d1321' },
  rose: { bg: '#fda4af', text: '#0d1321' },
  slate: { bg: '#94a3b8', text: '#0d1321' },
};

const dawnTagColors: ThemeTagColors = {
  primary: { bg: '#e07850', text: '#ffffff' },
  gold: { bg: '#e9c46a', text: '#4a3728' },
  green: { bg: '#6a9a5b', text: '#ffffff' },
  purple: { bg: '#b57edc', text: '#ffffff' },
  copper: { bg: '#c97b4a', text: '#ffffff' },
  blue: { bg: '#5a9eca', text: '#ffffff' },
  orange: { bg: '#f4a261', text: '#4a3728' },
  teal: { bg: '#4aa5a0', text: '#ffffff' },
  rose: { bg: '#e07a8a', text: '#ffffff' },
  slate: { bg: '#8a7a6a', text: '#ffffff' },
};

const dayTagColors: ThemeTagColors = {
  primary: { bg: '#2e8bc9', text: '#ffffff' },
  gold: { bg: '#f4c542', text: '#1a3a4a' },
  green: { bg: '#38a169', text: '#ffffff' },
  purple: { bg: '#805ad5', text: '#ffffff' },
  copper: { bg: '#c97b4a', text: '#ffffff' },
  blue: { bg: '#3182ce', text: '#ffffff' },
  orange: { bg: '#ed8936', text: '#1a3a4a' },
  teal: { bg: '#319795', text: '#ffffff' },
  rose: { bg: '#ed64a6', text: '#ffffff' },
  slate: { bg: '#718096', text: '#ffffff' },
};

const duskTagColors: ThemeTagColors = {
  primary: { bg: '#e879a9', text: '#1f1428' },
  gold: { bg: '#fbbf24', text: '#1f1428' },
  green: { bg: '#6dd4a0', text: '#1f1428' },
  purple: { bg: '#c4b5fd', text: '#1f1428' },
  copper: { bg: '#f4a355', text: '#1f1428' },
  blue: { bg: '#93c5fd', text: '#1f1428' },
  orange: { bg: '#fb923c', text: '#1f1428' },
  teal: { bg: '#5eead4', text: '#1f1428' },
  rose: { bg: '#fda4af', text: '#1f1428' },
  slate: { bg: '#a8a0b0', text: '#1f1428' },
};

const sharedRadii: ThemeRadii = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
};

const sharedBorders: ThemeBorders = {
  thin: 1,
  default: 1,
  thick: 2,
};

function parseRgba(rgba: string): { r: number; g: number; b: number; a: number } | null {
  const match = rgba.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null;
  return {
    r: parseFloat(match[1]),
    g: parseFloat(match[2]),
    b: parseFloat(match[3]),
    a: match[4] ? parseFloat(match[4]) : 1,
  };
}

function rgbaToString(r: number, g: number, b: number, a: number): string {
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a.toFixed(2)})`;
}

function lerpRgba(start: string, end: string, t: number): string {
  const startParsed = parseRgba(start);
  const endParsed = parseRgba(end);
  if (!startParsed || !endParsed) return t < 0.5 ? start : end;
  return rgbaToString(
    lerpNumber(startParsed.r, endParsed.r, t),
    lerpNumber(startParsed.g, endParsed.g, t),
    lerpNumber(startParsed.b, endParsed.b, t),
    lerpNumber(startParsed.a, endParsed.a, t)
  );
}

function interpolateColor(start: string, end: string, t: number): string {
  if (start.startsWith('#') && end.startsWith('#')) return lerpColor(start, end, t);
  if (start.startsWith('rgba') && end.startsWith('rgba')) return lerpRgba(start, end, t);
  return t < 0.5 ? start : end;
}

/**
 * Binary snap for text elements.
 * Text instantly changes at the 50% midpoint rather than gradually transitioning.
 * This guarantees maximum contrast at all times - no gray-on-gray.
 * In real-time (3-hour transitions), this snap is imperceptible.
 */
function stepTransition(t: number): number {
  return t < 0.5 ? 0 : 1;
}

const TEXT_KEYS = new Set<keyof ThemeColors>([
  'foreground',
  'foregroundMuted',
  'foregroundSubtle',
  'foregroundWarm',
  'foregroundFaint',
  'accent',
  'paper',
  'onPrimary',
  'onDanger',
]);

function interpolateColors(start: ThemeColors, end: ThemeColors, t: number): ThemeColors {
  const result = {} as ThemeColors;
  const allKeys = new Set([...Object.keys(start), ...Object.keys(end)]) as Set<keyof ThemeColors>;

  const tText = stepTransition(t);

  allKeys.forEach((key) => {
    const startVal = start[key];
    const endVal = end[key];

    const activeT = TEXT_KEYS.has(key) ? tText : t;

    if (startVal && endVal) {
      result[key] = interpolateColor(startVal, endVal, activeT);
    } else {
      result[key] = (startVal || endVal) as string;
    }
  });
  return result;
}

function interpolateShadow(start: ThemeShadows['sm'], end: ThemeShadows['sm'], t: number): ThemeShadows['sm'] {
  return {
    shadowColor: interpolateColor(start.shadowColor, end.shadowColor, t),
    shadowOffset: {
      width: lerpNumber(start.shadowOffset.width, end.shadowOffset.width, t),
      height: lerpNumber(start.shadowOffset.height, end.shadowOffset.height, t),
    },
    shadowOpacity: lerpNumber(start.shadowOpacity, end.shadowOpacity, t),
    shadowRadius: lerpNumber(start.shadowRadius, end.shadowRadius, t),
    elevation: Math.round(lerpNumber(start.elevation, end.elevation, t)),
  };
}

function interpolateShadows(start: ThemeShadows, end: ThemeShadows, t: number): ThemeShadows {
  return {
    sm: interpolateShadow(start.sm, end.sm, t),
    md: interpolateShadow(start.md, end.md, t),
    lg: interpolateShadow(start.lg, end.lg, t),
  };
}

function interpolateTagColor(start: TagColorValue, end: TagColorValue, t: number): TagColorValue {
  const tText = stepTransition(t);
  return {
    bg: interpolateColor(start.bg, end.bg, t),
    text: interpolateColor(start.text, end.text, tText),
  };
}

function interpolateTagColors(start: ThemeTagColors, end: ThemeTagColors, t: number): ThemeTagColors {
  return {
    primary: interpolateTagColor(start.primary, end.primary, t),
    gold: interpolateTagColor(start.gold, end.gold, t),
    green: interpolateTagColor(start.green, end.green, t),
    purple: interpolateTagColor(start.purple, end.purple, t),
    copper: interpolateTagColor(start.copper, end.copper, t),
    blue: interpolateTagColor(start.blue, end.blue, t),
    orange: interpolateTagColor(start.orange, end.orange, t),
    teal: interpolateTagColor(start.teal, end.teal, t),
    rose: interpolateTagColor(start.rose, end.rose, t),
    slate: interpolateTagColor(start.slate, end.slate, t),
  };
}

function getDebugFastCycleState(date: Date): DynamicThemeState {
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;

  // 0-15s: night→dawn (stars fade out)
  if (seconds < 15) {
    const t = seconds / 15;
    const celestialProgress = seconds / 30;
    const starOpacity = Math.max(0, 1 - t * 1.5);
    return {
      colors: interpolateColors(nightColors, dawnColors, t),
      shadows: interpolateShadows(nightShadows, dawnShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(nightTagColors, dawnTagColors, t),
      isDark: t < 0.5,
      progress: t,
      celestialProgress,
      starOpacity,
      phase: 'dawn',
    };
  }

  // 15-30s: dawn→day (no stars)
  if (seconds < 30) {
    const t = (seconds - 15) / 15;
    const celestialProgress = seconds / 30;
    return {
      colors: interpolateColors(dawnColors, dayColors, t),
      shadows: interpolateShadows(dawnShadows, dayShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(dawnTagColors, dayTagColors, t),
      isDark: false,
      progress: t,
      celestialProgress,
      starOpacity: 0,
      phase: 'day',
    };
  }

  // 30-45s: day→dusk (stars fade in)
  if (seconds < 45) {
    const t = (seconds - 30) / 15;
    const celestialProgress = (seconds - 30) / 30;
    const starOpacity = t > 0.5 ? (t - 0.5) * 2 : 0;
    return {
      colors: interpolateColors(dayColors, duskColors, t),
      shadows: interpolateShadows(dayShadows, duskShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(dayTagColors, duskTagColors, t),
      isDark: false,
      progress: t,
      celestialProgress,
      starOpacity,
      phase: 'dusk',
    };
  }

  // 45-60s: dusk→night (full stars)
  const t = (seconds - 45) / 15;
  const celestialProgress = (seconds - 30) / 30;
  return {
    colors: interpolateColors(duskColors, nightColors, t),
    shadows: interpolateShadows(duskShadows, nightShadows, t),
    radii: sharedRadii,
    borders: sharedBorders,
    tagColors: interpolateTagColors(duskTagColors, nightTagColors, t),
    isDark: t > 0.5,
    progress: t,
    celestialProgress,
    starOpacity: 1,
    phase: 'night',
  };
}

export function getDynamicThemeState(date: Date): DynamicThemeState {
  if (DEBUG_FAST_CYCLE) {
    return getDebugFastCycleState(date);
  }

  const minutes = date.getHours() * 60 + date.getMinutes();

  if (minutes < DAWN_START || minutes >= DUSK_END) {
    const nightProgress = minutes < DAWN_START
      ? (minutes + 24 * 60 - DUSK_END) / (DAWN_START + 24 * 60 - DUSK_END)
      : (minutes - DUSK_END) / (DAWN_START + 24 * 60 - DUSK_END);
    return {
      colors: nightColors,
      shadows: nightShadows,
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: nightTagColors,
      isDark: true,
      progress: nightProgress,
      celestialProgress: nightProgress,
      starOpacity: 1,
      phase: 'night',
    };
  }

  if (minutes >= DAWN_START && minutes < DAWN_END) {
    const t = (minutes - DAWN_START) / (DAWN_END - DAWN_START);
    const sunDuration = DUSK_START - DAWN_START;
    const celestialProgress = (minutes - DAWN_START) / sunDuration;
    const starOpacity = Math.max(0, 1 - t * 1.5);
    return {
      colors: interpolateColors(nightColors, dawnColors, t),
      shadows: interpolateShadows(nightShadows, dawnShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(nightTagColors, dawnTagColors, t),
      isDark: t < 0.5,
      progress: t,
      celestialProgress,
      starOpacity,
      phase: 'dawn',
    };
  }

  const sunDuration = DUSK_START - DAWN_START;

  // Morning: 8AM - 10AM (dawn→day transition)
  if (minutes >= DAWN_END && minutes < MORNING_END) {
    const t = (minutes - DAWN_END) / (MORNING_END - DAWN_END);
    const celestialProgress = (minutes - DAWN_START) / sunDuration;
    return {
      colors: interpolateColors(dawnColors, dayColors, t),
      shadows: interpolateShadows(dawnShadows, dayShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(dawnTagColors, dayTagColors, t),
      isDark: false,
      progress: t,
      celestialProgress,
      starOpacity: 0,
      phase: 'day',
    };
  }

  // Day: 10AM - 4PM (stable day colors)
  if (minutes >= MORNING_END && minutes < AFTERNOON_START) {
    const dayProgress = (minutes - MORNING_END) / (AFTERNOON_START - MORNING_END);
    const celestialProgress = (minutes - DAWN_START) / sunDuration;
    return {
      colors: dayColors,
      shadows: dayShadows,
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: dayTagColors,
      isDark: false,
      progress: dayProgress,
      celestialProgress,
      starOpacity: 0,
      phase: 'day',
    };
  }

  // Afternoon: 4PM - 6PM (day→dusk transition, stars begin to appear)
  if (minutes >= AFTERNOON_START && minutes < DUSK_START) {
    const t = (minutes - AFTERNOON_START) / (DUSK_START - AFTERNOON_START);
    const celestialProgress = (minutes - DAWN_START) / sunDuration;
    const starOpacity = t > 0.7 ? (t - 0.7) / 0.3 * 0.3 : 0;
    return {
      colors: interpolateColors(dayColors, duskColors, t),
      shadows: interpolateShadows(dayShadows, duskShadows, t),
      radii: sharedRadii,
      borders: sharedBorders,
      tagColors: interpolateTagColors(dayTagColors, duskTagColors, t),
      isDark: false,
      progress: t,
      celestialProgress,
      starOpacity,
      phase: 'dusk',
    };
  }

  const t = (minutes - DUSK_START) / (DUSK_END - DUSK_START);
  const moonDuration = (24 * 60 - DUSK_START) + DAWN_START;
  const celestialProgress = (minutes - DUSK_START) / moonDuration;
  const starOpacity = t > 0.3 ? Math.min(1, (t - 0.3) * 1.5) : 0;
  return {
    colors: interpolateColors(duskColors, nightColors, t),
    shadows: interpolateShadows(duskShadows, nightShadows, t),
    radii: sharedRadii,
    borders: sharedBorders,
    tagColors: interpolateTagColors(duskTagColors, nightTagColors, t),
    isDark: t > 0.5,
    progress: t,
    celestialProgress,
    starOpacity,
    phase: 'dusk',
  };
}

export const dynamicThemeBase: Omit<Theme, 'colors' | 'shadows' | 'radii' | 'borders' | 'tagColors' | 'isDark'> = {
  name: 'dynamic',
  fonts: {
    heading: 'Nunito_700Bold',
    body: 'Nunito_400Regular',
  },
  spacing: sharedSpacing,
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tight: 0,
    normal: 0.15,
    wide: 0.5,
  },
  lineHeights: {
    tight: 1.3,
    normal: 1.55,
    relaxed: 1.7,
  },
  icons: {
    rating: 'star',
    progress: 'liquid',
  },
};

export function buildDynamicTheme(state: DynamicThemeState): Theme {
  return {
    ...dynamicThemeBase,
    name: 'dynamic',
    colors: state.colors,
    shadows: state.shadows,
    radii: state.radii,
    borders: state.borders,
    tagColors: state.tagColors,
    isDark: state.isDark,
  };
}
