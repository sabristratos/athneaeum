export type TagColor =
  | 'primary'
  | 'gold'
  | 'green'
  | 'purple'
  | 'copper'
  | 'blue'
  | 'orange'
  | 'teal'
  | 'rose'
  | 'slate';

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: TagColor;
  color_label: string;
  is_system: boolean;
  sort_order: number;
  books_count?: number;
  created_at: string;
  updated_at: string;
}

export type TagFilterMode = 'any' | 'all';

export interface DeletedTagInfo {
  tag: Tag;
  deletedAt: number;
}

export interface TagColorOption {
  value: TagColor;
  label: string;
}

export interface TagColorsMap {
  primary: { bg: string; text: string };
  gold: { bg: string; text: string };
  green: { bg: string; text: string };
  purple: { bg: string; text: string };
  copper: { bg: string; text: string };
  blue: { bg: string; text: string };
  orange: { bg: string; text: string };
  teal: { bg: string; text: string };
  rose: { bg: string; text: string };
  slate: { bg: string; text: string };
}

export const TAG_COLORS: TagColor[] = [
  'primary',
  'gold',
  'green',
  'purple',
  'copper',
  'blue',
  'orange',
  'teal',
  'rose',
  'slate',
];
