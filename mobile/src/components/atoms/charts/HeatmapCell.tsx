import React, { memo, useMemo } from 'react';
import { Rect, G } from 'react-native-svg';
import { useTheme } from '@/themes';
import type { ThemeName } from '@/types/theme';

interface HeatmapCellProps {
  x: number;
  y: number;
  size: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  onPress?: () => void;
}

const INTENSITY_COLORS: Record<ThemeName, string[]> = {
  scholar: ['#2a2622', '#5c3d3d', '#8b4545', '#a33a3a', '#8b2e2e'],
  dreamer: ['#f0ebe3', '#c5d5c0', '#9ec49b', '#7ab377', '#5a9e55'],
  wanderer: ['#2a2420', '#5c4a35', '#8b6b45', '#b8860b', '#d4a017'],
  midnight: ['#1e293b', '#3730a3', '#4f46e5', '#6366f1', '#818cf8'],
  dynamic: ['#1e293b', '#3730a3', '#4f46e5', '#6366f1', '#818cf8'],
};

export const HeatmapCell = memo(function HeatmapCell({
  x,
  y,
  size,
  intensity,
  onPress,
}: HeatmapCellProps) {
  const { theme, themeName } = useTheme();

  const fill = useMemo(() => {
    const colors = INTENSITY_COLORS[themeName] || INTENSITY_COLORS.scholar;
    return colors[intensity];
  }, [themeName, intensity]);

  return (
    <G onPress={onPress}>
      <Rect
        x={x}
        y={y}
        width={size}
        height={size}
        rx={theme.radii.xs}
        fill={fill}
      />
    </G>
  );
});
