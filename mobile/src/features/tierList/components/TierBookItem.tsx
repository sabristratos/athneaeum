import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '@/themes';
import type { TierListBook } from '@/types/tierList';

interface TierBookItemProps {
  book: TierListBook;
  size?: 'sm' | 'md';
}

const SIZES = {
  sm: { width: 48, height: 72 },
  md: { width: 60, height: 90 },
};

export function TierBookItem({ book, size = 'md' }: TierBookItemProps) {
  const { theme } = useTheme();
  const dimensions = SIZES[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.width,
          height: dimensions.height,
          borderRadius: theme.radii.sm,
          backgroundColor: theme.colors.surface,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {book.coverUrl ? (
        <Image
          source={{ uri: book.coverUrl }}
          style={[
            styles.cover,
            {
              width: dimensions.width,
              height: dimensions.height,
              borderRadius: theme.radii.sm,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: dimensions.width,
              height: dimensions.height,
              backgroundColor: theme.colors.surfaceHover,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
  },
});
