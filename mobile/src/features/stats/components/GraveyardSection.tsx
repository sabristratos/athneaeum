import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Card } from '@/components/organisms/cards/Card';
import { HistogramChart } from '@/components/organisms/charts/HistogramChart';
import { useTheme } from '@/themes';
import type { DnfAnalyticsData } from '@/types/stats';

interface GraveyardSectionProps {
  data: DnfAnalyticsData | undefined;
}

export const GraveyardSection = memo(function GraveyardSection({
  data,
}: GraveyardSectionProps) {
  const { theme } = useTheme();

  if (!data || data.total_books === 0) {
    return null;
  }

  const chartData = data.abandonment_points.map((point) => ({
    label: point.range,
    value: point.count,
  }));

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
        The Graveyard
      </Text>
      <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
        DNF analysis
      </Text>

      <View style={[styles.statsRow, { gap: theme.spacing.md, marginBottom: theme.spacing.lg }]}>
        <View style={styles.statItem}>
          <Text variant="h2" style={{ color: theme.colors.danger }}>
            {data.total_dnf}
          </Text>
          <Text variant="caption" muted>
            Books DNF&apos;d
          </Text>
        </View>
        <View
          style={[styles.divider, { backgroundColor: theme.colors.border }]}
        />
        <View style={styles.statItem}>
          <Text variant="h2" style={{ color: theme.colors.foregroundMuted }}>
            {data.dnf_rate.toFixed(1)}%
          </Text>
          <Text variant="caption" muted>
            Abandonment Rate
          </Text>
        </View>
      </View>

      {chartData.some((d) => d.value > 0) && (
        <View style={{ marginBottom: theme.spacing.md }}>
          <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm, textAlign: 'center' }}>
            When you abandon books
          </Text>
          <HistogramChart data={chartData} />
        </View>
      )}

      {data.patterns.length > 0 && (
        <View
          style={[
            styles.patternsBox,
            {
              backgroundColor: theme.colors.dangerSubtle,
              borderRadius: theme.radii.md,
              padding: theme.spacing.sm,
            },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.danger, marginBottom: 4 }}>
            Patterns Detected
          </Text>
          {data.patterns.map((pattern, index) => (
            <Text key={index} variant="caption">
              {pattern.label}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: '80%',
  },
  patternsBox: {},
});
