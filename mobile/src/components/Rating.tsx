import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import { iconSizes, sharedSpacing } from '@/themes/shared';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  readonly?: boolean;
  onChange?: (value: number) => void;
}

const sizeMap = {
  sm: iconSizes.sm,
  md: iconSizes.md,
  lg: iconSizes.lg,
};

// Star path for Scholar theme
const StarIcon = ({ size, fillPercent, fillColor, emptyColor }: {
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
}) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Empty star background */}
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        fill={emptyColor}
        stroke={emptyColor}
        strokeWidth={1.5}
      />
    </Svg>
    {/* Filled portion overlay */}
    {fillPercent > 0 && (
      <View
        style={{
          position: 'absolute',
          width: size * fillPercent,
          height: size,
          overflow: 'hidden'
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            fill={fillColor}
            stroke={fillColor}
            strokeWidth={1.5}
          />
        </Svg>
      </View>
    )}
  </View>
);

// Heart path for Dreamer theme
const HeartIcon = ({ size, fillPercent, fillColor, emptyColor }: {
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
}) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Empty heart background */}
      <Path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={emptyColor}
        stroke={emptyColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    {/* Filled portion overlay */}
    {fillPercent > 0 && (
      <View
        style={{
          position: 'absolute',
          width: size * fillPercent,
          height: size,
          overflow: 'hidden'
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            fill={fillColor}
            stroke={fillColor}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    )}
  </View>
);

// Compass path for Wanderer theme
const CompassIcon = ({ size, fillPercent, fillColor, emptyColor }: {
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
}) => (
  <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* Empty compass background - circle with 4-point star */}
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l2 5h-4l2-5zm0 14l-2-5h4l-2 5zm-7-7l5-2v4l-5-2zm14 0l-5 2v-4l5 2z"
        fill={emptyColor}
        stroke={emptyColor}
        strokeWidth={0.5}
      />
    </Svg>
    {/* Filled portion overlay */}
    {fillPercent > 0 && (
      <View
        style={{
          position: 'absolute',
          width: size * fillPercent,
          height: size,
          overflow: 'hidden'
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l2 5h-4l2-5zm0 14l-2-5h4l-2 5zm-7-7l5-2v4l-5-2zm14 0l-5 2v-4l5 2z"
            fill={fillColor}
            stroke={fillColor}
            strokeWidth={0.5}
          />
        </Svg>
      </View>
    )}
  </View>
);

export function Rating({
  value,
  max = 5,
  size = 'md',
  showValue = true,
}: RatingProps) {
  const { theme } = useTheme();
  const iconSize = sizeMap[size];

  const ratingIcon = theme.icons.rating;
  const fillColor = ratingIcon === 'heart' ? theme.colors.accent : theme.colors.primary;
  const emptyColor = ratingIcon === 'star' ? theme.colors.surfaceHover : theme.colors.border;

  const IconComponent = ratingIcon === 'star'
    ? StarIcon
    : ratingIcon === 'compass'
      ? CompassIcon
      : HeartIcon;

  return (
    <View className="flex-row items-center gap-1">
      {Array.from({ length: max }).map((_, index) => {
        const fillPercent = Math.max(0, Math.min(1, value - index));
        return (
          <IconComponent
            key={index}
            size={iconSize}
            fillPercent={fillPercent}
            fillColor={fillColor}
            emptyColor={emptyColor}
          />
        );
      })}
      {showValue && (
        <Text
          variant="caption"
          style={{
            marginLeft: sharedSpacing.sm,
            color: theme.colors.foregroundMuted,
            fontFamily: theme.fonts.body,
          }}
        >
          {value.toFixed(2)}
        </Text>
      )}
    </View>
  );
}
