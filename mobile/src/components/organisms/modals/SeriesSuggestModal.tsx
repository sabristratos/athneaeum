import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { Text, Button, Card, Icon, Pressable } from '@/components';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import {
  useFindMatchingSeries,
  useCreateSeriesMutation,
  useAssignBookToSeriesMutation,
  type SeriesMatch,
} from '@/queries';
import { useToast } from '@/stores/toastStore';
import {
  BookOpen01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import type { Series } from '@/types';

const CONFIDENCE_LABELS: Record<SeriesMatch['confidence'], { label: string; color: 'success' | 'warning' | 'muted' }> = {
  exact: { label: 'Exact match', color: 'success' },
  high: { label: 'Good match', color: 'success' },
  medium: { label: 'Possible match', color: 'warning' },
  low: { label: 'Weak match', color: 'muted' },
};

interface SeriesSuggestModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  seriesName: string;
  volumeNumber: number;
  bookId: number;
  bookTitle: string;
  bookAuthor: string;
}

export function SeriesSuggestModal({
  visible,
  onClose,
  onSuccess,
  seriesName,
  volumeNumber,
  bookId,
  bookTitle,
  bookAuthor,
}: SeriesSuggestModalProps) {
  const { theme, themeName } = useTheme();
  const toast = useToast();
  const isScholar = themeName === 'scholar';

  const { matches, isLoading: loadingSeries } = useFindMatchingSeries(seriesName, { maxResults: 5 });
  const createSeriesMutation = useCreateSeriesMutation();
  const assignBookMutation = useAssignBookToSeriesMutation();

  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const highConfidenceMatches = useMemo(
    () => matches.filter((m) => m.confidence !== 'low'),
    [matches]
  );

  const matchesWithConfidence = useMemo(
    () => matches.map((m) => ({ series: m.series, confidence: m.confidence, reason: m.matchReason })),
    [matches]
  );

  useEffect(() => {
    if (visible && highConfidenceMatches.length > 0) {
      setSelectedSeries(highConfidenceMatches[0].series);
      setIsCreatingNew(false);
    } else if (visible) {
      setSelectedSeries(null);
      setIsCreatingNew(true);
    }
  }, [visible, highConfidenceMatches]);

  const handleAssign = async () => {
    try {
      if (isCreatingNew) {
        const newSeries = await createSeriesMutation.mutateAsync({
          title: seriesName,
          author: bookAuthor,
        });

        await assignBookMutation.mutateAsync({
          seriesId: newSeries.id,
          bookId,
          volumeNumber,
          volumeTitle: bookTitle,
        });

        toast.success(`Added to new series "${seriesName}"`);
      } else if (selectedSeries) {
        await assignBookMutation.mutateAsync({
          seriesId: selectedSeries.id,
          bookId,
          volumeNumber,
          volumeTitle: bookTitle,
        });

        toast.success(`Added to "${selectedSeries.title}" as #${volumeNumber}`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.danger('Failed to add to series');
    }
  };

  const isAssigning = createSeriesMutation.isPending || assignBookMutation.isPending;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'Cataloguing Assistant' : 'Series Detected'}
    >
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        <Card variant="outlined" padding="md">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon icon={BookOpen01Icon} size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text variant="body">
                This appears to be <Text style={{ fontWeight: '600' }}>Book {volumeNumber}</Text> of:
              </Text>
              <Text variant="h3" style={{ marginTop: theme.spacing.xs, fontSize: 18 }}>
                {seriesName}
              </Text>
            </View>
          </View>
        </Card>

        {loadingSeries ? (
          <View style={{ alignItems: 'center', padding: theme.spacing.lg }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              {matchesWithConfidence.length > 0 ? 'Add to existing series or create new:' : 'Create new series:'}
            </Text>

            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: theme.spacing.sm }}>
                {matchesWithConfidence.map(({ series, confidence, reason }) => {
                  const confidenceInfo = CONFIDENCE_LABELS[confidence];
                  const isLowConfidence = confidence === 'low';
                  const confidenceColor = confidenceInfo.color === 'success'
                    ? theme.colors.success
                    : confidenceInfo.color === 'warning'
                      ? theme.colors.warning
                      : theme.colors.foregroundMuted;

                  return (
                    <Pressable
                      key={series.id}
                      onPress={() => {
                        setSelectedSeries(series);
                        setIsCreatingNew(false);
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: theme.spacing.md,
                          backgroundColor:
                            selectedSeries?.id === series.id && !isCreatingNew
                              ? theme.colors.primarySubtle
                              : theme.colors.surfaceAlt,
                          borderRadius: theme.radii.md,
                          borderWidth: selectedSeries?.id === series.id && !isCreatingNew ? 2 : 1,
                          borderColor:
                            selectedSeries?.id === series.id && !isCreatingNew
                              ? theme.colors.primary
                              : theme.colors.border,
                          opacity: isLowConfidence ? 0.7 : 1,
                        }}
                      >
                        {selectedSeries?.id === series.id && !isCreatingNew && (
                          <View style={{ marginRight: theme.spacing.sm }}>
                            <Icon
                              icon={CheckmarkCircle02Icon}
                              size={20}
                              color={theme.colors.primary}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                            <Text variant="body" style={{ fontWeight: '500', flex: 1 }}>
                              {series.title}
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 2,
                                paddingHorizontal: theme.spacing.xs,
                                paddingVertical: 2,
                                backgroundColor: confidenceColor + '20',
                                borderRadius: theme.radii.sm,
                              }}
                            >
                              <Text
                                variant="caption"
                                style={{ color: confidenceColor, fontSize: 10 }}
                              >
                                {confidenceInfo.label}
                              </Text>
                            </View>
                          </View>
                          <Text variant="caption" muted>
                            {series.author}
                            {series.book_count ? ` · ${series.book_count} books` : ''}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={() => {
                    setSelectedSeries(null);
                    setIsCreatingNew(true);
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: theme.spacing.md,
                      backgroundColor: isCreatingNew
                        ? theme.colors.primarySubtle
                        : theme.colors.surfaceAlt,
                      borderRadius: theme.radii.md,
                      borderWidth: isCreatingNew ? 2 : 1,
                      borderColor: isCreatingNew ? theme.colors.primary : theme.colors.border,
                      borderStyle: 'dashed',
                    }}
                  >
                    <View style={{ marginRight: theme.spacing.sm }}>
                      <Icon
                        icon={isCreatingNew ? CheckmarkCircle02Icon : Add01Icon}
                        size={20}
                        color={isCreatingNew ? theme.colors.primary : theme.colors.foregroundMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        variant="body"
                        style={{
                          fontWeight: '500',
                          color: isCreatingNew ? theme.colors.primary : theme.colors.foreground,
                        }}
                      >
                        Create "{seriesName}"
                      </Text>
                      <Text variant="caption" muted>
                        New series by {bookAuthor}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="ghost" size="lg" onPress={onClose} fullWidth>
              Skip
            </Button>
          </View>
          <View style={{ flex: 2 }}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleAssign}
              loading={isAssigning}
              disabled={isAssigning || loadingSeries}
              fullWidth
            >
              {isCreatingNew ? 'Create & Add' : 'Add to Series'}
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
