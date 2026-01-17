import React, { useMemo, useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, useTabScreenPadding, VignetteOverlay } from '@/components';
import { ReadingSessionModal } from '@/components/organisms/modals';
import type { MainTabParamList } from '@/navigation/MainNavigator';
import {
  AtmosphericBackground,
  OnDeckQueue,
} from '@/components/organisms';
import { useTheme } from '@/themes';
import { useAuth } from '@/hooks/useAuth';
import {
  useLibrary,
  usePinBook,
  useReorderBooks,
  useLogSession,
} from '@/database/hooks';
import { useReadingStatsQuery } from '@/queries';
import { useToast } from '@/stores/toastStore';
import { usePrimaryBook, useSmartContext } from './hooks';
import {
  StatusStrip,
  ReadingSpotlight,
  EmptySpotlight,
  WeeklyMomentum,
} from './components';
import type { UserBook, BookFormat } from '@/types';

export function HomeScreen() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const tabPadding = useTabScreenPadding();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const toast = useToast();

  const [quickLogVisible, setQuickLogVisible] = useState(false);

  const { books: libraryBooks, loading: libraryLoading } = useLibrary();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useReadingStatsQuery();
  const { logSession } = useLogSession();
  const { pinBook } = usePinBook();
  const { reorderBooks } = useReorderBooks();

  const books: UserBook[] = useMemo(() => {
    return libraryBooks.map(({ userBook, book }) => {
      const pageCount = book.pageCount ?? 0;
      const currentPage = userBook.currentPage ?? 0;
      const progressPercentage = pageCount > 0 ? Math.round((currentPage / pageCount) * 100) : null;

      return {
        id: userBook.serverId ?? 0,
        local_id: userBook.id,
        book_id: book.serverId ?? 0,
        status: userBook.status,
        status_label: userBook.status,
        rating: userBook.rating,
        current_page: currentPage,
        format: (userBook.format as BookFormat) ?? null,
        format_label: userBook.format ?? null,
        price: userBook.price,
        progress_percentage: progressPercentage,
        is_pinned: userBook.isPinned,
        queue_position: userBook.queuePosition,
        review: userBook.review,
        is_dnf: userBook.isDnf,
        dnf_reason: userBook.dnfReason,
        started_at: userBook.startedAt?.toISOString() ?? null,
        finished_at: userBook.finishedAt?.toISOString() ?? null,
        created_at: userBook.createdAt?.toISOString() ?? '',
        updated_at: userBook.updatedAt?.toISOString() ?? '',
        book: {
          id: book.serverId ?? 0,
          external_id: book.externalId,
          external_provider: book.externalProvider,
          series_id: book.serverSeriesId ?? null,
          volume_number: book.volumeNumber ?? null,
          volume_title: book.volumeTitle ?? null,
          title: book.title,
          author: book.author,
          cover_url: book.coverUrl,
          page_count: pageCount,
          height_cm: book.heightCm ?? null,
          width_cm: book.widthCm ?? null,
          thickness_cm: book.thicknessCm ?? null,
          isbn: book.isbn,
          description: book.description,
          genres: book.genresJson ? JSON.parse(book.genresJson) : null,
          published_date: book.publishedDate,
          audience: null,
          audience_label: null,
          intensity: null,
          intensity_label: null,
          moods: null,
          is_classified: false,
          classification_confidence: null,
          created_at: book.createdAt?.toISOString() ?? '',
          updated_at: book.updatedAt?.toISOString() ?? '',
        },
      };
    });
  }, [libraryBooks]);

  const readingBooks = useMemo(
    () => books.filter((b) => b.status === 'reading'),
    [books]
  );

  const wantToReadBooks = useMemo(
    () =>
      books
        .filter((b) => b.status === 'want_to_read')
        .sort((a, b) => (a.queue_position ?? 999) - (b.queue_position ?? 999)),
    [books]
  );

  const recentSessions = stats?.recent_sessions ?? [];

  const { primaryBook, isPinned } = usePrimaryBook(readingBooks, recentSessions);
  const { greeting, isNightMode } = useSmartContext(
    user?.name?.split(' ')[0]
  );

  const handleRefresh = useCallback(() => {
    refetchStats();
  }, [refetchStats]);

  const handleContinueReading = useCallback(() => {
    if (!primaryBook || !primaryBook.local_id) return;
    (navigation as any).navigate('BookDetail', { userBookId: primaryBook.local_id });
  }, [primaryBook, navigation]);

  const handleLogPages = useCallback(() => {
    if (!primaryBook) return;
    setQuickLogVisible(true);
  }, [primaryBook]);

  const handleViewDetails = useCallback(() => {
    if (!primaryBook || !primaryBook.local_id) return;
    (navigation as any).navigate('BookDetail', { userBookId: primaryBook.local_id });
  }, [primaryBook, navigation]);

  const handleQuickLogSave = useCallback(
    async (data: { endPage: number; durationSeconds?: number; notes?: string; date: string }) => {
      if (!primaryBook || !primaryBook.local_id) return;

      const pagesRead = data.endPage - primaryBook.current_page;

      await logSession({
        userBookId: primaryBook.local_id,
        date: data.date,
        pagesRead,
        startPage: primaryBook.current_page,
        endPage: data.endPage,
        durationSeconds: data.durationSeconds,
        notes: data.notes,
      });

      toast.success(`Logged ${pagesRead} pages`, {
        action: {
          label: 'Stats',
          onPress: () => navigation.navigate('ProfileTab'),
        },
      });
      refetchStats();
    },
    [primaryBook, logSession, toast, navigation, refetchStats]
  );

  const handlePinBook = useCallback(async () => {
    if (!primaryBook || !primaryBook.local_id) return;

    try {
      await pinBook(primaryBook.local_id);
      toast.success('Book pinned as featured');
    } catch (error) {
      toast.danger('Failed to pin book');
    }
  }, [primaryBook, pinBook, toast]);

  const handleReorderQueue = useCallback(
    async (bookIds: number[]) => {
      try {
        const localIds = bookIds
          .map((serverId) => {
            const book = books.find((b) => b.id === serverId);
            return book?.local_id;
          })
          .filter((id): id is string => !!id);

        if (localIds.length > 0) {
          await reorderBooks(localIds);
        }
      } catch (error) {
        toast.danger('Failed to reorder queue');
      }
    },
    [books, reorderBooks, toast]
  );

  const handleBrowseLibrary = useCallback(() => {
    navigation.navigate('LibraryTab');
  }, [navigation]);

  const handleExploreDiscovery = useCallback(() => {
    navigation.navigate('DiscoveryTab');
  }, [navigation]);

  const handleBookPress = useCallback(
    (book: UserBook) => {
      if (book.local_id) {
        (navigation as any).navigate('BookDetail', { userBookId: book.local_id });
      }
    },
    [navigation]
  );

  const isLoading = libraryLoading || statsLoading;

  return (
    <AtmosphericBackground
      bookId={primaryBook?.book_id ?? 0}
      coverUrl={primaryBook?.book.cover_url}
      isNightMode={isNightMode}
      glowOpacity={isNightMode ? 0.25 : 0.4}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {isScholar && <VignetteOverlay intensity="light" />}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: theme.spacing.lg,
            gap: theme.spacing.lg,
            paddingBottom: tabPadding.bottom + theme.spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          <View style={styles.header}>
            <Text variant="h1" style={{ color: theme.colors.foreground, fontSize: 28 }}>
              {greeting}
            </Text>
          </View>

          <StatusStrip
            stats={stats ?? null}
            onStreakPress={() => navigation.navigate('ProfileTab')}
          />

          {primaryBook ? (
            <ReadingSpotlight
              book={primaryBook}
              isPinned={isPinned}
              onContinueReading={handleContinueReading}
              onLogPages={handleLogPages}
              onViewDetails={handleViewDetails}
              onLongPress={handlePinBook}
            />
          ) : (
            <EmptySpotlight
              onBrowseLibrary={handleBrowseLibrary}
              onExploreDiscovery={handleExploreDiscovery}
            />
          )}

          <WeeklyMomentum recentSessions={recentSessions} />

          {wantToReadBooks.length > 0 && (
            <OnDeckQueue
              books={wantToReadBooks}
              onReorder={handleReorderQueue}
              onBookPress={handleBookPress}
            />
          )}
        </ScrollView>

        {primaryBook && (
          <ReadingSessionModal
            visible={quickLogVisible}
            onClose={() => setQuickLogVisible(false)}
            onSave={handleQuickLogSave}
            currentPage={primaryBook.current_page}
            totalPages={primaryBook.book.page_count ?? 0}
            bookTitle={primaryBook.book.title}
            bookCover={primaryBook.book.cover_url}
          />
        )}
      </SafeAreaView>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 4,
  },
});
