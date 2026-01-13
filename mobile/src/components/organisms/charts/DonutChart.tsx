import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Text as SvgText } from 'react-native-svg';
import { DonutSegment } from '@/components/atoms/charts/DonutSegment';
import { useTheme } from '@/themes';

interface DonutDataItem {
  id: number | string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDataItem[];
  size?: number;
  strokeWidth?: number;
  activeId?: number | string | null;
  onSegmentPress?: (item: DonutDataItem) => void;
  centerText?: string;
  centerSubtext?: string;
}

export const DonutChart = memo(function DonutChart({
  data,
  size = 180,
  strokeWidth = 24,
  activeId = null,
  onSegmentPress,
  centerText,
  centerSubtext,
}: DonutChartProps) {
  const { theme } = useTheme();

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  const radius = (size - strokeWidth) / 2;

  const segments = useMemo(() => {
    let cumulativeOffset = 0;
    return data.map((item) => {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const segment = {
        ...item,
        percentage,
        offset: cumulativeOffset,
      };
      cumulativeOffset += percentage;
      return segment;
    });
  }, [data, total]);

  const chartDescription = useMemo(() => {
    if (data.length === 0) return 'Empty chart';
    return data.map(item => `${item.label}: ${item.value}`).join(', ');
  }, [data]);

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Donut chart showing ${centerSubtext || 'distribution'}. ${chartDescription}`}
    >
      <Svg width={size} height={size} accessibilityElementsHidden={true}>
        {segments.map((segment) => (
          <DonutSegment
            key={segment.id}
            cx={size / 2}
            cy={size / 2}
            radius={radius}
            strokeWidth={strokeWidth}
            percentage={segment.percentage}
            offset={segment.offset}
            color={segment.color}
            isActive={activeId === segment.id}
            onPress={() => onSegmentPress?.(segment)}
          />
        ))}
        {centerText && (
          <SvgText
            x={size / 2}
            y={size / 2 - 4}
            textAnchor="middle"
            fontSize={24}
            fill={theme.colors.foreground}
            fontWeight="bold"
            fontFamily={theme.fonts.heading}
          >
            {centerText}
          </SvgText>
        )}
        {centerSubtext && (
          <SvgText
            x={size / 2}
            y={size / 2 + 16}
            textAnchor="middle"
            fontSize={12}
            fill={theme.colors.foregroundMuted}
            fontFamily={theme.fonts.body}
          >
            {centerSubtext}
          </SvgText>
        )}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
