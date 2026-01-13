import React, { memo } from 'react';
import { G, Rect } from 'react-native-svg';
import { BarSegment } from '@/components/atoms/charts/BarSegment';
import { ChartLabel } from '@/components/atoms/charts/ChartLabel';
import { useTheme } from '@/themes';

interface BarWithLabelProps {
  x: number;
  y: number;
  width: number;
  maxWidth: number;
  height: number;
  label: string;
  value: string;
  color?: string;
  ghostValue?: number;
}

export const BarWithLabel = memo(function BarWithLabel({
  x,
  y,
  width,
  maxWidth,
  height,
  label,
  value,
  color,
  ghostValue,
}: BarWithLabelProps) {
  const { theme } = useTheme();

  const labelHeight = 16;
  const barY = y + labelHeight + 4;

  return (
    <G>
      <ChartLabel
        x={x}
        y={y + labelHeight - 4}
        text={label}
        fontSize={12}
        muted
      />
      <ChartLabel
        x={x + maxWidth}
        y={y + labelHeight - 4}
        text={value}
        fontSize={12}
        textAnchor="end"
        fontWeight="600"
      />
      <Rect
        x={x}
        y={barY}
        width={maxWidth}
        height={height}
        rx={theme.radii.sm}
        fill={theme.colors.muted}
      />
      <BarSegment
        x={x}
        y={barY}
        width={width}
        height={height}
        color={color}
      />
      {ghostValue !== undefined && ghostValue > 0 && (
        <Rect
          x={x + (ghostValue / maxWidth) * maxWidth - 1}
          y={barY}
          width={2}
          height={height}
          fill={theme.colors.foregroundMuted}
          opacity={0.6}
        />
      )}
    </G>
  );
});
