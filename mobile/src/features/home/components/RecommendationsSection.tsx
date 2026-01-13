import React from 'react';
import { View, ScrollView, StyleSheet, Image } from 'react-native';
import { Text, Card, Pressable } from '@/components';
import { useTheme } from '@/themes';
import type { SearchResult } from '@/types';

interface RecommendationsSectionProps {
  recommendations?: SearchResult[];
  onBookPress?: (book: SearchResult) => void;
}

function RecommendationCard({ book, onPress }: { book: SearchResult; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress} haptic="light">
      <Card variant="outlined" padding="sm" style={{ width: 120 }}>
        <View style={styles.cardContent}>
          {book.cover_url ? (
            <Image
              source={{ uri: book.cover_url }}
              style={[
                styles.cover,
                { borderRadius: theme.radii.sm },
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.cover,
                styles.coverPlaceholder,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderRadius: theme.radii.sm,
                },
              ]}
            >
              <Text variant="caption" muted style={{ textAlign: 'center', fontSize: 10 }}>
                No Cover
              </Text>
            </View>
          )}

          <Text
            variant="caption"
            numberOfLines={2}
            style={{ marginTop: theme.spacing.xs, fontSize: 11 }}
          >
            {book.title}
          </Text>
          <Text
            variant="caption"
            muted
            numberOfLines={1}
            style={{ fontSize: 10 }}
          >
            {book.author}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

export function RecommendationsSection({ recommendations = [], onBookPress }: RecommendationsSectionProps) {
  const { theme } = useTheme();

  if (recommendations.length === 0) {
    return (
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
          Recommended for You
        </Text>
        <Card variant="outlined" padding="lg">
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            Add more books to get personalized recommendations.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Recommended for You
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {recommendations.map((book) => (
          <RecommendationCard
            key={book.external_id}
            book={book}
            onPress={() => onBookPress?.(book)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    alignItems: 'center',
  },
  cover: {
    width: 70,
    height: 100,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
