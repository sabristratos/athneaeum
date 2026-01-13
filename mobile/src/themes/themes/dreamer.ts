import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const dreamerTheme: Theme = {
  name: 'dreamer',
  isDark: false,
  colors: {
    // Base surfaces (warm cream/linen tones for cozy feel)
    canvas: '#fdf8f4',
    surface: '#fffbf7',
    surfaceAlt: '#f7f0e8',
    surfaceHover: '#f0e8dd',
    muted: '#e5dcd0',

    // Borders (warm taupe)
    border: '#e5dcd0',
    borderHover: '#d4c8b8',
    borderMuted: '#ebe4da',

    // Primary (Sage green - classic cottagecore)
    primary: '#7d9a82',
    primaryHover: '#6b8870',
    primaryDark: '#5a7560',
    primarySubtle: 'rgba(125,154,130,0.15)',

    // Foreground/Text (Warm brown-grays)
    foreground: '#4a4540',
    foregroundMuted: '#6b6560',
    foregroundSubtle: '#8a8378',
    foregroundWarm: '#7a6b5c',

    // Accent (Dusty rose complement)
    accent: '#c4a0a0',
    accentWarm: '#d4b8b0',
    accentLight: '#f0e0dc',

    // Semantic
    success: '#7d9a82',
    successSubtle: 'rgba(125,154,130,0.15)',
    danger: '#c48b8b',
    dangerSubtle: 'rgba(196,139,139,0.15)',
    warning: '#d4a855',
    warningSubtle: 'rgba(212,168,85,0.15)',

    // On-color (text on colored backgrounds)
    onPrimary: '#ffffff',
    onDanger: '#ffffff',

    // Special
    paper: '#fffcf8',
    tintPrimary: '#f0f5f0',
    tintAccent: '#faf0f0',
    tintGreen: '#f0f5f0',
    tintYellow: '#faf5e8',
    tintPeach: '#faf0ec',
    tintBeige: '#f5f0e8',

    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.4)',
    overlayDark: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(255, 255, 255, 0.6)',
    shadow: '#8a8378',
  },
  fonts: {
    heading: 'Nunito_700Bold',
    body: 'Nunito_400Regular',
  },
  radii: {
    none: 0,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#8a8378',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#7d9a82',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 15,
      elevation: 3,
    },
    lg: {
      shadowColor: '#8a8378',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 24,
      elevation: 4,
    },
  },
  spacing: sharedSpacing,
  borders: {
    thin: 1,
    default: 1.5,
    thick: 2,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  letterSpacing: {
    tight: 0,
    normal: 0.2,
    wide: 0.5,
  },
  lineHeights: {
    tight: 1.4,
    normal: 1.6,
    relaxed: 1.8,
  },
  icons: {
    rating: 'heart',
    progress: 'liquid',
  },
  tagColors: {
    primary: { bg: '#c8d8c8', text: '#4a5548' },
    gold: { bg: '#f0e4c4', text: '#6b5c4a' },
    green: { bg: '#c8d8c8', text: '#4a5548' },
    purple: { bg: '#d8cce0', text: '#5a4a60' },
    copper: { bg: '#e8d8c8', text: '#6b5548' },
    blue: { bg: '#c8d8e0', text: '#4a5560' },
    orange: { bg: '#f0dcc8', text: '#6b5548' },
    teal: { bg: '#c8e0d8', text: '#4a5a55' },
    rose: { bg: '#f0d8d8', text: '#6b4a4a' },
    slate: { bg: '#d8d8d8', text: '#4a4a4a' },
  },
};
