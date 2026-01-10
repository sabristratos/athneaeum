import type { Theme, ThemeName } from '@/types/theme';
import { themes } from '@/themes/themes';

export function getTheme(name: ThemeName): Theme {
  return themes[name];
}

/**
 * Convert theme colors to CSS variable format for NativeWind
 */
export function getThemeCSSVars(theme: Theme): Record<string, string> {
  const vars: Record<string, string> = {
    '--color-canvas': theme.colors.canvas,
    '--color-surface': theme.colors.surface,
    '--color-surface-alt': theme.colors.surfaceAlt,
    '--color-surface-hover': theme.colors.surfaceHover,
    '--color-primary': theme.colors.primary,
    '--color-primary-hover': theme.colors.primaryHover,
    '--color-foreground': theme.colors.foreground,
    '--color-foreground-muted': theme.colors.foregroundMuted,
    '--color-foreground-subtle': theme.colors.foregroundSubtle,
    '--color-accent': theme.colors.accent,
    '--color-success': theme.colors.success,
    '--color-danger': theme.colors.danger,
    '--color-warning': theme.colors.warning,
    '--color-on-primary': theme.colors.onPrimary,
    '--color-on-danger': theme.colors.onDanger,
    '--color-border': theme.colors.border,
    '--color-border-hover': theme.colors.borderHover,
    '--color-border-muted': theme.colors.borderMuted,
    '--color-paper': theme.colors.paper,
    '--color-tint-primary': theme.colors.tintPrimary,
    '--color-tint-accent': theme.colors.tintAccent,
  };

  // Optional colors (theme-specific)
  if (theme.colors.primaryDark) vars['--color-primary-dark'] = theme.colors.primaryDark;
  if (theme.colors.primaryGlow) vars['--color-primary-glow'] = theme.colors.primaryGlow;
  if (theme.colors.foregroundFaint) vars['--color-foreground-faint'] = theme.colors.foregroundFaint;
  if (theme.colors.foregroundWarm) vars['--color-foreground-warm'] = theme.colors.foregroundWarm;
  if (theme.colors.accentWarm) vars['--color-accent-warm'] = theme.colors.accentWarm;
  if (theme.colors.accentLight) vars['--color-accent-light'] = theme.colors.accentLight;
  if (theme.colors.tintGreen) vars['--color-tint-green'] = theme.colors.tintGreen;
  if (theme.colors.tintYellow) vars['--color-tint-yellow'] = theme.colors.tintYellow;
  if (theme.colors.tintPeach) vars['--color-tint-peach'] = theme.colors.tintPeach;
  if (theme.colors.tintBeige) vars['--color-tint-beige'] = theme.colors.tintBeige;

  return vars;
}
