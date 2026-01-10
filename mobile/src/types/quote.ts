export type QuoteMood =
  | 'inspired'
  | 'thoughtful'
  | 'emotional'
  | 'amused'
  | 'confused'
  | 'intrigued';

export interface Quote {
  id: string;
  userBookId: number;
  text: string;
  pageNumber?: number;
  note?: string;
  mood?: QuoteMood;
  createdAt: string;
}

export const MOOD_OPTIONS: { value: QuoteMood; label: string; emoji: string }[] = [
  { value: 'inspired', label: 'Inspired', emoji: '✨' },
  { value: 'thoughtful', label: 'Thoughtful', emoji: '🤔' },
  { value: 'emotional', label: 'Emotional', emoji: '💫' },
  { value: 'amused', label: 'Amused', emoji: '😄' },
  { value: 'confused', label: 'Confused', emoji: '🌀' },
  { value: 'intrigued', label: 'Intrigued', emoji: '🔍' },
];
