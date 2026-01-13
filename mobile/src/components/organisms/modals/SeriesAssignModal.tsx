import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { Text, Button, Card, Icon, Pressable, Input, BottomSheet } from '@/components';
import { useTheme } from '@/themes';
import {
  useSeriesQuery,
  useCreateSeriesMutation,
  useAssignBookToSeriesMutation,
  useRemoveBookFromSeriesMutation,
} from '@/queries';
import { useToast } from '@/stores/toastStore';
import {
  Layers01Icon,
  Add01Icon,
  CheckmarkCircle02Icon,
  Search01Icon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import type { Series, Book } from '@/types';

interface SeriesAssignModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  book: Book;
  currentSeries: Series | null;
  currentVolumeNumber: number | null;
}

export function SeriesAssignModal({
  visible,
  onClose,
  onSuccess,
  book,
  currentSeries,
  currentVolumeNumber,
}: SeriesAssignModalProps) {
  const { theme, themeName } = useTheme();
  const toast = useToast();
  const isScholar = themeName === 'scholar';

  const { data: allSeries, isLoading: loadingSeries } = useSeriesQuery();
  const createSeriesMutation = useCreateSeriesMutation();
  const assignBookMutation = useAssignBookToSeriesMutation();
  const removeBookMutation = useRemoveBookFromSeriesMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(currentSeries);
  const [volumeNumber, setVolumeNumber] = useState<string>(
    currentVolumeNumber?.toString() ?? '1'
  );
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSeriesTitle, setNewSeriesTitle] = useState('');

  useEffect(() => {
    if (visible) {
      setSelectedSeries(currentSeries);
      setVolumeNumber(currentVolumeNumber?.toString() ?? '1');
      setIsCreatingNew(false);
      setNewSeriesTitle('');
      setSearchQuery('');
    }
  }, [visible, currentSeries, currentVolumeNumber]);

  const filteredSeries = useMemo(() => {
    if (!allSeries) return [];
    if (!searchQuery.trim()) return allSeries;

    const query = searchQuery.toLowerCase().trim();
    return allSeries.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.author.toLowerCase().includes(query)
    );
  }, [allSeries, searchQuery]);

  const handleAssign = async () => {
    const volNum = parseInt(volumeNumber, 10);
    if (isNaN(volNum) || volNum < 1) {
      toast.danger('Please enter a valid volume number');
      return;
    }

    try {
      if (isCreatingNew) {
        if (!newSeriesTitle.trim()) {
          toast.danger('Please enter a series title');
          return;
        }

        const newSeries = await createSeriesMutation.mutateAsync({
          title: newSeriesTitle.trim(),
          author: book.author,
        });

        await assignBookMutation.mutateAsync({
          seriesId: newSeries.id,
          bookId: book.id,
          volumeNumber: volNum,
          volumeTitle: book.title,
        });

        toast.success(`Added to new series "${newSeriesTitle.trim()}"`);
      } else if (selectedSeries) {
        await assignBookMutation.mutateAsync({
          seriesId: selectedSeries.id,
          bookId: book.id,
          volumeNumber: volNum,
          volumeTitle: book.title,
        });

        toast.success(`Added to "${selectedSeries.title}" as #${volNum}`);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      toast.danger('Failed to assign to series');
    }
  };

  const handleRemoveFromSeries = async () => {
    if (!currentSeries) return;

    try {
      await removeBookMutation.mutateAsync({
        seriesId: currentSeries.id,
        bookId: book.id,
      });
      toast.success('Removed from series');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.danger('Failed to remove from series');
    }
  };

  const isAssigning =
    createSeriesMutation.isPending ||
    assignBookMutation.isPending ||
    removeBookMutation.isPending;

  const canSave = isCreatingNew
    ? newSeriesTitle.trim().length > 0 && volumeNumber.length > 0
    : selectedSeries !== null && volumeNumber.length > 0;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={isScholar ? 'Series Assignment' : 'Add to Series'}
    >
      <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
        {currentSeries && (
          <Card
            variant="outlined"
            padding="md"
            style={{
              backgroundColor: theme.colors.primarySubtle,
              borderColor: theme.colors.primary,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <Icon icon={Layers01Icon} size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
                  Currently in
                </Text>
                <Text variant="body" style={{ fontWeight: '600' }}>
                  {currentSeries.title} #{currentVolumeNumber}
                </Text>
              </View>
              <Pressable onPress={handleRemoveFromSeries} haptic="medium">
                <View
                  style={{
                    padding: theme.spacing.sm,
                    borderRadius: theme.radii.sm,
                    backgroundColor: theme.colors.dangerSubtle,
                  }}
                >
                  <Icon icon={Delete02Icon} size={18} color={theme.colors.danger} />
                </View>
              </Pressable>
            </View>
          </Card>
        )}

        {loadingSeries ? (
          <View style={{ alignItems: 'center', padding: theme.spacing.lg }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radii.md,
                paddingHorizontal: theme.spacing.md,
                gap: theme.spacing.sm,
              }}
            >
              <Icon icon={Search01Icon} size={18} color={theme.colors.foregroundMuted} />
              <TextInput
                placeholder={isScholar ? 'Search series...' : 'Find a series...'}
                placeholderTextColor={theme.colors.foregroundMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={{
                  flex: 1,
                  paddingVertical: theme.spacing.md,
                  color: theme.colors.foreground,
                  fontSize: 16,
                }}
              />
            </View>

            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              {filteredSeries.length > 0
                ? isScholar
                  ? 'Select existing or create new:'
                  : 'Pick a series or create new:'
                : isScholar
                  ? 'Create a new series:'
                  : 'No series found - create one:'}
            </Text>

            <ScrollView
              style={{ maxHeight: 200 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ gap: theme.spacing.sm }}>
                {filteredSeries.map((series) => (
                  <Pressable
                    key={series.id}
                    onPress={() => {
                      setSelectedSeries(series);
                      setIsCreatingNew(false);
                    }}
                    haptic="light"
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
                        <Text variant="body" style={{ fontWeight: '500' }}>
                          {series.title}
                        </Text>
                        <Text variant="caption" muted>
                          {series.author}
                          {series.book_count ? ` · ${series.book_count} books` : ''}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}

                <Pressable
                  onPress={() => {
                    setSelectedSeries(null);
                    setIsCreatingNew(true);
                  }}
                  haptic="light"
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
                    <Text
                      variant="body"
                      style={{
                        fontWeight: '500',
                        color: isCreatingNew ? theme.colors.primary : theme.colors.foreground,
                      }}
                    >
                      {isScholar ? 'Create New Series' : 'Create a new series'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </ScrollView>

            {isCreatingNew && (
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                  Series Title
                </Text>
                <Input
                  placeholder="Enter series name..."
                  value={newSeriesTitle}
                  onChangeText={setNewSeriesTitle}
                />
              </View>
            )}

            <View style={{ gap: theme.spacing.sm }}>
              <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
                {isScholar ? 'Volume Number' : 'Book Number'}
              </Text>
              <View style={{ width: 100 }}>
                <Input
                  placeholder="#"
                  value={volumeNumber}
                  onChangeText={setVolumeNumber}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button variant="ghost" size="lg" onPress={onClose} fullWidth>
              Cancel
            </Button>
          </View>
          <View style={{ flex: 2 }}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleAssign}
              loading={isAssigning}
              disabled={isAssigning || loadingSeries || !canSave}
              fullWidth
            >
              {currentSeries
                ? isScholar
                  ? 'Update Assignment'
                  : 'Update'
                : isCreatingNew
                  ? isScholar
                    ? 'Create & Assign'
                    : 'Create & Add'
                  : isScholar
                    ? 'Assign to Series'
                    : 'Add to Series'}
            </Button>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}
