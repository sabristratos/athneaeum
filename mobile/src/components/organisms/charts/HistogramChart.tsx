import React, { memo, useMemo, useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Rect, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ChartLabel } from '@/components/atoms/charts/ChartLabel';
import { useTheme } from '@/themes';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface HistogramDataItem {
  label: string;
  value: number;
}

interface HistogramChartProps {
  data: HistogramDataItem[];
  width?: number;
  height?: number;
  barWidth?: number;
}

const BAR_GAP = 12;
const LABEL_HEIGHT = 20;

const AnimatedBar = memo(function AnimatedBar({
  x,
  maxHeight,
  targetHeight,
  width,
  color,
  radius,
}: {
  x: number;
  maxHeight: number;
  targetHeight: number;
  width: number;
  color: string;
  radius: number;
}) {
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    animatedHeight.value = withTiming(targetHeight, { duration: 600 });
  }, [targetHeight, animatedHeight]);

  const animatedProps = useAnimatedProps(() => ({
    height: animatedHeight.value,
    y: maxHeight - animatedHeight.value,
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={radius}
      fill={color}
      animatedProps={animatedProps}
    />
  );
});

export const HistogramChart = memo(function HistogramChart({
  data,
  width = 280,
  height = 120,
  barWidth = 48,
}: HistogramChartProps) {
  const { theme } = useTheme();

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);
  const chartHeight = height - LABEL_HEIGHT;

  const totalBarsWidth = data.length * barWidth + (data.length - 1) * BAR_GAP;
  const startX = (width - totalBarsWidth) / 2;

  const chartDescription = useMemo(() => {
    return data.map(item => `${item.label}: ${item.value}`).join(', ');
  }, [data]);

  return (
    <View
      style={{ width }}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={`Histogram chart. ${chartDescription}`}
    >
      <Svg width={width} height={height} accessibilityElementsHidden={true}>
        <G>
          {data.map((item, index) => {
            const x = startX + index * (barWidth + BAR_GAP);
            const barHeight = (item.value / maxValue) * chartHeight;

            return (
              <G key={item.label}>
                <AnimatedBar
                  x={x}
                  maxHeight={chartHeight}
                  targetHeight={barHeight > 0 ? barHeight : 4}
                  width={barWidth}
                  color={theme.colors.primary}
                  radius={theme.radii.sm}
                />
                <ChartLabel
                  x={x + barWidth / 2}
                  y={height - 4}
                  text={item.label}
                  fontSize={10}
                  textAnchor="middle"
                  muted
                />
                {item.value > 0 && (
                  <ChartLabel
                    x={x + barWidth / 2}
                    y={chartHeight - barHeight - 6}
                    text={String(item.value)}
                    fontSize={10}
                    textAnchor="middle"
                    fontWeight="600"
                  />
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
});
