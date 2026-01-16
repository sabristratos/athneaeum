import React, { memo, useCallback } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { Pressable, Text } from '@/components';
import { useTheme } from '@/themes';
import type { CatalogBook } from '@/types/discovery';

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;

interface DiscoveryBookCardProps {
  book: CatalogBook;
  onPress: () => void;
}

function DiscoveryBookCardComponent({ book, onPress }: DiscoveryBookCardProps) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.card, { borderRadius: theme.radii.md }]}>
        {book.cover_url ? (
          <Image
            source={{ uri: book.cover_url }}
            style={[styles.cover, { borderRadius: theme.radii.md }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cover,
              styles.placeholder,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <Text
              variant="caption"
              numberOfLines={3}
              style={{ textAlign: 'center', paddingHorizontal: 8 }}
            >
              {book.title}
            </Text>
          </View>
        )}
        <View style={styles.info}>
          <Text variant="caption" numberOfLines={1} style={styles.title}>
            {book.title}
          </Text>
          {book.author && (
            <Text
              variant="caption"
              numberOfLines={1}
              style={{ color: theme.colors.foregroundMuted }}
            >
              {book.author}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const DiscoveryBookCard = memo(DiscoveryBookCardComponent);

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
  },
  cover: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    marginTop: 8,
    gap: 2,
  },
  title: {
    fontWeight: '600',
  },
});
