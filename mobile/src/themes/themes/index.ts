import type { Theme, ThemeName } from '@/types/theme';
import { scholarTheme } from '@/themes/themes/scholar';
import { dreamerTheme } from '@/themes/themes/dreamer';
import { wandererTheme } from '@/themes/themes/wanderer';

export const themes: Record<ThemeName, Theme> = {
  scholar: scholarTheme,
  dreamer: dreamerTheme,
  wanderer: wandererTheme,
};

export { scholarTheme, dreamerTheme, wandererTheme };
