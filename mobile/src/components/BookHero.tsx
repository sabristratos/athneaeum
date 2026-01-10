import React from 'react';
import { View } from 'react-native';
import { CoverImage } from '@/components/CoverImage';
import { Text } from '@/components/Text';
import { Chip } from '@/components/Chip';
import { InteractiveRating } from '@/components/InteractiveRating';
import { useTheme } from '@/themes';
import type { Book, UserBook, BookStatus } from '@/types';

interface BookHeroProps {
  book: Book;
  userBook?: UserBook;
  onRatingChange?: (rating: number) => void;
  showRating?: boolean;
  showStatus?: boolean;
  /** Tag for shared element transitions */
  sharedTransitionTag?: string;
}

const STATUS_VARIANT_MAP: Record<BookStatus, 'primary' | 'success' | 'danger' | 'muted'> = {
  reading: 'primary',
  read: 'success',
  dnf: 'danger',
  want_to_read: 'muted',
};

export function BookHero({
  book,
  userBook,
  onRatingChange,
  showRating = true,
  showStatus = true,
  sharedTransitionTag,
}: BookHeroProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      {/* Cover with themed presentation */}
      <CoverImage
        uri={book.cover_url}
        size="hero"
        fallbackText={book.title}
        parallax={!sharedTransitionTag}
        sharedTransitionTag={sharedTransitionTag}
      />

      {/* Book info */}
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
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

        {/* Metadata row */}
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

        {/* Rating */}
        {showRating && userBook && onRatingChange && (
          <View style={{ marginTop: theme.spacing.sm }}>
            <InteractiveRating
              value={userBook.rating ?? 0}
              onChange={onRatingChange}
              size="lg"
              showValue={false}
            />
          </View>
        )}

        {/* Status badge */}
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
      </View>
    </View>
  );
}
