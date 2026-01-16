import React, { useCallback, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft01Icon,
  Layers01Icon,
  Tick02Icon,
  Book01Icon,
  Add01Icon,
} from '@hugeicons/core-free-icons';
import { Text, Card, Icon, Button, CoverImage, IconButton } from '@/components';
import { useTheme } from '@/themes';
import { useSeriesDetailQuery } from '@/queries';
import { useLibrary as useWatermelonLibrary, useAddToLibrary, type LibraryBook } from '@/database/hooks';
import { triggerHaptic } from '@/hooks/useHaptic';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import type { UserBook, Book, BookFormat } from '@/types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'SeriesDetail'>;
type SeriesDetailRouteProp = RouteProp<MainStackParamList, 'SeriesDetail'>;

export function SeriesDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SeriesDetailRouteProp>();
  const { seriesId, seriesTitle } = route.params;
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const { data: seriesDetail, isLoading, error } = useSeriesDetailQuery(seriesId);
  const { books: libraryBooks } = useWatermelonLibrary();
  const { addBook: addToLibrary } = useAddToLibrary();

  const libraryBookIds = useMemo(() => {
    return new Set(libraryBooks.map((lb) => lb.book.serverId));
  }, [libraryBooks]);

  const convertToUserBook = useCallback((lb: LibraryBook, bookData: Book): UserBook => {
    const { userBook: ub, book: b } = lb;
    return {
      id: ub.serverId ?? 0,
      local_id: ub.id,
      book_id: b.serverId ?? 0,
      book: bookData,
      status: ub.status,
      status_label: ub.status,
      format: ub.format as BookFormat | null,
      format_label: ub.format,
      rating: ub.rating,
      price: ub.price,
      current_page: ub.currentPage,
      progress_percentage: b.pageCount ? Math.round((ub.currentPage / b.pageCount) * 100) : null,
      is_dnf: ub.isDnf,
      dnf_reason: ub.dnfReason,
      is_pinned: ub.isPinned,
      queue_position: ub.queuePosition,
      review: ub.review,
      started_at: ub.startedAt?.toISOString() ?? null,
      finished_at: ub.finishedAt?.toISOString() ?? null,
      created_at: ub.createdAt?.toISOString() ?? '',
      updated_at: ub.updatedAt?.toISOString() ?? '',
    };
  }, []);

  const getUserBookForBook = useCallback(
    (bookId: number): UserBook | undefined => {
      const lb = libraryBooks.find((lb) => lb.book.serverId === bookId);
      if (!lb) return undefined;
      const bookData = seriesDetail?.books?.find((b) => b.id === bookId);
      if (!bookData) return undefined;
      return convertToUserBook(lb, bookData);
    },
    [libraryBooks, seriesDetail?.books, convertToUserBook]
  );

  const handleBookPress = useCallback(
    (book: Book) => {
      const userBook = getUserBookForBook(book.id);
      if (userBook) {
        navigation.navigate('BookDetail', { userBook });
      }
    },
    [getUserBookForBook, navigation]
  );

  const handleAddBook = useCallback(
    async (book: Book) => {
      try {
        triggerHaptic('medium');
        await addToLibrary({
          externalId: book.external_id ?? '',
          externalProvider: book.external_provider ?? undefined,
          title: book.title,
          author: book.author,
          coverUrl: book.cover_url ?? undefined,
          pageCount: book.page_count ?? undefined,
          isbn: book.isbn ?? undefined,
          description: book.description ?? undefined,
          genres: book.genres?.map((g) => g.name),
          publishedDate: book.published_date ?? undefined,
        }, 'want_to_read');
        triggerHaptic('success');
      } catch {
        triggerHaptic('error');
      }
    },
    [addToLibrary]
  );

  const sortedBooks = useMemo(() => {
    if (!seriesDetail?.books) return [];
    return [...seriesDetail.books].sort((a, b) => {
      const volA = a.volume_number ?? 999;
      const volB = b.volume_number ?? 999;
      return volA - volB;
    });
  }, [seriesDetail?.books]);

  const stats = useMemo(() => {
    if (!sortedBooks.length) return { owned: 0, read: 0, total: 0 };
    let owned = 0;
    let read = 0;
    for (const book of sortedBooks) {
      const userBook = getUserBookForBook(book.id);
      if (userBook) {
        owned++;
        if (userBook.status === 'read') {
          read++;
        }
      }
    }
    return {
      owned,
      read,
      total: seriesDetail?.total_volumes ?? sortedBooks.length,
    };
  }, [sortedBooks, getUserBookForBook, seriesDetail?.total_volumes]);

  const renderBookCard = (book: Book, index: number) => {
    const userBook = getUserBookForBook(book.id);
    const isOwned = !!userBook;
    const isRead = userBook?.status === 'read';

    return (
      <Card
        key={book.id}
        variant="outlined"
        padding="md"
        style={{
          marginBottom: theme.spacing.md,
          borderColor: isRead
            ? theme.colors.success
            : isOwned
            ? theme.colors.primary
            : theme.colors.border,
          borderWidth: isRead || isOwned ? 1.5 : 1,
        }}
      >
        <Pressable
          onPress={() => isOwned && handleBookPress(book)}
          disabled={!isOwned}
        >
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <View style={{ position: 'relative', opacity: isOwned ? 1 : 0.5 }}>
              <CoverImage
                uri={book.cover_url}
                size="md"
                fallbackText={book.title}
              />
              {book.volume_number && (
                <View
                  style={{
                    position: 'absolute',
                    top: -8,
                    left: -8,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: isRead
                      ? theme.colors.success
                      : isOwned
                      ? theme.colors.primary
                      : theme.colors.surfaceAlt,
                    borderWidth: 2,
                    borderColor: theme.colors.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isRead || isOwned ? theme.colors.onPrimary : theme.colors.foregroundMuted,
                      fontWeight: '700',
                      fontSize: 11,
                    }}
                  >
                    {book.volume_number}
                  </Text>
                </View>
              )}
            </View>

            <View style={{ flex: 1, justifyContent: 'center' }}>
              <Text
                variant="body"
                style={{ fontWeight: '600', color: theme.colors.foreground }}
                numberOfLines={2}
              >
                {book.volume_title || book.title}
              </Text>
              {book.volume_title && book.volume_title !== book.title && (
                <Text variant="caption" muted numberOfLines={1}>
                  {book.title}
                </Text>
              )}
              {book.page_count && (
                <Text variant="caption" muted style={{ marginTop: theme.spacing.xs }}>
                  {book.page_count} pages
                </Text>
              )}

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                  marginTop: theme.spacing.sm,
                }}
              >
                {isRead ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.success,
                      borderRadius: theme.radii.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      gap: 4,
                    }}
                  >
                    <Icon icon={Tick02Icon} size={12} color={theme.colors.onPrimary} />
                    <Text style={{ color: theme.colors.onPrimary, fontSize: 10, fontWeight: '700' }}>
                      Read
                    </Text>
                  </View>
                ) : isOwned ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.primary,
                      borderRadius: theme.radii.full,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      gap: 4,
                    }}
                  >
                    <Icon icon={Book01Icon} size={12} color={theme.colors.onPrimary} />
                    <Text style={{ color: theme.colors.onPrimary, fontSize: 10, fontWeight: '700' }}>
                      In Library
                    </Text>
                  </View>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => handleAddBook(book)}
                  >
                    <Icon icon={Add01Icon} size={14} color={theme.colors.foreground} />
                    <Text style={{ marginLeft: 4 }}>Add</Text>
                  </Button>
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !seriesDetail) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
        <View style={{ flex: 1, padding: theme.spacing.lg }}>
          <IconButton
            icon={ArrowLeft01Icon}
            variant="ghost"
            size="md"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text variant="body" muted>
              Failed to load series details
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.canvas }}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.xl,
          }}
        >
          <IconButton
            icon={ArrowLeft01Icon}
            variant="ghost"
            size="md"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          />
          <View style={{ flex: 1 }}>
            <Text variant="h2" numberOfLines={2}>
              {seriesDetail.title}
            </Text>
            <Text variant="body" muted>
              {seriesDetail.author}
            </Text>
          </View>
        </View>

        <Card
          variant="outlined"
          padding="md"
          style={{
            marginBottom: theme.spacing.xl,
            backgroundColor: theme.colors.primarySubtle,
            borderColor: theme.colors.primary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: theme.radii.md,
                backgroundColor: theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon icon={Layers01Icon} size={24} color={theme.colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ color: theme.colors.primary }}>
                    {stats.read}
                  </Text>
                  <Text variant="caption" muted>
                    {isScholar ? 'Completed' : 'Read'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ color: theme.colors.foreground }}>
                    {stats.owned}
                  </Text>
                  <Text variant="caption" muted>
                    {isScholar ? 'Acquired' : 'Owned'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text variant="h3" style={{ color: theme.colors.foregroundMuted }}>
                    {stats.total}
                  </Text>
                  <Text variant="caption" muted>
                    {isScholar ? 'Volumes' : 'Total'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        {seriesDetail.description && (
          <View style={{ marginBottom: theme.spacing.xl }}>
            <Text variant="label" style={{ marginBottom: theme.spacing.sm }}>
              {isScholar ? 'Synopsis' : 'About'}
            </Text>
            <Text variant="body" muted>
              {seriesDetail.description}
            </Text>
          </View>
        )}

        <Text
          variant="label"
          style={{ marginBottom: theme.spacing.md, color: theme.colors.foreground }}
        >
          {isScholar ? 'Volumes in Collection' : 'Books in Series'}
        </Text>

        {sortedBooks.map(renderBookCard)}
      </ScrollView>
    </SafeAreaView>
  );
}
