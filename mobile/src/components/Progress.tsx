import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 4,
  md: 6,
  lg: 12,
};

export function Progress({
  value,
  max = 100,
  label,
  showPercentage = true,
  size = 'md',
}: ProgressProps) {
  const { theme } = useTheme();
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const height = sizeMap[size];

  const progressStyle = theme.icons.progress;
  const isInk = progressStyle === 'ink';
  const isTrail = progressStyle === 'trail';

  // Scholar: Ink style - thin, dark track, red fill with subtle glow
  // Dreamer: Liquid style - thicker, white track, pink fill
  // Wanderer: Trail style - dotted track like a map path, copper fill
  const trackColor = isTrail
    ? theme.colors.surfaceAlt
    : isInk
      ? theme.colors.surfaceHover
      : theme.colors.paper;
  const fillColor = isTrail
    ? theme.colors.primary
    : isInk
      ? theme.colors.primary
      : theme.colors.accent;
  const trackBorderColor = isTrail
    ? theme.colors.border
    : isInk
      ? theme.colors.borderMuted
      : theme.colors.border;

  return (
    <View className="w-full">
      {(label || showPercentage) && (
        <View className="flex-row justify-between mb-1">
          {label && (
            <Text
              variant="caption"
              style={{
                fontStyle: isInk ? 'italic' : 'normal',
                color: theme.colors.foregroundMuted,
              }}
            >
              {label}
            </Text>
          )}
          {showPercentage && (
            <Text
              variant="caption"
              style={{
                fontStyle: isInk ? 'italic' : 'normal',
                color: theme.colors.foregroundMuted,
              }}
            >
              {percentage.toFixed(1)}%
            </Text>
          )}
        </View>
      )}

      <View
        style={{
          height,
          backgroundColor: trackColor,
          borderRadius: theme.radii.full,
          borderWidth: isInk || isTrail ? 1 : 0,
          borderColor: trackBorderColor,
          borderStyle: isTrail ? 'dashed' : 'solid',
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: fillColor,
            borderRadius: theme.radii.full,
            // Ink glow effect for Scholar
            ...(isInk && {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }),
            // Trail warm glow for Wanderer
            ...(isTrail && {
              shadowColor: theme.colors.primary,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
            }),
          }}
        />
      </View>
    </View>
  );
}
