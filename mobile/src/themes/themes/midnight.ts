import type { Theme } from '@/types/theme';
import { sharedSpacing } from '@/themes/shared';

export const midnightTheme: Theme = {
  name: 'midnight',
  isDark: true,
  colors: {
    // Base surfaces - deep midnight blues
    canvas: '#0a0e1a',
    surface: '#111827',
    surfaceAlt: '#0d1220',
    surfaceHover: '#1e293b',
    muted: '#1e293b',

    // Borders - subtle silver-blue
    border: '#1e293b',
    borderHover: '#334155',
    borderMuted: '#1a2332',

    // Primary (Celestial silver-blue)
    primary: '#6366f1',
    primaryHover: '#818cf8',
    primaryGlow: 'rgba(99,102,241,0.3)',
    primarySubtle: 'rgba(99,102,241,0.15)',

    // Foreground/Text - Silver and starlight tones
    foreground: '#e2e8f0',
    foregroundMuted: '#94a3b8',
    foregroundSubtle: '#64748b',
    foregroundFaint: '#475569',

    // Accent - Deep cosmic purple
    accent: '#312e81',

    // Semantic
    success: '#22c55e',
    successSubtle: 'rgba(34,197,94,0.15)',
    danger: '#ef4444',
    dangerSubtle: 'rgba(239,68,68,0.15)',
    warning: '#f59e0b',
    warningSubtle: 'rgba(245,158,11,0.15)',

    // On-color (text on colored backgrounds)
    onPrimary: '#ffffff',
    onDanger: '#ffffff',

    // Special
    paper: '#e2e8f0',
    tintPrimary: 'rgba(99,102,241,0.15)',
    tintAccent: 'rgba(49,46,129,0.3)',

    // Overlays & Shadows
    overlay: 'rgba(0, 0, 0, 0.6)',
    overlayDark: 'rgba(0, 0, 0, 0.75)',
    overlayLight: 'rgba(255, 255, 255, 0.4)',
    shadow: '#000000',
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
    '2xl': 20,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    },
    md: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 5,
    },
    lg: {
      shadowColor: '#6366f1',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 8,
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
    bold: '600',
  },
  letterSpacing: {
    tight: -0.25,
    normal: 0,
    wide: 1,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.625,
  },
  icons: {
    rating: 'moon',
    progress: 'ink',
  },
  tagColors: {
    primary: { bg: '#6366f1', text: '#ffffff' },
    gold: { bg: '#fbbf24', text: '#0a0e1a' },
    green: { bg: '#22c55e', text: '#0a0e1a' },
    purple: { bg: '#a855f7', text: '#ffffff' },
    copper: { bg: '#d97706', text: '#0a0e1a' },
    blue: { bg: '#3b82f6', text: '#ffffff' },
    orange: { bg: '#f97316', text: '#0a0e1a' },
    teal: { bg: '#14b8a6', text: '#0a0e1a' },
    rose: { bg: '#f43f5e', text: '#ffffff' },
    slate: { bg: '#64748b', text: '#ffffff' },
  },
};
