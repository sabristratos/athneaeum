import React, { useMemo, useCallback } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, useTabScreenPadding, VignetteOverlay } from '@/components';
import type { MainTabParamList } from '@/navigation/MainNavigator';
import { PulseStrip } from '@/components/molecules';
import {
  AtmosphericBackground,
  HeroFlipCard,
  OnDeckQueue,
  LiteraryFeeds,
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
import { StatsDashboard, GoalProgressWidget, CreateShareSection } from './components';
import type { UserBook, ReadingStats, BookFormat } from '@/types';

export function HomeScreen() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const tabPadding = useTabScreenPadding();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const toast = useToast();

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
  const { greeting, suggestion, isNightMode, shouldSuggestDarkMode } = useSmartContext(
    user?.name?.split(' ')[0]
  );

  const handleRefresh = useCallback(() => {
    refetchStats();
  }, [refetchStats]);

  const handleLogSession = useCallback(
    async (endPage: number, durationSeconds?: number) => {
      if (!primaryBook || !primaryBook.local_id) return;

      const pagesRead = endPage - primaryBook.current_page;

      await logSession({
        userBookId: primaryBook.local_id,
        date: new Date().toISOString().split('T')[0],
        pagesRead,
        startPage: primaryBook.current_page,
        endPage,
        durationSeconds,
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
            gap: theme.spacing.xl,
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
            <Text variant="h2" style={{ color: theme.colors.foreground }}>
              {greeting}
            </Text>
            {suggestion && (
              <Text
                variant="body"
                style={{
                  color: theme.colors.foregroundMuted,
                  marginTop: theme.spacing.xs,
                  fontStyle: isScholar ? 'italic' : 'normal',
                }}
              >
                {suggestion}
              </Text>
            )}
          </View>

          {primaryBook ? (
            <View style={styles.heroSection}>
              <HeroFlipCard
                book={primaryBook}
                stats={stats ?? null}
                onLogSession={handleLogSession}
                onLongPress={handlePinBook}
                isLogging={false}
              />
              {isPinned && (
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.primary,
                    textAlign: 'center',
                    marginTop: theme.spacing.sm,
                  }}
                >
                  Pinned
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.emptyHero}>
              <Text
                variant="body"
                style={{
                  color: theme.colors.foregroundMuted,
                  textAlign: 'center',
                  fontStyle: isScholar ? 'italic' : 'normal',
                }}
              >
                Start reading a book to see it here
              </Text>
            </View>
          )}

          <View style={styles.pulseSection}>
            <PulseStrip
              recentSessions={recentSessions}
              streakDays={stats?.current_streak_days ?? 0}
            />
          </View>

          <GoalProgressWidget />

          <CreateShareSection />

          <OnDeckQueue
            books={wantToReadBooks}
            onReorder={handleReorderQueue}
            onBookPress={() => {}}
          />

          <LiteraryFeeds />

          <StatsDashboard stats={stats ?? null} loading={statsLoading} />
        </ScrollView>
      </SafeAreaView>
    </AtmosphericBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
  },
  emptyHero: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  pulseSection: {
    paddingVertical: 8,
  },
});
