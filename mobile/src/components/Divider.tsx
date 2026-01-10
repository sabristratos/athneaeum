import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';

interface DividerProps {
  variant?: 'simple' | 'ornate';
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingMap = {
  sm: { vertical: sharedSpacing.md },
  md: { vertical: sharedSpacing.lg },
  lg: { vertical: sharedSpacing.xl },
};

function ScholarOrnament({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Diamond shape with small flourishes */}
      <Path
        d="M12 2 L22 12 L12 22 L2 12 Z"
        fill="none"
        stroke={color}
        strokeWidth={1}
      />
      <Circle cx={12} cy={12} r={2} fill={color} />
    </Svg>
  );
}

function DreamerOrnament({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size * 2} height={size} viewBox="0 0 48 24">
      {/* Soft leaf/vine motif */}
      <Path
        d="M24 12 Q18 6, 12 12 Q18 18, 24 12"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M24 12 Q30 6, 36 12 Q30 18, 24 12"
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Circle cx={24} cy={12} r={2} fill={color} />
    </Svg>
  );
}

export function Divider({ variant = 'ornate', spacing = 'md' }: DividerProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { vertical } = spacingMap[spacing];

  const lineColor = theme.colors.border;
  const ornamentColor = isScholar ? theme.colors.primary : theme.colors.accent;

  if (variant === 'simple') {
    return (
      <View
        style={{
          marginVertical: vertical,
          height: 1,
          backgroundColor: lineColor,
          opacity: isScholar ? 0.6 : 0.4,
        }}
      />
    );
  }

  // Ornate variant
  const ornamentSize = isScholar ? 12 : 10;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: vertical,
        gap: theme.spacing.md,
      }}
    >
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: lineColor,
          opacity: isScholar ? 0.6 : 0.3,
        }}
      />
      {isScholar ? (
        <ScholarOrnament color={ornamentColor} size={ornamentSize} />
      ) : (
        <DreamerOrnament color={ornamentColor} size={ornamentSize} />
      )}
      <View
        style={{
          flex: 1,
          height: 1,
          backgroundColor: lineColor,
          opacity: isScholar ? 0.6 : 0.3,
        }}
      />
    </View>
  );
}
