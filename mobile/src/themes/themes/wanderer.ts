import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const wandererTheme: Theme = {
  name: 'wanderer',
  isDark: false,
  colors: {
    // Base surfaces (parchment/map tones)
    canvas: '#f5f0e6',
    surface: '#faf6ee',
    surfaceAlt: '#ebe4d4',
    surfaceHover: '#e5dcc8',

    // Borders
    border: '#d4c9b5',
    borderHover: '#b8a98e',
    borderMuted: '#e5dcc8',

    // Primary (Copper/brass)
    primary: '#b87333',
    primaryHover: '#a36429',
    primaryDark: '#8b5a2b',

    // Foreground/Text (Brown tones)
    foreground: '#3d3225',
    foregroundMuted: '#6b5c4a',
    foregroundSubtle: '#8b7a66',
    foregroundWarm: '#7a6548',

    // Accent (Forest green)
    accent: '#2d5a3d',
    accentWarm: '#4a7c59',
    accentLight: '#6b9b7a',

    // Semantic
    success: '#2d5a3d',
    danger: '#a65d5d',
    warning: '#c9a227',

    // On-color (text on colored backgrounds)
    onPrimary: '#ffffff',
    onDanger: '#ffffff',

    // Special
    paper: '#fdfaf3',
    tintPrimary: 'rgba(184,115,51,0.12)',
    tintAccent: 'rgba(45,90,61,0.1)',
    tintGreen: '#e8f0e8',
    tintYellow: '#f5ecd4',
    tintPeach: '#f8ede4',
    tintBeige: '#f0e8d8',

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
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#3d3225',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#3d3225',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#3d3225',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 6,
    },
  },
  spacing: sharedSpacing,
  borders: {
    thin: 1,
    default: 1,
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
    normal: 0.3,
    wide: 1,
  },
  lineHeights: {
    tight: 1.3,
    normal: 1.5,
    relaxed: 1.7,
  },
  icons: {
    rating: 'compass',
    progress: 'trail',
  },
};
