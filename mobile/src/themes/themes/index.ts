import type { Theme, ThemeName } from '@/types/theme';
import { scholarTheme } from '@/themes/themes/scholar';
import { dreamerTheme } from '@/themes/themes/dreamer';
import { wandererTheme } from '@/themes/themes/wanderer';
import { midnightTheme } from '@/themes/themes/midnight';

export const themes: Record<ThemeName, Theme> = {
  scholar: scholarTheme,
  dreamer: dreamerTheme,
  wanderer: wandererTheme,
  midnight: midnightTheme,
};

export { scholarTheme, dreamerTheme, wandererTheme, midnightTheme };
