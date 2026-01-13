import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Card } from '@/components/organisms/cards/Card';
import { DonutChart } from '@/components/organisms/charts/DonutChart';
import { DonutLegendItem } from '@/components/molecules/charts/DonutLegendItem';
import { SectionSkeleton } from './SectionSkeleton';
import { useTheme } from '@/themes';
import type { MoodRingData, IntensityItem } from '@/types/stats';
import type { ThemeName } from '@/types/theme';

interface MoodRingSectionProps {
  data: MoodRingData | undefined;
  selectedId: number | string | null;
  onSegmentPress: (id: number | string) => void;
  isLoading?: boolean;
}

const MOOD_COLORS: Record<ThemeName, string[]> = {
  scholar: ['#8b2e2e', '#a35c5c', '#6b4423', '#8b6914', '#5c4a6b', '#3d5c6b', '#6b3d5c', '#4a5c3d', '#5c6b3d', '#6b5c3d'],
  dreamer: ['#7d9a82', '#9ec49b', '#b4a7c7', '#c7a7b4', '#a7c7c4', '#c4c7a7', '#c7b4a7', '#a7b4c7', '#c7c4a7', '#a7c4c7'],
  wanderer: ['#d4a017', '#b8860b', '#cd853f', '#daa520', '#8b7355', '#a0522d', '#bc8f8f', '#d2691e', '#deb887', '#f4a460'],
  midnight: ['#6366f1', '#818cf8', '#a5b4fc', '#4f46e5', '#7c3aed', '#8b5cf6', '#3b82f6', '#60a5fa', '#4ade80', '#f472b6'],
};

const INTENSITY_COLORS: Record<ThemeName, Record<string, string>> = {
  scholar: { light: '#6b8e6b', moderate: '#8b7355', dark: '#5c4a6b', intense: '#8b2e2e' },
  dreamer: { light: '#9ec49b', moderate: '#b4a7c7', dark: '#9a8ab4', intense: '#c7a7b4' },
  wanderer: { light: '#deb887', moderate: '#d4a017', dark: '#a0522d', intense: '#8b4513' },
  midnight: { light: '#60a5fa', moderate: '#6366f1', dark: '#7c3aed', intense: '#dc2626' },
};

interface IntensityBarProps {
  intensities: IntensityItem[];
  themeName: ThemeName;
}

const IntensityBar = memo(function IntensityBar({ intensities, themeName }: IntensityBarProps) {
  const { theme } = useTheme();
  const colors = INTENSITY_COLORS[themeName] || INTENSITY_COLORS.scholar;
  const total = intensities.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) return null;

  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text variant="caption" muted style={{ marginBottom: 6 }}>
        Content Intensity
      </Text>
      <View
        style={{
          flexDirection: 'row',
          height: 8,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundColor: theme.colors.muted,
        }}
      >
        {intensities.map((item) => {
          const width = (item.count / total) * 100;
          if (width === 0) return null;
          return (
            <View
              key={item.intensity_key}
              style={{
                width: `${width}%`,
                backgroundColor: colors[item.intensity_key],
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {intensities.map((item) => (
          <View key={item.intensity_key} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors[item.intensity_key],
                marginRight: 4,
              }}
            />
            <Text variant="caption" muted>
              {item.intensity} {item.percentage}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

export const MoodRingSection = memo(function MoodRingSection({
  data,
  selectedId,
  onSegmentPress,
  isLoading = false,
}: MoodRingSectionProps) {
  const { theme, themeName } = useTheme();

  const chartData = useMemo(() => {
    const moods = data?.by_moods ?? [];
    const colors = MOOD_COLORS[themeName] || MOOD_COLORS.scholar;

    return moods.slice(0, 8).map((mood, index) => ({
      id: mood.mood_key,
      label: mood.mood,
      value: mood.count,
      percentage: mood.percentage,
      color: colors[index % colors.length],
    }));
  }, [data, themeName]);

  const totalBooks = useMemo(() => {
    return data?.classification_coverage?.total ?? 0;
  }, [data]);

  const classifiedCount = data?.classification_coverage?.classified ?? 0;

  if (isLoading) {
    return <SectionSkeleton height={280} />;
  }

  if (!data || chartData.length === 0) {
    return null;
  }

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
        Taste DNA
      </Text>
      <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
        Your reading mood profile
      </Text>

      {data.by_intensity && data.by_intensity.length > 0 && (
        <IntensityBar intensities={data.by_intensity} themeName={themeName} />
      )}

      <View style={styles.chartContainer}>
        <DonutChart
          data={chartData}
          size={180}
          strokeWidth={24}
          activeId={selectedId}
          onSegmentPress={(item) => onSegmentPress(item.id)}
          centerText={String(classifiedCount)}
          centerSubtext="analyzed"
        />
      </View>

      <View style={[styles.legend, { gap: theme.spacing.xs }]}>
        {chartData.map((item) => (
          <DonutLegendItem
            key={item.id}
            color={item.color}
            label={item.label}
            percentage={item.percentage}
            count={item.value}
            isActive={selectedId === item.id}
            onPress={() => onSegmentPress(item.id)}
          />
        ))}
      </View>

      {data.seasonal_patterns.length > 0 && (
        <View
          style={[
            styles.seasonalBox,
            {
              backgroundColor: theme.colors.muted,
              borderRadius: theme.radii.md,
              padding: theme.spacing.sm,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          <Text variant="caption" muted style={{ marginBottom: 4 }}>
            Seasonal Pattern
          </Text>
          {data.seasonal_patterns.slice(0, 2).map((pattern) => (
            <Text key={pattern.season} variant="caption">
              In {pattern.label}, you read {pattern.percentage}% {pattern.top_mood}
            </Text>
          ))}
        </View>
      )}

      {data.classification_coverage && data.classification_coverage.percentage < 100 && (
        <Text variant="caption" muted style={{ marginTop: theme.spacing.sm, textAlign: 'center' }}>
          {data.classification_coverage.percentage}% of your library has been analyzed
        </Text>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'column',
  },
  seasonalBox: {},
});
