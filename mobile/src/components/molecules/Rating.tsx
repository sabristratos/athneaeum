import React from 'react';
import { View } from 'react-native';
import { Text, RatingIcon, type RatingIconType } from '@/components/atoms';
import { useTheme } from '@/themes';
import { iconSizes, sharedSpacing } from '@/themes/shared';

interface RatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  accessibilityLabel?: string;
}

const sizeMap = {
  sm: iconSizes.sm,
  md: iconSizes.md,
  lg: iconSizes.lg,
};

export function Rating({
  value,
  max = 5,
  size = 'md',
  showValue = true,
  accessibilityLabel,
}: RatingProps) {
  const { theme } = useTheme();
  const iconSize = sizeMap[size];

  const ratingIcon = theme.icons.rating as RatingIconType;
  const fillColor = ratingIcon === 'heart' ? theme.colors.accent : theme.colors.primary;
  const emptyColor = ratingIcon === 'star' ? theme.colors.surfaceHover : theme.colors.border;

  const defaultLabel = `Rating: ${value.toFixed(1)} out of ${max}`;

  return (
    <View
      className="flex-row items-center gap-1"
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? defaultLabel}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fillPercent = Math.max(0, Math.min(1, value - index));
        return (
          <RatingIcon
            key={index}
            type={ratingIcon}
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
