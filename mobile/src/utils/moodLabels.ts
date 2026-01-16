export const MOOD_LABELS: Record<string, string> = {
  adventurous: 'Adventurous',
  romantic: 'Romantic',
  suspenseful: 'Suspenseful',
  humorous: 'Humorous',
  melancholic: 'Melancholic',
  inspirational: 'Inspirational',
  mysterious: 'Mysterious',
  cozy: 'Cozy',
  tense: 'Intense',
  thought_provoking: 'Thought-Provoking',
};

export function formatMood(mood: string): string {
  return (
    MOOD_LABELS[mood] ||
    mood.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}
