import React, { useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/atoms/Text';
import { Button } from '@/components/atoms/Button';
import { SegmentedControl } from '@/components/molecules/SegmentedControl';
import { Card } from '@/components/organisms/cards/Card';
import { HeatmapChart } from '@/components/organisms/charts/HeatmapChart';
import { VignetteOverlay } from '@/components/VignetteOverlay';
import { useThemedRefreshControl } from '@/components/ThemedRefreshControl';
import { useTabScreenPadding } from '@/components/layout/TabScreenLayout';
import { useTheme } from '@/themes';
import { useReaderDNAController } from '@/features/stats/hooks/useReaderDNAController';
import {
  StreakDisplay,
  RhythmBadge,
  VolumeMetric,
  FormatVelocitySection,
  MoodRingSection,
  GraveyardSection,
  PageEconomySection,
  CalendarSection,
} from '@/features/stats/components';

type StatsTab = 'dna' | 'calendar';

const TAB_OPTIONS: { key: StatsTab; label: string }[] = [
  { key: 'dna', label: 'Reader DNA' },
  { key: 'calendar', label: 'Calendar' },
];

export function ReaderDNAScreen() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const tabPadding = useTabScreenPadding();
  const [activeTab, setActiveTab] = useState<StatsTab>('dna');

  const {
    heatmapData,
    formatVelocityData,
    moodRingData,
    dnfData,
    economyData,
    totalPagesRead,
    totalBooksCompleted,
    isLoading,
    isRefreshing,
    sectionLoading,
    hasError,
    errorMessage,
    onRefresh,
    selectedMoodId,
    handleHeatmapDayPress,
    handleMoodSegmentPress,
  } = useReaderDNAController();
  const refreshControlProps = useThemedRefreshControl(isRefreshing);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return String(num);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      {themeName === 'scholar' && <VignetteOverlay intensity="light" />}

      <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg }}>
        <Text variant="h2" style={{ marginBottom: theme.spacing.xs }}>
          {isScholar ? 'Reading Analytics' : 'Your Stats'}
        </Text>
        <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
          {isScholar ? 'Insights into your reading habits' : 'Track your reading journey'}
        </Text>

        <SegmentedControl
          options={TAB_OPTIONS}
          selected={activeTab}
          onSelect={setActiveTab}
        />

        {hasError && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: theme.colors.dangerSubtle,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radii.md,
              marginTop: theme.spacing.md,
            }}
          >
            <Text variant="caption" style={{ color: theme.colors.danger, flex: 1 }}>
              {errorMessage || 'Failed to load some data'}
            </Text>
            <View style={{ marginLeft: theme.spacing.sm }}>
              <Button
                variant="ghost"
                size="sm"
                onPress={onRefresh}
              >
                Retry
              </Button>
            </View>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingTop: theme.spacing.md,
          paddingBottom: tabPadding.bottom + theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            {...refreshControlProps}
            onRefresh={onRefresh}
          />
        }
      >
        {activeTab === 'dna' && (
          <>
            {/* Section 1: The Pulse - Heatmap */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
                The Pulse
              </Text>
              <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
                Your reading activity over the past year
              </Text>

              {heatmapData && heatmapData.days.length > 0 && (
                <HeatmapChart
                  days={heatmapData.days}
                  onDayPress={handleHeatmapDayPress}
                />
              )}

              <View style={[styles.pulseStats, { marginTop: theme.spacing.lg }]}>
                <StreakDisplay
                  currentStreak={heatmapData?.current_streak ?? 0}
                  longestStreak={heatmapData?.longest_streak ?? 0}
                />
              </View>

              {heatmapData?.rhythm_label && (
                <View style={[styles.rhythmContainer, { marginTop: theme.spacing.md }]}>
                  <RhythmBadge
                    rhythm={heatmapData.reading_rhythm}
                    label={heatmapData.rhythm_label}
                  />
                </View>
              )}
            </Card>

            {/* Section 2: The Input - Volume Metrics */}
            <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
              <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
                The Input
              </Text>
              <View style={styles.volumeRow}>
                <VolumeMetric
                  label="Pages Read"
                  value={formatNumber(totalPagesRead)}
                  accent
                />
                <VolumeMetric
                  label="Books Completed"
                  value={totalBooksCompleted}
                />
                <VolumeMetric
                  label="Active Days"
                  value={heatmapData?.total_active_days ?? 0}
                />
              </View>
            </Card>

            {/* Section 3: Format Friction */}
            <FormatVelocitySection
              data={formatVelocityData}
              isLoading={sectionLoading.formatVelocity}
            />

            {/* Section 4: Taste DNA (Mood Ring) */}
            <MoodRingSection
              data={moodRingData}
              selectedId={selectedMoodId}
              onSegmentPress={handleMoodSegmentPress}
              isLoading={sectionLoading.moodRing}
            />

            {/* Section 5: The Graveyard (DNF) */}
            <GraveyardSection data={dnfData} />

            {/* Section 6: Page Economy */}
            <PageEconomySection data={economyData} />

            {/* Empty state */}
            {!heatmapData?.days?.length && (
              <View style={{ alignItems: 'center', paddingVertical: theme.spacing.xl }}>
                <Text variant="h3" muted>
                  No Reading Data Yet
                </Text>
                <Text
                  variant="body"
                  muted
                  style={[styles.centerText, { marginTop: theme.spacing.sm }]}
                >
                  Start logging reading sessions to see your Reader DNA profile.
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'calendar' && (
          <CalendarSection />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    textAlign: 'center',
  },
  pulseStats: {},
  rhythmContainer: {
    alignItems: 'center',
  },
  volumeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
