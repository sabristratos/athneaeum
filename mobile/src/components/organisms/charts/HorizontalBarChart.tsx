import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Line } from 'react-native-svg';
import { BarWithLabel } from '@/components/molecules/charts/BarWithLabel';
import { useTheme } from '@/themes';

interface BarDataItem {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
}

interface HorizontalBarChartProps {
  data: BarDataItem[];
  maxValue?: number;
  width?: number;
  barHeight?: number;
  showGhostLine?: boolean;
  ghostValue?: number;
}

const BAR_HEIGHT = 12;
const ROW_HEIGHT = 44;
const PADDING = 16;

export const HorizontalBarChart = memo(function HorizontalBarChart({
  data,
  maxValue,
  width = 280,
  barHeight = BAR_HEIGHT,
  showGhostLine = false,
  ghostValue,
}: HorizontalBarChartProps) {
  const { theme } = useTheme();

  const max = useMemo(() => {
    return maxValue ?? Math.max(...data.map((d) => d.value), 1);
  }, [data, maxValue]);

  const chartWidth = width;
  const chartHeight = data.length * ROW_HEIGHT;

  const chartDescription = useMemo(() => {
    return data.map(item => `${item.label}: ${item.displayValue}`).join(', ');
  }, [data]);

  return (
    <View
      style={{ width: chartWidth + PADDING * 2 }}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Bar chart. ${chartDescription}`}
    >
      <Svg
        width={chartWidth + PADDING * 2}
        height={chartHeight}
        accessibilityElementsHidden={true}
      >
        <G x={PADDING}>
          {data.map((item, index) => {
            const barWidth = (item.value / max) * chartWidth;
            const y = index * ROW_HEIGHT;

            return (
              <BarWithLabel
                key={item.label}
                x={0}
                y={y}
                width={barWidth}
                maxWidth={chartWidth}
                height={barHeight}
                label={item.label}
                value={item.displayValue}
                color={item.color || theme.colors.primary}
                ghostValue={showGhostLine && ghostValue ? (ghostValue / max) * chartWidth : undefined}
              />
            );
          })}
          {showGhostLine && ghostValue !== undefined && ghostValue > 0 && (
            <Line
              x1={(ghostValue / max) * chartWidth + PADDING}
              y1={0}
              x2={(ghostValue / max) * chartWidth + PADDING}
              y2={chartHeight}
              stroke={theme.colors.foregroundMuted}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          )}
        </G>
      </Svg>
    </View>
  );
});
