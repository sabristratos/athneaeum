import React, { memo, useCallback } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import Svg, { G, Text as SvgText } from 'react-native-svg';
import { HeatmapCell } from '@/components/atoms/charts/HeatmapCell';
import { useTheme } from '@/themes';
import type { HeatmapDay } from '@/types/stats';

const CELL_SIZE = 10;
const CELL_GAP = 2;
const WEEKS = 53;
const DAYS_IN_WEEK = 7;
const DAY_LABELS = ['', 'M', '', 'W', '', 'F', ''];
const LABEL_WIDTH = 20;

interface HeatmapChartProps {
  days: HeatmapDay[];
  onDayPress?: (day: HeatmapDay) => void;
}

export const HeatmapChart = memo(function HeatmapChart({
  days,
  onDayPress,
}: HeatmapChartProps) {
  const { theme } = useTheme();

  const chartWidth = LABEL_WIDTH + WEEKS * (CELL_SIZE + CELL_GAP);
  const chartHeight = DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP) + 4;

  const handleDayPress = useCallback(
    (day: HeatmapDay) => {
      onDayPress?.(day);
    },
    [onDayPress]
  );

  const renderCells = () => {
    const cells: React.ReactNode[] = [];

    days.forEach((day, index) => {
      const week = Math.floor(index / 7);
      const dayOfWeek = index % 7;

      cells.push(
        <HeatmapCell
          key={day.date}
          x={LABEL_WIDTH + week * (CELL_SIZE + CELL_GAP)}
          y={dayOfWeek * (CELL_SIZE + CELL_GAP)}
          size={CELL_SIZE}
          intensity={day.intensity}
          onPress={() => handleDayPress(day)}
        />
      );
    });

    return cells;
  };

  const renderDayLabels = () => {
    return DAY_LABELS.map((label, index) => (
      <SvgText
        key={index}
        x={6}
        y={index * (CELL_SIZE + CELL_GAP) + CELL_SIZE - 1}
        fontSize={9}
        fill={theme.colors.foregroundMuted}
        textAnchor="start"
      >
        {label}
      </SvgText>
    ));
  };

  const activeDays = days.filter(d => d.intensity > 0).length;
  const totalDays = days.length;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingRight: theme.spacing.md },
      ]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Reading activity heatmap. ${activeDays} active days out of ${totalDays} days shown`}
    >
      <Svg width={chartWidth} height={chartHeight} accessibilityElementsHidden={true}>
        <G>{renderDayLabels()}</G>
        <G>{renderCells()}</G>
      </Svg>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
  },
  contentContainer: {
    paddingVertical: 4,
  },
});
