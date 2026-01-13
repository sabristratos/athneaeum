import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components';
import { useTheme } from '@/themes';
import { TierBookItem } from './TierBookItem';
import { TIER_COLORS, type TierDefinition, type TierListBook, type TierName } from '@/types/tierList';

function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#ffffff';
}

interface TierRowProps {
  tier: TierDefinition;
  books: TierListBook[];
  onReorder?: (tierName: TierName, bookIds: number[]) => void;
  onBookPress?: (book: TierListBook, tierName: TierName) => void;
  maxVisible?: number;
}

export function TierRow({
  tier,
  books,
  onReorder,
  onBookPress,
  maxVisible = 8,
}: TierRowProps) {
  const { theme, themeName } = useTheme();
  const tierColor = TIER_COLORS[tier.id][themeName];
  const tierTextColor = useMemo(() => getContrastTextColor(tierColor), [tierColor]);

  const visibleBooks = books.slice(0, maxVisible);
  const overflowCount = books.length - maxVisible;

  const handleDragEnd = useCallback(
    ({ data }: { data: TierListBook[] }) => {
      triggerHaptic('success');
      const allBookIds = [
        ...data.map((b) => b.id),
        ...books.slice(maxVisible).map((b) => b.id),
      ];
      onReorder?.(tier.id, allBookIds);
    },
    [onReorder, books, maxVisible, tier.id]
  );

  const handleBookPress = useCallback(
    (book: TierListBook) => {
      triggerHaptic('light');
      onBookPress?.(book, tier.id);
    },
    [onBookPress, tier.id]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<TierListBook>) => {
      return (
        <ScaleDecorator>
          <Pressable
            onLongPress={drag}
            onPress={() => handleBookPress(item)}
            delayLongPress={150}
            disabled={isActive}
            style={[styles.bookWrapper, isActive && styles.bookActive]}
          >
            <TierBookItem book={item} />
          </Pressable>
        </ScaleDecorator>
      );
    },
    [handleBookPress]
  );

  const keyExtractor = useCallback(
    (item: TierListBook) => item.id.toString(),
    []
  );

  return (
    <View
      style={[
        styles.container,
        {
          borderRadius: theme.radii.md,
          marginBottom: theme.spacing.sm,
          overflow: 'hidden',
        },
      ]}
    >
      <View
        style={[
          styles.labelContainer,
          {
            backgroundColor: tierColor,
            paddingVertical: theme.spacing.md,
            paddingHorizontal: theme.spacing.sm,
          },
        ]}
      >
        <Text
          variant="label"
          style={{
            color: tierTextColor,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {tier.label}
        </Text>
      </View>

      <View
        style={[
          styles.booksContainer,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borders.thin,
            borderLeftWidth: 0,
            borderColor: theme.colors.border,
            minHeight: 110,
          },
        ]}
      >
        {books.length === 0 ? (
          <View style={styles.emptyState}>
            <Text
              variant="caption"
              muted
              emphatic
            >
              No books
            </Text>
          </View>
        ) : onReorder ? (
          <DraggableFlatList
            data={visibleBooks}
            onDragEnd={handleDragEnd}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            onDragBegin={() => triggerHaptic('heavy')}
          />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {visibleBooks.map((book, index) => (
              <View
                key={book.id}
                style={[styles.bookWrapper, index > 0 && { marginLeft: 8 }]}
              >
                <TierBookItem book={book} />
              </View>
            ))}
            {overflowCount > 0 && (
              <View
                style={[
                  styles.overflowIndicator,
                  {
                    backgroundColor: theme.colors.surfaceHover,
                    borderRadius: theme.radii.sm,
                  },
                ]}
              >
                <Text variant="caption" muted>
                  +{overflowCount}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  labelContainer: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  booksContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  bookWrapper: {},
  bookActive: {
    opacity: 0.9,
    transform: [{ scale: 1.05 }],
  },
  emptyState: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 90,
  },
  overflowIndicator: {
    width: 40,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
