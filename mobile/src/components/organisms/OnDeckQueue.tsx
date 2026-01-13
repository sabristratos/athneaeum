import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { BookSpine } from '@/components/SpineView/BookSpine';
import { ShelfRail } from '@/components/ShelfRail';
import { useTheme } from '@/themes';
import type { UserBook } from '@/types/book';

export interface OnDeckQueueProps {
  books: UserBook[];
  onReorder: (bookIds: number[]) => void;
  onBookPress?: (book: UserBook) => void;
  maxVisible?: number;
}

export function OnDeckQueue({
  books,
  onReorder,
  onBookPress,
  maxVisible = 15,
}: OnDeckQueueProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const visibleBooks = useMemo(
    () => books.slice(0, maxVisible),
    [books, maxVisible]
  );

  const handleDragEnd = useCallback(
    ({ data }: { data: UserBook[] }) => {
      triggerHaptic('success');
      const bookIds = data.map((book) => book.id);
      onReorder(bookIds);
    },
    [onReorder]
  );

  const renderItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<UserBook>) => {
      return (
        <ScaleDecorator>
          <BookSpine
            book={item.book}
            userBook={item}
            onPress={() => onBookPress?.(item)}
            index={0}
          />
        </ScaleDecorator>
      );
    },
    [onBookPress]
  );

  const keyExtractor = useCallback(
    (item: UserBook) => item.id.toString(),
    []
  );

  if (visibleBooks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text
          variant="body"
          style={{
            color: theme.colors.foregroundMuted,
            textAlign: 'center',
            fontStyle: isScholar ? 'italic' : 'normal',
          }}
        >
          Your TBR pile awaits
        </Text>
        <Text
          variant="caption"
          style={{
            color: theme.colors.foregroundFaint,
            textAlign: 'center',
            marginTop: 4,
          }}
        >
          Add books to your want-to-read list
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          variant="label"
          style={{ color: theme.colors.foregroundMuted }}
        >
          On Deck
        </Text>
        <Text
          variant="caption"
          style={{ color: theme.colors.foregroundFaint }}
        >
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </Text>
      </View>

      <View style={styles.queueContainer}>
        <DraggableFlatList
          data={visibleBooks}
          onDragEnd={handleDragEnd}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          onDragBegin={() => {
            triggerHaptic('heavy');
          }}
        />

        <View style={styles.shelfContainer}>
          <ShelfRail />
        </View>
      </View>

      {books.length > maxVisible && (
        <Text
          variant="caption"
          style={{
            color: theme.colors.foregroundFaint,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          +{books.length - maxVisible} more
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  queueContainer: {
    position: 'relative',
    minHeight: 180,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    alignItems: 'flex-end',
  },
  shelfContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 20,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
});

