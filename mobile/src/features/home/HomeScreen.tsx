import React, { useEffect, useMemo, useCallback } from 'react';
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
import { useLibrary, useReadingStats, useReadingSessions } from '@/hooks/useBooks';
import { useToast } from '@/stores/toastStore';
import { apiClient } from '@/api/client';
import { usePrimaryBook, useSmartContext } from './hooks';
import { StatsDashboard, GoalProgressWidget, CreateShareSection } from './components';

export function HomeScreen() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const tabPadding = useTabScreenPadding();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { user } = useAuth();
  const toast = useToast();

  const { books, loading: libraryLoading, fetchLibrary } = useLibrary();
  const { stats, loading: statsLoading, fetchStats } = useReadingStats();
  const { logSession } = useReadingSessions();

  useEffect(() => {
    fetchLibrary();
    fetchStats();
  }, []);

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
    fetchLibrary();
    fetchStats();
  }, [fetchLibrary, fetchStats]);

  const handleLogSession = useCallback(
    async (endPage: number, durationSeconds?: number) => {
      if (!primaryBook) return;

      await logSession({
        user_book_id: primaryBook.id,
        date: new Date().toISOString().split('T')[0],
        start_page: primaryBook.current_page,
        end_page: endPage,
        duration_seconds: durationSeconds,
      });

      toast.success(`Logged ${endPage - primaryBook.current_page} pages`, {
        action: {
          label: 'Stats',
          onPress: () => navigation.navigate('StatsTab'),
        },
      });
      fetchLibrary();
      fetchStats();
    },
    [primaryBook, logSession, toast, navigation, fetchLibrary, fetchStats]
  );

  const handlePinBook = useCallback(async () => {
    if (!primaryBook) return;

    try {
      await apiClient(`/library/${primaryBook.id}/pin`, {
        method: 'PATCH',
      });
      toast.success('Book pinned as featured');
      fetchLibrary();
    } catch (error) {
      toast.danger('Failed to pin book');
    }
  }, [primaryBook, toast, fetchLibrary]);

  const handleReorderQueue = useCallback(
    async (bookIds: number[]) => {
      try {
        await apiClient('/library/reorder', {
          method: 'PATCH',
          body: { book_ids: bookIds },
        });
        fetchLibrary();
      } catch (error) {
        toast.danger('Failed to reorder queue');
      }
    },
    [toast, fetchLibrary]
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
                stats={stats}
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

          <StatsDashboard stats={stats} loading={statsLoading} />
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
