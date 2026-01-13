import React, { memo } from 'react';
import { Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/themes';

interface ChartLabelProps {
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  color?: string;
  muted?: boolean;
  textAnchor?: 'start' | 'middle' | 'end';
  fontWeight?: 'normal' | 'bold' | '600';
}

export const ChartLabel = memo(function ChartLabel({
  x,
  y,
  text,
  fontSize = 12,
  color,
  muted = false,
  textAnchor = 'start',
  fontWeight = 'normal',
}: ChartLabelProps) {
  const { theme } = useTheme();

  const fill = color || (muted ? theme.colors.foregroundMuted : theme.colors.foreground);

  return (
    <SvgText
      x={x}
      y={y}
      fontSize={fontSize}
      fill={fill}
      textAnchor={textAnchor}
      fontWeight={fontWeight}
      fontFamily={theme.fonts.body}
    >
      {text}
    </SvgText>
  );
});
