import React, { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, {
  useAnimatedRef,
  measure,
  runOnUI,
  runOnJS,
  type AnimatedRef,
} from 'react-native-reanimated';
import { Text, Card, Pressable, Progress } from '@/components';
import { useTheme } from '@/themes';
import { componentSizes, sharedSpacing } from '@/themes/shared';
import { useSharedElementStore, HERO_COVER } from '@/stores/sharedElementStore';
import type { UserBook } from '@/types';
import type { MainStackParamList } from '@/navigation/MainNavigator';

interface CurrentReadsSectionProps {
  books: UserBook[];
  onContinueReading?: (book: UserBook) => void;
}

interface CurrentReadCardProps {
  book: UserBook;
  onPress: () => void;
  coverRef: AnimatedRef<Animated.View>;
}

const NAVIGATION_DELAY = 16;

function CurrentReadCard({ book, onPress, coverRef }: CurrentReadCardProps) {
  const { theme } = useTheme();
  const progress = book.progress_percentage ?? 0;

  const { isTransitioning, userBookId } = useSharedElementStore();
  const isThisItemTransitioning = isTransitioning && userBookId === book.id;

  const accessibilityLabel = `${book.book.title}${book.book.author ? ` by ${book.book.author}` : ''}. ${Math.round(progress)}% complete`;

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to view book details"
      accessibilityRole="button"
    >
      <Card variant="elevated" padding="sm" style={{ width: 140 }}>
        <View style={styles.cardContent}>
          <Animated.View
            ref={coverRef}
            collapsable={false}
            style={{ opacity: isThisItemTransitioning ? 0 : 1 }}
          >
            {book.book.cover_url ? (
              <Image
                source={{ uri: book.book.cover_url }}
                style={[
                  styles.cover,
                  { borderRadius: theme.radii.sm },
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
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
                <Text variant="caption" muted style={{ textAlign: 'center' }}>
                  No Cover
                </Text>
              </View>
            )}
          </Animated.View>

          <Text
            variant="caption"
            numberOfLines={2}
            style={{ marginTop: theme.spacing.xs }}
          >
            {book.book.title}
          </Text>

          <View style={{ marginTop: theme.spacing.xs }}>
            <Progress value={progress} size="sm" />
            <Text
              variant="caption"
              muted
              style={{ fontSize: 10, marginTop: 2 }}
            >
              {Math.round(progress)}% complete
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function CurrentReadCardWrapper({
  book,
  onContinueReading,
}: {
  book: UserBook;
  onContinueReading?: (book: UserBook) => void;
}) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const coverRef = useAnimatedRef<Animated.View>();
  const { startForwardTransition, registerListItemPosition } = useSharedElementStore();

  const processAndNavigate = useCallback(
    (measured: { pageX: number; pageY: number; width: number; height: number } | null) => {
      if (!measured || measured.width === 0) {
        navigation.navigate('BookDetail', { userBook: book });
        return;
      }

      const heroX = sharedSpacing.lg;
      const headerHeight = componentSizes.headerHeight;
      const heroY = insets.top + headerHeight + sharedSpacing.lg;

      const sourcePosition = {
        x: measured.pageX,
        y: measured.pageY,
        width: measured.width,
        height: measured.height,
      };
      const targetPosition = {
        x: heroX,
        y: heroY,
        width: HERO_COVER.width,
        height: HERO_COVER.height,
      };

      registerListItemPosition(book.id, sourcePosition);
      startForwardTransition(
        sourcePosition,
        targetPosition,
        book.book.cover_url || '',
        book.id
      );

      setTimeout(() => {
        navigation.navigate('BookDetail', { userBook: book });
      }, NAVIGATION_DELAY);
    },
    [book, navigation, startForwardTransition, registerListItemPosition, insets.top]
  );

  const handlePress = useCallback(() => {
    if (onContinueReading) {
      onContinueReading(book);
      return;
    }

    runOnUI(() => {
      'worklet';
      const measured = measure(coverRef);
      runOnJS(processAndNavigate)(measured);
    })();
  }, [coverRef, processAndNavigate, onContinueReading, book]);

  return (
    <CurrentReadCard
      book={book}
      onPress={handlePress}
      coverRef={coverRef}
    />
  );
}

export function CurrentReadsSection({ books, onContinueReading }: CurrentReadsSectionProps) {
  const { theme } = useTheme();

  if (books.length === 0) {
    return (
      <View>
        <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
          Currently Reading
        </Text>
        <Card variant="outlined" padding="lg">
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            No books in progress.{'\n'}Start reading to see your current books here.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Currently Reading
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: theme.spacing.sm }}
      >
        {books.map((book) => (
          <CurrentReadCardWrapper
            key={book.id}
            book={book}
            onContinueReading={onContinueReading}
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
    width: 80,
    height: 120,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
