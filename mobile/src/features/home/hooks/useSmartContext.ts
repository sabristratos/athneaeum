import { useMemo } from 'react';
import { useThemeName } from '@/stores/themeStore';

export interface SmartContext {
  greeting: string;
  suggestion: string | null;
  isNightMode: boolean;
  shouldSuggestDarkMode: boolean;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function isWeekend(day: number): boolean {
  return day === 0 || day === 6;
}

export function useSmartContext(firstName: string | undefined): SmartContext {
  const themeName = useThemeName();

  return useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const timeOfDay = getTimeOfDay(hour);
    const weekend = isWeekend(day);

    const name = firstName || 'Reader';

    let greeting: string;
    let suggestion: string | null = null;

    switch (timeOfDay) {
      case 'morning':
        greeting = `Good morning, ${name}`;
        suggestion = '15 minutes before work?';
        break;
      case 'afternoon':
        greeting = `Good afternoon, ${name}`;
        suggestion = weekend ? 'Perfect day for reading' : null;
        break;
      case 'evening':
        greeting = `Good evening, ${name}`;
        suggestion = 'Wind down with a chapter?';
        break;
      case 'night':
        greeting = `Late night reading, ${name}?`;
        suggestion = null;
        break;
    }

    const isNightMode = hour >= 21 || hour < 5;
    const shouldSuggestDarkMode = isNightMode && themeName === 'dreamer';

    return {
      greeting,
      suggestion,
      isNightMode,
      shouldSuggestDarkMode,
    };
  }, [firstName, themeName]);
}
