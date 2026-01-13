import type { ThemeName } from './theme';

export type TierName = 'masterpiece' | 'great' | 'good' | 'okay' | 'meh' | 'skip';

export interface TierDefinition {
  id: TierName;
  label: string;
  minRating: number;
  maxRating: number;
}

export interface TierListBook {
  id: number;
  userBookId: number;
  title: string;
  author: string;
  coverUrl: string | null;
  originalRating: number;
}

export type TierListState = Record<TierName, TierListBook[]>;

export const TIER_DEFINITIONS: TierDefinition[] = [
  { id: 'masterpiece', label: 'Masterpiece', minRating: 5, maxRating: 5 },
  { id: 'great', label: 'Great', minRating: 4, maxRating: 4.5 },
  { id: 'good', label: 'Good', minRating: 3, maxRating: 3.5 },
  { id: 'okay', label: 'Okay', minRating: 2, maxRating: 2.5 },
  { id: 'meh', label: 'Meh', minRating: 1, maxRating: 1.5 },
  { id: 'skip', label: 'Skip', minRating: 0, maxRating: 0.5 },
];

export const TIER_COLORS: Record<TierName, Record<ThemeName, string>> = {
  masterpiece: {
    scholar: '#8b2e2e',
    dreamer: '#5a7560',
    wanderer: '#704520',
    midnight: '#3730a3',
  },
  great: {
    scholar: '#6b4423',
    dreamer: '#6b8870',
    wanderer: '#8b5528',
    midnight: '#4338ca',
  },
  good: {
    scholar: '#5a5a3a',
    dreamer: '#7b9980',
    wanderer: '#a06830',
    midnight: '#4f46e5',
  },
  okay: {
    scholar: '#6a6a5a',
    dreamer: '#8baa90',
    wanderer: '#b07840',
    midnight: '#6366f1',
  },
  meh: {
    scholar: '#7a7a6a',
    dreamer: '#9bbba0',
    wanderer: '#c08850',
    midnight: '#818cf8',
  },
  skip: {
    scholar: '#8a8a7a',
    dreamer: '#abccb0',
    wanderer: '#d09860',
    midnight: '#a5b4fc',
  },
};

export function getTierForRating(rating: number): TierName {
  for (const tier of TIER_DEFINITIONS) {
    if (rating >= tier.minRating && rating <= tier.maxRating) {
      return tier.id;
    }
  }
  return 'skip';
}

export function getTierDefinition(tierName: TierName): TierDefinition {
  return TIER_DEFINITIONS.find((t) => t.id === tierName) ?? TIER_DEFINITIONS[5];
}
