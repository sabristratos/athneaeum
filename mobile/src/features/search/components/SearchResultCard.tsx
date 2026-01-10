import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Text, Card, Badge, Button, Rating } from '@/components';
import { useTheme } from '@/themes';
import { coverSizes, sharedSpacing } from '@/themes/shared';
import type { SearchResult, BookStatus } from '@/types';

interface SearchResultCardProps {
  item: SearchResult;
  onAddToLibrary: (book: SearchResult, status: BookStatus) => void;
  isAdding: boolean;
  isAdded: boolean;
}

const MAX_DESCRIPTION_LENGTH = 120;

export function SearchResultCard({
  item,
  onAddToLibrary,
  isAdding,
  isAdded,
}: SearchResultCardProps) {
  const { theme } = useTheme();
  const [showFullDescription, setShowFullDescription] = useState(false);

  const hasRating =
    item.average_rating != null && item.average_rating > 0;
  const hasDescription = item.description && item.description.length > 0;

  const truncatedDescription =
    hasDescription && item.description!.length > MAX_DESCRIPTION_LENGTH
      ? item.description!.substring(0, MAX_DESCRIPTION_LENGTH).trim() + '...'
      : item.description;

  const publishYear = item.published_date
    ? new Date(item.published_date).getFullYear()
    : null;

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{ marginBottom: theme.spacing.md }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {item.cover_url ? (
          <Image
            source={{ uri: item.cover_url }}
            style={{
              width: coverSizes.md.width + sharedSpacing.sm + sharedSpacing.xxs,
              height: coverSizes.lg.height + sharedSpacing.xl - sharedSpacing.xxs,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={{
              width: coverSizes.md.width + sharedSpacing.sm + sharedSpacing.xxs,
              height: coverSizes.lg.height + sharedSpacing.xl - sharedSpacing.xxs,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" muted>
              No Cover
            </Text>
          </View>
        )}

        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Text variant="h3" numberOfLines={2}>
            {item.title}
          </Text>
          <Text variant="body" muted numberOfLines={1}>
            {item.author}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginTop: sharedSpacing.xxs,
            }}
          >
            {hasRating && (
              <Rating
                value={item.average_rating!}
                size="sm"
                showValue={
                  item.ratings_count != null && item.ratings_count > 0
                }
              />
            )}

            {item.page_count != null && item.page_count > 0 && (
              <Text variant="caption" muted>
                {item.page_count} pages
              </Text>
            )}

            {publishYear !== null && (
              <Text variant="caption" muted>
                {publishYear}
              </Text>
            )}
          </View>

          {Array.isArray(item.genres) && item.genres.length > 0 && (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: sharedSpacing.xs,
                marginTop: sharedSpacing.xs,
              }}
            >
              {item.genres
                .slice(0, 2)
                .filter((genre): genre is string => typeof genre === 'string' && genre.length > 0)
                .map((genre, i) => (
                  <Badge key={i} variant="muted" size="sm">
                    {genre}
                  </Badge>
                ))}
            </View>
          )}

          {hasDescription && (
            <Pressable
              onPress={() => setShowFullDescription(!showFullDescription)}
              style={{ marginTop: theme.spacing.xs }}
            >
              <Text
                variant="caption"
                muted
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {showFullDescription ? item.description : truncatedDescription}
              </Text>
              {item.description!.length > MAX_DESCRIPTION_LENGTH && (
                <Text
                  variant="caption"
                  color="primary"
                  style={{ marginTop: sharedSpacing.xxs }}
                >
                  {showFullDescription ? 'Show less' : 'Read more'}
                </Text>
              )}
            </Pressable>
          )}

          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              marginTop: 'auto',
              paddingTop: theme.spacing.sm,
            }}
          >
            {isAdded ? (
              <Badge variant="success">Added</Badge>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  loading={isAdding}
                  onPress={() => onAddToLibrary(item, 'want_to_read')}
                >
                  Want to Read
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isAdding}
                  onPress={() => onAddToLibrary(item, 'reading')}
                >
                  Reading
                </Button>
              </>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}
