import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip } from '@/components';
import { useTheme } from '@/themes';

interface ReaderDNAProps {
  booksRead?: number;
  totalPages?: number;
  favoriteGenre?: string;
  readingPace?: 'slow' | 'moderate' | 'fast';
  preferredTime?: 'morning' | 'afternoon' | 'evening' | 'night';
}

function getPaceLabel(pace?: 'slow' | 'moderate' | 'fast'): string | null {
  switch (pace) {
    case 'slow':
      return 'Slow Burner';
    case 'moderate':
      return 'Steady Reader';
    case 'fast':
      return 'Speed Reader';
    default:
      return null;
  }
}

function getTimeLabel(time?: 'morning' | 'afternoon' | 'evening' | 'night'): string | null {
  switch (time) {
    case 'morning':
      return 'Early Bird';
    case 'afternoon':
      return 'Afternoon Reader';
    case 'evening':
      return 'Evening Reader';
    case 'night':
      return 'Night Owl';
    default:
      return null;
  }
}

export function ReaderDNA({
  booksRead = 0,
  totalPages = 0,
  favoriteGenre,
  readingPace,
  preferredTime,
}: ReaderDNAProps) {
  const { theme } = useTheme();

  const tags: string[] = [];

  if (favoriteGenre) {
    tags.push(`${favoriteGenre} Fan`);
  }

  const paceLabel = getPaceLabel(readingPace);
  if (paceLabel) {
    tags.push(paceLabel);
  }

  const timeLabel = getTimeLabel(preferredTime);
  if (timeLabel) {
    tags.push(timeLabel);
  }

  if (booksRead >= 50) {
    tags.push('Bookworm');
  } else if (booksRead >= 20) {
    tags.push('Avid Reader');
  } else if (booksRead >= 5) {
    tags.push('Growing Library');
  }

  if (totalPages >= 10000) {
    tags.push('Page Turner');
  }

  if (tags.length === 0) {
    return (
      <View style={styles.container}>
        <Text variant="caption" muted style={{ textAlign: 'center' }}>
          Start reading to discover your Reader DNA
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Reader DNA: ${tags.slice(0, 3).join(', ')}`}
    >
      <View style={styles.tagsContainer} importantForAccessibility="no-hide-descendants">
        {tags.slice(0, 3).map((tag, index) => (
          <View
            key={tag}
            style={[
              styles.tag,
              {
                backgroundColor: theme.colors.tintPrimary,
                borderRadius: theme.radii.full,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: theme.colors.primary,
                fontFamily: theme.fonts.body,
              }}
            >
              {tag}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tag: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
