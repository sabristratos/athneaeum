import React from 'react';
import { View } from 'react-native';
import { CoverImage } from '@/components/organisms';
import { useTheme } from '@/themes';
import { BookHeroContent, type BookHeroContentProps } from './BookHeroContent';

export interface BookHeroProps extends BookHeroContentProps {}

export function BookHero({
  book,
  userBook,
  onRatingChange,
  showRating = true,
  showStatus = true,
}: BookHeroProps) {
  const { theme } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.lg }}>
      <CoverImage
        uri={book.cover_url}
        size="hero"
        fallbackText={book.title}
      />

      <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingHorizontal: theme.spacing.lg }}>
        <BookHeroContent
          book={book}
          userBook={userBook}
          onRatingChange={onRatingChange}
          showRating={showRating}
          showStatus={showStatus}
        />
      </View>
    </View>
  );
}
