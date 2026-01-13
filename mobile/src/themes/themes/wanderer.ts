import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const wandererTheme: Theme = {
  name: 'wanderer',
  isDark: false,
  colors: {
    // Base surfaces (aged parchment/antique map tones)
    canvas: '#f4ebe0',
    surface: '#faf5ec',
    surfaceAlt: '#ebe0d0',
    surfaceHover: '#e0d4c0',
    muted: '#d0c0a8',

    // Borders (weathered sepia)
    border: '#d0c0a8',
    borderHover: '#b8a888',
    borderMuted: '#e0d4c4',

    // Primary (Antiqued copper/brass)
    primary: '#a86830',
    primaryHover: '#8b5528',
    primaryDark: '#704520',
    primarySubtle: 'rgba(168,104,48,0.15)',

    // Foreground/Text (Deep sepia tones)
    foreground: '#3a3028',
    foregroundMuted: '#5a4a3a',
    foregroundSubtle: '#7a685a',
    foregroundWarm: '#6a5040',

    // Accent (Deep forest/expedition green)
    accent: '#3a5a40',
    accentWarm: '#4a7050',
    accentLight: '#6a9070',

    // Semantic
    success: '#3a5a40',
    successSubtle: 'rgba(58,90,64,0.15)',
    danger: '#a05a50',
    dangerSubtle: 'rgba(160,90,80,0.15)',
    warning: '#c09028',
    warningSubtle: 'rgba(192,144,40,0.15)',

    // On-color (text on colored backgrounds)
    onPrimary: '#faf5ec',
    onDanger: '#faf5ec',

    // Special
    paper: '#fdfaf4',
    tintPrimary: 'rgba(168,104,48,0.1)',
    tintAccent: 'rgba(58,90,64,0.08)',
    tintGreen: '#e8f0e4',
    tintYellow: '#f8f0d8',
    tintPeach: '#f8ece0',
    tintBeige: '#f0e8d8',

    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.45)',
    overlayDark: 'rgba(0, 0, 0, 0.55)',
    overlayLight: 'rgba(255, 255, 255, 0.5)',
    shadow: '#5a4a3a',
  },
  fonts: {
    heading: 'Lora_600SemiBold',
    body: 'Lora_400Regular',
  },
  radii: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 24,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#5a4a3a',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 2,
    },
    md: {
      shadowColor: '#5a4a3a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
      elevation: 4,
    },
    lg: {
      shadowColor: '#5a4a3a',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
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
    tight: 1.35,
    normal: 1.55,
    relaxed: 1.75,
  },
  icons: {
    rating: 'compass',
    progress: 'trail',
  },
  tagColors: {
    primary: { bg: '#c89060', text: '#3a3028' },
    gold: { bg: '#c8a840', text: '#3a3028' },
    green: { bg: '#5a8060', text: '#faf5ec' },
    purple: { bg: '#786090', text: '#faf5ec' },
    copper: { bg: '#a87050', text: '#faf5ec' },
    blue: { bg: '#507888', text: '#faf5ec' },
    orange: { bg: '#c08050', text: '#3a3028' },
    teal: { bg: '#508878', text: '#faf5ec' },
    rose: { bg: '#a07068', text: '#faf5ec' },
    slate: { bg: '#686460', text: '#faf5ec' },
  },
};
