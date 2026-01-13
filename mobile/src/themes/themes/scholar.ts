import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const scholarTheme: Theme = {
  name: 'scholar',
  isDark: true,
  colors: {
    // Base surfaces
    canvas: '#12100e',
    surface: '#1c1a17',
    surfaceAlt: '#161412',
    surfaceHover: '#2a2622',
    muted: '#2a2622',

    // Borders
    border: '#2a2622',
    borderHover: '#3d3630',
    borderMuted: '#2d2824',

    // Primary (Deep burgundy)
    primary: '#8b2e2e',
    primaryHover: '#a33a3a',
    primaryDark: '#6b2222',
    primaryGlow: 'rgba(139,46,46,0.3)',
    primarySubtle: 'rgba(139,46,46,0.15)',

    // Foreground/Text (Cream/paper tones) - lightened for better contrast
    foreground: '#dcd0c0',
    foregroundMuted: '#a9a193',    // Lightened for readability on dark bg
    foregroundSubtle: '#8c857b',   // Bumped up from old muted value
    foregroundFaint: '#6b655e',

    // Accent
    accent: '#0f172a',

    // Semantic
    success: '#4a6741',
    successSubtle: 'rgba(74,103,65,0.15)',
    danger: '#8b2e2e',
    dangerSubtle: 'rgba(139,46,46,0.15)',
    warning: '#b8860b',
    warningSubtle: 'rgba(184,134,11,0.15)',

    // On-color (text on colored backgrounds)
    onPrimary: '#dcd0c0',
    onDanger: '#dcd0c0',

    // Special
    paper: '#dcd0c0',
    tintPrimary: 'rgba(139,46,46,0.15)',
    tintAccent: 'rgba(15,23,42,0.3)',

    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(255, 255, 255, 0.5)',
    shadow: '#000000',
  },
  fonts: {
    heading: 'PlayfairDisplay_600SemiBold',
    body: 'CrimsonText_400Regular',
  },
  radii: {
    none: 0,
    xs: 1,
    sm: 2,
    md: 4,
    lg: 6,
    xl: 8,
    '2xl': 10,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 3,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 30,
      elevation: 8,
    },
  },
  spacing: sharedSpacing,
  borders: {
    thin: 1,
    default: 1,
    thick: 1,
  },
  fontWeights: {
    normal: '400',
    medium: '400',
    semibold: '600',
    bold: '600',
  },
  letterSpacing: {
    tight: 0,
    normal: 0.5,
    wide: 1.5,
  },
  lineHeights: {
    tight: 1.3,
    normal: 1.5,
    relaxed: 1.6,
  },
  icons: {
    rating: 'star',
    progress: 'ink',
  },
  tagColors: {
    primary: { bg: '#8b2e2e', text: '#dcd0c0' },
    gold: { bg: '#b8860b', text: '#12100e' },
    green: { bg: '#4a6741', text: '#dcd0c0' },
    purple: { bg: '#5d4777', text: '#dcd0c0' },
    copper: { bg: '#8b5a2b', text: '#dcd0c0' },
    blue: { bg: '#3d5a80', text: '#dcd0c0' },
    orange: { bg: '#a65d2e', text: '#dcd0c0' },
    teal: { bg: '#2f6b6b', text: '#dcd0c0' },
    rose: { bg: '#8b5a5a', text: '#dcd0c0' },
    slate: { bg: '#4a4a4a', text: '#dcd0c0' },
  },
};
