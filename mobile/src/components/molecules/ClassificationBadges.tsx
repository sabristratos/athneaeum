import React from 'react';
import { View } from 'react-native';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Button, Text, Icon } from '@/components/atoms';
import { Chip } from './Chip';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { SkeletonShimmer } from '@/animations/components';
import type { Audience, Intensity, Mood } from '@/types';
import {
  UserGroupIcon,
  ChildIcon,
  GraduationScrollIcon,
  User02Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';

export interface ClassificationBadgesProps {
  audience?: Audience | null;
  audienceLabel?: string | null;
  intensity?: Intensity | null;
  intensityLabel?: string | null;
  moods?: Mood[] | null;
  isClassified?: boolean;
  isAnalyzing?: boolean;
  isPending?: boolean;
  confidence?: number | null;
  onAnalyzePress?: () => void;
  compact?: boolean;
}

const CONFIDENCE_THRESHOLD = 0.7;

const MOOD_LABELS: Record<Mood, string> = {
  adventurous: 'Adventurous',
  romantic: 'Romantic',
  suspenseful: 'Suspenseful',
  humorous: 'Humorous',
  melancholic: 'Melancholic',
  inspirational: 'Inspirational',
  mysterious: 'Mysterious',
  cozy: 'Cozy',
  tense: 'Tense',
  thought_provoking: 'Thought-Provoking',
};

const AUDIENCE_ICONS: Record<Audience, IconSvgElement> = {
  adult: UserGroupIcon,
  young_adult: GraduationScrollIcon,
  middle_grade: User02Icon,
  children: ChildIcon,
};

function ClassificationShimmer({ compact = false }: { compact?: boolean }) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={{ gap: compact ? sharedSpacing.sm : sharedSpacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sharedSpacing.sm }}>
        <SkeletonShimmer
          width={90}
          height={28}
          borderRadius={isScholar ? theme.radii.sm : theme.radii.md}
        />
        <SkeletonShimmer
          width={110}
          height={28}
          borderRadius={isScholar ? theme.radii.sm : theme.radii.md}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sharedSpacing.xs }}>
        <SkeletonShimmer
          width={75}
          height={24}
          borderRadius={isScholar ? theme.radii.sm : theme.radii.full}
        />
        <SkeletonShimmer
          width={85}
          height={24}
          borderRadius={isScholar ? theme.radii.sm : theme.radii.full}
        />
        <SkeletonShimmer
          width={95}
          height={24}
          borderRadius={isScholar ? theme.radii.sm : theme.radii.full}
        />
      </View>
    </View>
  );
}

export function ClassificationBadges({
  audience,
  audienceLabel,
  intensity,
  intensityLabel,
  moods,
  isClassified = false,
  isAnalyzing = false,
  isPending = false,
  confidence,
  onAnalyzePress,
  compact = false,
}: ClassificationBadgesProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const isHighConfidence = confidence !== null && confidence !== undefined && confidence >= CONFIDENCE_THRESHOLD;

  const getIntensityColor = (level: Intensity): string => {
    switch (level) {
      case 'light':
        return theme.colors.success;
      case 'moderate':
        return theme.colors.warning;
      case 'dark':
        return '#FF8C00';
      case 'intense':
        return theme.colors.danger;
      default:
        return theme.colors.foregroundMuted;
    }
  };

  const displayMoods = moods?.slice(0, 3) || [];
  const AudienceIcon = audience ? AUDIENCE_ICONS[audience] : null;

  if (isAnalyzing || isPending) {
    return (
      <View style={{ gap: compact ? sharedSpacing.sm : sharedSpacing.md }}>
        <ClassificationShimmer compact={compact} />
        <Text
          style={{
            color: theme.colors.foregroundMuted,
            fontFamily: theme.fonts.body,
            fontSize: 12,
          }}
        >
          {isAnalyzing
            ? isScholar ? 'Analyzing content...' : 'Analyzing...'
            : isScholar ? 'Awaiting classification...' : 'Processing...'}
        </Text>
      </View>
    );
  }

  const hasClassificationData = audience || intensity || displayMoods.length > 0;

  if (isClassified && hasClassificationData && isHighConfidence) {
    return (
      <View style={{ gap: compact ? sharedSpacing.sm : sharedSpacing.md }}>
        {(audience || intensity) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sharedSpacing.sm }}>
            {audience && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceAlt,
                  paddingHorizontal: sharedSpacing.sm,
                  paddingVertical: sharedSpacing.xs,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  gap: sharedSpacing.xs,
                }}
              >
                {AudienceIcon && (
                  <Icon
                    icon={AudienceIcon}
                    size={16}
                    color={theme.colors.foregroundMuted}
                  />
                )}
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {audienceLabel || audience}
                </Text>
              </View>
            )}

            {intensity && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: theme.colors.surfaceAlt,
                  paddingHorizontal: sharedSpacing.sm,
                  paddingVertical: sharedSpacing.xs,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  gap: sharedSpacing.xs,
                }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: getIntensityColor(intensity),
                  }}
                />
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.body,
                  }}
                >
                  {intensityLabel || intensity} {isScholar ? 'Intensity' : 'Content'}
                </Text>
              </View>
            )}
          </View>
        )}

        {displayMoods.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sharedSpacing.xs }}>
            {displayMoods.map((mood) => (
              <Chip
                key={mood}
                label={MOOD_LABELS[mood] || mood}
                variant="muted"
                size="sm"
              />
            ))}
          </View>
        )}
      </View>
    );
  }

  if (!onAnalyzePress) {
    return null;
  }

  return (
    <View style={{ paddingVertical: compact ? sharedSpacing.sm : sharedSpacing.md }}>
      <Button variant="primary-outline" size="md" onPress={onAnalyzePress}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: sharedSpacing.sm }}>
          <Icon icon={SparklesIcon} size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontFamily: theme.fonts.body, fontWeight: '600' }}>
            {isScholar ? 'Analyze Content' : 'Analyze'}
          </Text>
        </View>
      </Button>
    </View>
  );
}
