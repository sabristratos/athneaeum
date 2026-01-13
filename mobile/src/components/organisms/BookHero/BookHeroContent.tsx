import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/atoms';
import { Chip, RatingInput } from '@/components/molecules';
import { STATUS_VARIANT_MAP } from '@/components/constants';
import { useTheme } from '@/themes';
import type { Book, UserBook } from '@/types';

export interface BookHeroContentProps {
  book: Book;
  userBook?: UserBook;
  onRatingChange?: (rating: number) => void;
  showRating?: boolean;
  showStatus?: boolean;
}

export function BookHeroContent({
  book,
  userBook,
  onRatingChange,
  showRating = true,
  showStatus = true,
}: BookHeroContentProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <>
      <Text
        variant="h1"
        style={{
          textAlign: 'center',
          lineHeight: isScholar ? 36 : 32,
        }}
      >
        {book.title}
      </Text>

      <Text variant="body" muted style={{ textAlign: 'center' }}>
        {book.author}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xs,
        }}
      >
        {book.page_count != null && book.page_count > 0 && (
          <Text variant="caption" muted>
            {book.page_count} pages
          </Text>
        )}

        {book.published_date && (
          <>
            {book.page_count != null && book.page_count > 0 && (
              <Text variant="caption" muted>
                ·
              </Text>
            )}
            <Text variant="caption" muted>
              {new Date(book.published_date).getFullYear()}
            </Text>
          </>
        )}
      </View>

      {showRating && userBook && onRatingChange && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <RatingInput
            value={userBook.rating ?? 0}
            onChange={onRatingChange}
            size="lg"
            showValue={false}
          />
        </View>
      )}

      {showStatus && userBook && (
        <View style={{ marginTop: theme.spacing.sm }}>
          <Chip
            label={userBook.status_label}
            variant={STATUS_VARIANT_MAP[userBook.status]}
            selected
            size="md"
          />
        </View>
      )}
    </>
  );
}
