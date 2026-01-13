import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { booksApi } from '@/api/books';
import { queryKeys } from '@/lib/queryKeys';
import {
  calculateHeatmapData,
  calculateFormatVelocity,
} from '@/services/LocalStatsService';
import type {
  HeatmapData,
  HeatmapDay,
  FormatVelocityData,
  MoodRingData,
  DnfAnalyticsData,
  PageEconomyData,
} from '@/types/stats';

async function fetchHeatmapWithFallback(): Promise<HeatmapData> {
  try {
    return await booksApi.getHeatmap();
  } catch {
    return await calculateHeatmapData();
  }
}

async function fetchFormatVelocityWithFallback(): Promise<FormatVelocityData> {
  try {
    return await booksApi.getFormatVelocity();
  } catch {
    return await calculateFormatVelocity();
  }
}

export function useReaderDNAController() {
  const [selectedMoodId, setSelectedMoodId] = useState<number | string | null>(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState<HeatmapDay | null>(null);

  const heatmapQuery = useQuery({
    queryKey: queryKeys.stats.heatmap(),
    queryFn: fetchHeatmapWithFallback,
    staleTime: 1000 * 60 * 5,
  });

  const formatVelocityQuery = useQuery({
    queryKey: queryKeys.stats.formatVelocity(),
    queryFn: fetchFormatVelocityWithFallback,
    staleTime: 1000 * 60 * 5,
  });

  const moodRingQuery = useQuery({
    queryKey: queryKeys.stats.moodRing(),
    queryFn: booksApi.getMoodRing,
    staleTime: 1000 * 60 * 5,
  });

  const dnfQuery = useQuery({
    queryKey: queryKeys.stats.dnfAnalytics(),
    queryFn: booksApi.getDnfAnalytics,
    staleTime: 1000 * 60 * 5,
  });

  const economyQuery = useQuery({
    queryKey: queryKeys.stats.pageEconomy(),
    queryFn: booksApi.getPageEconomy,
    staleTime: 1000 * 60 * 5,
  });

  useFocusEffect(
    useCallback(() => {
      if (heatmapQuery.isStale) heatmapQuery.refetch();
      if (formatVelocityQuery.isStale) formatVelocityQuery.refetch();
      if (moodRingQuery.isStale) moodRingQuery.refetch();
      if (dnfQuery.isStale) dnfQuery.refetch();
      if (economyQuery.isStale) economyQuery.refetch();
    }, [heatmapQuery, formatVelocityQuery, moodRingQuery, dnfQuery, economyQuery])
  );

  const isLoading = heatmapQuery.isLoading;
  const isRefreshing =
    heatmapQuery.isFetching ||
    formatVelocityQuery.isFetching ||
    moodRingQuery.isFetching ||
    dnfQuery.isFetching ||
    economyQuery.isFetching;

  const sectionLoading = {
    heatmap: heatmapQuery.isLoading,
    formatVelocity: formatVelocityQuery.isLoading,
    moodRing: moodRingQuery.isLoading,
    dnf: dnfQuery.isLoading,
    economy: economyQuery.isLoading,
  };

  const hasError =
    heatmapQuery.isError ||
    formatVelocityQuery.isError ||
    moodRingQuery.isError ||
    dnfQuery.isError ||
    economyQuery.isError;

  const errorMessage = useMemo(() => {
    if (heatmapQuery.error) return 'Failed to load reading activity';
    if (formatVelocityQuery.error) return 'Failed to load format data';
    if (moodRingQuery.error) return 'Failed to load reading mood data';
    if (dnfQuery.error) return 'Failed to load DNF analytics';
    if (economyQuery.error) return 'Failed to load page economy data';
    return null;
  }, [
    heatmapQuery.error,
    formatVelocityQuery.error,
    moodRingQuery.error,
    dnfQuery.error,
    economyQuery.error,
  ]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      heatmapQuery.refetch(),
      formatVelocityQuery.refetch(),
      moodRingQuery.refetch(),
      dnfQuery.refetch(),
      economyQuery.refetch(),
    ]);
  }, [heatmapQuery, formatVelocityQuery, moodRingQuery, dnfQuery, economyQuery]);

  const totalPagesRead = heatmapQuery.data?.total_pages_read ?? 0;
  const totalBooksCompleted = heatmapQuery.data?.total_books_completed ?? 0;

  const moodChartData = useMemo(() => {
    const genres = moodRingQuery.data?.by_genres ?? [];
    const colors = [
      '#8b2e2e',
      '#a35c5c',
      '#b88a8a',
      '#d4b8b8',
      '#5a9e55',
      '#7ab377',
      '#9ec49b',
      '#c5d5c0',
      '#d4a017',
      '#b8860b',
    ];

    return genres.slice(0, 8).map((genre, index) => ({
      id: genre.genre,
      label: genre.genre,
      value: genre.count,
      color: colors[index % colors.length],
    }));
  }, [moodRingQuery.data]);

  const formatVelocityChartData = useMemo(() => {
    const formats = formatVelocityQuery.data?.formats ?? [];
    return formats.map((format) => ({
      label: format.label,
      value: format.pages_per_hour,
      displayValue: `${format.pages_per_hour} pages/hr`,
    }));
  }, [formatVelocityQuery.data]);

  const abandonmentChartData = useMemo(() => {
    const points = dnfQuery.data?.abandonment_points ?? [];
    return points.map((point) => ({
      label: point.range,
      value: point.count,
    }));
  }, [dnfQuery.data]);

  const handleHeatmapDayPress = useCallback((day: HeatmapDay) => {
    setSelectedHeatmapDay(day);
  }, []);

  const handleMoodSegmentPress = useCallback((id: number | string) => {
    setSelectedMoodId((prev) => (prev === id ? null : id));
  }, []);

  return {
    heatmapData: heatmapQuery.data,
    formatVelocityData: formatVelocityQuery.data,
    moodRingData: moodRingQuery.data,
    dnfData: dnfQuery.data,
    economyData: economyQuery.data,

    totalPagesRead,
    totalBooksCompleted,
    moodChartData,
    formatVelocityChartData,
    abandonmentChartData,

    isLoading,
    isRefreshing,
    sectionLoading,
    hasError,
    errorMessage,
    onRefresh,

    selectedMoodId,
    selectedHeatmapDay,
    handleHeatmapDayPress,
    handleMoodSegmentPress,
  };
}
