import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { FavouriteIcon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { Text, Card, Badge, Button, Rating, Icon } from '@/components';
import { STATUS_VARIANT_MAP } from '@/components/constants';
import { useTheme } from '@/themes';
import { coverSizes, sharedSpacing } from '@/themes/shared';
import type { SearchResult, BookStatus, LibraryExternalIdEntry } from '@/types';

const STATUS_LABELS: Record<BookStatus, string> = {
  want_to_read: 'Want to Read',
  reading: 'Reading',
  read: 'Read',
  dnf: 'DNF',
};

export type AuthorPreferenceStatus = 'favorite' | 'excluded' | 'none';

interface SearchResultCardProps {
  item: SearchResult;
  onAddToLibrary: (book: SearchResult, status: BookStatus) => void;
  onPress?: (item: SearchResult, userBookId?: number) => void;
  isAdding: boolean;
  isAdded: boolean;
  libraryInfo?: LibraryExternalIdEntry;
  authorPreference?: AuthorPreferenceStatus;
}

const MAX_DESCRIPTION_LENGTH = 120;

export function SearchResultCard({
  item,
  onAddToLibrary,
  onPress,
  isAdding,
  isAdded,
  libraryInfo,
  authorPreference = 'none',
}: SearchResultCardProps) {
  const { theme } = useTheme();

  const handlePress = () => {
    onPress?.(item, libraryInfo?.user_book_id);
  };
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

  const seriesLabel = item.series_name && item.volume_number
    ? `. Part of ${item.series_name}, book ${item.volume_number}`
    : '';

  const cardAccessibilityLabel = `${item.title} by ${item.author}${
    hasRating ? `. Rating: ${item.average_rating?.toFixed(1)} out of 5` : ''
  }${item.page_count ? `. ${item.page_count} pages` : ''}${
    publishYear ? `. Published ${publishYear}` : ''
  }${seriesLabel}${libraryInfo ? `. In your library: ${STATUS_LABELS[libraryInfo.status]}` : ''}`;

  return (
    <Card
      variant="elevated"
      padding="md"
      style={{ marginBottom: theme.spacing.md, marginHorizontal: 2 }}
      accessible={true}
      accessibilityLabel={cardAccessibilityLabel}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <Pressable
          onPress={handlePress}
          style={{ flexShrink: 0 }}
          accessibilityRole="button"
          accessibilityLabel={`View details for ${item.title}`}
        >
          {item.cover_url ? (
            <Image
              source={{ uri: item.cover_url }}
              style={{
                width: coverSizes.lg.width,
                height: coverSizes.lg.height,
                borderRadius: theme.radii.sm,
                backgroundColor: theme.colors.surfaceAlt,
              }}
              contentFit="cover"
              transition={200}
              accessibilityLabel={`Cover of ${item.title}`}
            />
          ) : (
            <View
              style={{
                width: coverSizes.lg.width,
                height: coverSizes.lg.height,
                borderRadius: theme.radii.sm,
                backgroundColor: theme.colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              accessibilityLabel={`No cover available for ${item.title}`}
            >
              <Text variant="caption" muted>
                No Cover
              </Text>
            </View>
          )}
        </Pressable>

        <View style={{ flex: 1, gap: theme.spacing.xs }}>
          <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel={`${item.title} by ${item.author}. Tap to view details`}
          >
            <Text variant="h3" numberOfLines={2}>
              {item.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.xs, gap: sharedSpacing.xs }}>
              <Text variant="body" muted numberOfLines={1} style={{ flex: 1 }}>
                {item.author}
              </Text>
              {authorPreference === 'favorite' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.primarySubtle,
                    paddingHorizontal: sharedSpacing.xs,
                    paddingVertical: 2,
                    borderRadius: theme.radii.sm,
                    gap: 2,
                  }}
                >
                  <Icon icon={FavouriteIcon} size={12} color={theme.colors.primary} />
                  <Text variant="caption" style={{ color: theme.colors.primary, fontSize: 10 }}>
                    Favorite Author
                  </Text>
                </View>
              )}
              {authorPreference === 'excluded' && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: theme.colors.dangerSubtle,
                    paddingHorizontal: sharedSpacing.xs,
                    paddingVertical: 2,
                    borderRadius: theme.radii.sm,
                    gap: 2,
                  }}
                >
                  <Icon icon={Cancel01Icon} size={12} color={theme.colors.danger} />
                  <Text variant="caption" style={{ color: theme.colors.danger, fontSize: 10 }}>
                    Excluded
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

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

            {item.edition_count != null && item.edition_count > 1 && (
              <Badge variant="muted" size="sm">
                {item.edition_count} editions
              </Badge>
            )}

            {item.series_name && item.volume_number && (
              <Badge variant="accent" size="sm">
                {item.series_name} #{item.volume_number}
              </Badge>
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
              accessibilityRole="button"
              accessibilityLabel={`Book description. ${showFullDescription ? 'Tap to show less' : 'Tap to read more'}`}
            >
              <Text
                variant="caption"
                muted
                numberOfLines={showFullDescription ? undefined : 3}
              >
                {showFullDescription ? item.description : truncatedDescription}
              </Text>
              {(item.description?.length ?? 0) > MAX_DESCRIPTION_LENGTH && (
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
            {libraryInfo ? (
              <Badge variant={STATUS_VARIANT_MAP[libraryInfo.status]}>
                {STATUS_LABELS[libraryInfo.status]}
              </Badge>
            ) : isAdded ? (
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
