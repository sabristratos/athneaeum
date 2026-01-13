import React, { memo, useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { Card } from '@/components/organisms';
import { ProgressSlider, ProgressModeToggle, type ProgressMode } from '@/components/molecules';

import { useTheme } from '@/themes';

interface InlineProgressWidgetProps {
  currentPage: number;
  totalPages: number;
  onSave: (newPage: number) => Promise<void>;
  pagesReadToday?: number;
}
export const InlineProgressWidget = memo(function InlineProgressWidget({
  currentPage,
  totalPages,
  onSave,
  pagesReadToday = 0,
}: InlineProgressWidgetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [sliderPage, setSliderPage] = useState(currentPage);
  const [progressMode, setProgressMode] = useState<ProgressMode>('pages');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setSliderPage(currentPage);
  }, [currentPage]);
  const hasChanges = sliderPage !== currentPage;
  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    triggerHaptic('success');
    try {
      await onSave(sliderPage);
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, sliderPage, onSave]);
  const handleSliderChange = useCallback((page: number) => {
    setSliderPage(page);
  }, []);
  if (totalPages <= 0) return null;
  return (
    <Card variant="elevated" padding="lg">
      <View style={{ gap: theme.spacing.md }}>
        {/* Header with title and toggle */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text
            variant="label"
            style={{
              color: theme.colors.foregroundMuted,
              textTransform: 'uppercase',
              fontSize: 11,
              letterSpacing: 1,
            }}
          >
            {isScholar ? 'Reading Progress' : 'Your Progress'}
          </Text>
          <ProgressModeToggle
            value={progressMode}
            onChange={setProgressMode}
            size="sm"
          />
        </View>
        {/* Slider */}
        <ProgressSlider
          min={1}
          max={totalPages}
          value={sliderPage}
          onChange={handleSliderChange}
          displayMode={progressMode}
        />
        {/* Footer with badge and save button */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            minHeight: 36,
          }}
        >
          {pagesReadToday > 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.tintPrimary,
                paddingHorizontal: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              }}
            >
              <Text
                variant="caption"
                style={{ color: theme.colors.primary, fontWeight: '600' }}
              >
                +{pagesReadToday} today
              </Text>
            </View>
          ) : (
            <View />
          )}
          {hasChanges && (
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                backgroundColor: theme.colors.primary,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                opacity: saving ? 0.6 : 1,
                ...theme.shadows.sm,
              }}
              accessibilityRole="button"
              accessibilityLabel={saving ? 'Saving progress' : 'Save progress'}
              accessibilityState={{ disabled: saving }}
            >
              <Icon icon={Tick02Icon} size={16} color={theme.colors.onPrimary} />
              <Text
                variant="label"
                style={{
                  color: theme.colors.onPrimary,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {saving ? 'Saving...' : 'Save Progress'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Card>
  );
});
