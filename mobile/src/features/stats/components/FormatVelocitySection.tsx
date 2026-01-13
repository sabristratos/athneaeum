import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Card } from '@/components/organisms/cards/Card';
import { HorizontalBarChart } from '@/components/organisms/charts/HorizontalBarChart';
import { SectionSkeleton } from './SectionSkeleton';
import { useTheme } from '@/themes';
import type { FormatVelocityData } from '@/types/stats';

interface FormatVelocitySectionProps {
  data: FormatVelocityData | undefined;
  isLoading?: boolean;
}

export const FormatVelocitySection = memo(function FormatVelocitySection({
  data,
  isLoading = false,
}: FormatVelocitySectionProps) {
  const { theme } = useTheme();

  if (isLoading) {
    return <SectionSkeleton height={120} />;
  }

  if (!data || data.formats.length === 0) {
    return null;
  }

  const chartData = data.formats.map((format) => ({
    label: format.label,
    value: format.pages_per_hour,
    displayValue: `${format.pages_per_hour} pages/hr`,
  }));

  const formatLabels: Record<string, string> = {
    physical: 'Physical',
    ebook: 'E-book',
    audiobook: 'Audiobook',
  };

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
        Format Friction
      </Text>
      <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
        Your reading velocity by format
      </Text>

      <HorizontalBarChart
        data={chartData}
        showGhostLine
        ghostValue={data.average_velocity}
      />

      {data.fastest_format && (
        <View
          style={[
            styles.insightBox,
            {
              backgroundColor: theme.colors.primarySubtle,
              borderRadius: theme.radii.md,
              padding: theme.spacing.sm,
              marginTop: theme.spacing.md,
            },
          ]}
        >
          <Text variant="caption" style={{ color: theme.colors.primary }}>
            You read fastest on {formatLabels[data.fastest_format] || data.fastest_format}
          </Text>
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  insightBox: {
    alignItems: 'center',
  },
});
