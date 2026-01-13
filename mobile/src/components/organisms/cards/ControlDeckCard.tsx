import React from 'react';
import { View } from 'react-native';
import { Text, Progress, Divider } from '@/components/atoms';
import { RatingInput } from '@/components/molecules';
import { Card } from './Card';
import { useTheme } from '@/themes';

interface ControlDeckCardProps {
  currentPage: number;
  totalPages: number;
  rating: number | null;
  onRatingChange: (rating: number) => void;
  /** Apply negative margin to overlap with hero section above (default: false) */
  overlapHero?: boolean;
}

export function ControlDeckCard({
  currentPage,
  totalPages,
  rating,
  onRatingChange,
  overlapHero = false,
}: ControlDeckCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const percentage = Math.min(100, (currentPage / totalPages) * 100);

  // Overlap creates "book resting on its record" effect
  const overlapStyle = overlapHero
    ? {
        marginTop: -24,
        zIndex: 1,
      }
    : undefined;

  return (
    <Card variant="elevated" padding="lg" style={overlapStyle}>
      <View style={{ gap: theme.spacing.lg }}>
        {/* Progress Section */}
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              variant="caption"
              style={{
                textTransform: 'uppercase',
                letterSpacing: theme.letterSpacing.wide,
                fontWeight: '700',
                color: theme.colors.foregroundMuted,
              }}
            >
              Page {currentPage}
            </Text>
            <Text
              variant="caption"
              style={{
                textTransform: 'uppercase',
                letterSpacing: theme.letterSpacing.wide,
                fontWeight: '700',
                color: theme.colors.foregroundMuted,
              }}
            >
              {percentage.toFixed(1)}% Complete
            </Text>
          </View>
          <Progress
            value={currentPage}
            max={totalPages}
            size="lg"
            showPercentage={false}
          />
        </View>

        <Divider variant="simple" />

        {/* Rating Section */}
        <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
          <RatingInput
            value={rating ?? 0}
            onChange={onRatingChange}
            size="lg"
            showValue={false}
          />
          <Text
            variant="caption"
            style={{
              textTransform: 'uppercase',
              letterSpacing: theme.letterSpacing.wide,
              fontWeight: '700',
              color: theme.colors.primary,
            }}
          >
            {rating != null && Number(rating) > 0
              ? `${Number(rating).toFixed(2)} / 5.00`
              : 'Tap to Rate'}
          </Text>
        </View>
      </View>
    </Card>
  );
}
