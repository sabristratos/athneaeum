import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const dreamerTheme: Theme = {
  name: 'dreamer',
  isDark: false,
  colors: {
    // Base surfaces
    canvas: '#fbfaf8',
    surface: '#ffffff',
    surfaceAlt: '#f3eff5',
    surfaceHover: '#ece7f0',

    // Borders
    border: '#ddd6e0',
    borderHover: '#c9bfd0',
    borderMuted: '#e8e3ec',

    // Primary (Dusty Lavender)
    primary: '#8b7a9e',
    primaryHover: '#7a698d',
    primaryDark: '#665878',

    // Foreground/Text
    foreground: '#4a4550',
    foregroundMuted: '#6b6575',
    foregroundSubtle: '#8b8095',
    foregroundWarm: '#7a6b60',

    // Accent (Sage/green complement)
    accent: '#8aa090',
    accentWarm: '#b5c9b0',
    accentLight: '#dce8da',

    // Semantic
    success: '#6b9075',
    danger: '#b86b78',
    warning: '#d4a855',

    // On-color (text on colored backgrounds)
    onPrimary: '#ffffff',
    onDanger: '#ffffff',

    // Special
    paper: '#ffffff',
    tintPrimary: '#f5f0f8',
    tintAccent: '#f0f5f2',
    tintGreen: '#f0f5f2',
    tintYellow: '#f8f4e8',
    tintPeach: '#fcf0ed',
    tintBeige: '#f4f0e8',

    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayDark: 'rgba(0, 0, 0, 0.6)',
    overlayLight: 'rgba(255, 255, 255, 0.5)',
    shadow: '#000000',
  },
  fonts: {
    heading: 'Nunito_700Bold',
    body: 'Nunito_600SemiBold',
  },
  radii: {
    none: 0,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#8b7a9e',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 15,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.04,
      shadowRadius: 30,
      elevation: 4,
    },
  },
  spacing: sharedSpacing,
  borders: {
    thin: 1,
    default: 2,
    thick: 3,
  },
  fontWeights: {
    normal: '600',
    medium: '600',
    semibold: '700',
    bold: '800',
  },
  letterSpacing: {
    tight: 0,
    normal: 0,
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
};
