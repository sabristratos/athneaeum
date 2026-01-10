import React, { useState } from 'react';
import { View, Pressable, LayoutAnimation } from 'react-native';
import { Text, Button, Badge, RadioGroup } from '@/components';
import { useTheme } from '@/themes';
import { GenreChips } from '@/features/search/components/GenreChips';
import { YearRangeInput } from '@/features/search/components/YearRangeInput';
import type { SearchFilters, MinRating } from '@/types';
import { MIN_RATING_OPTIONS, LANGUAGE_OPTIONS } from '@/types/book';

interface SearchFilterPanelProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  activeFilterCount: number;
}

export function SearchFilterPanel({
  filters,
  onFiltersChange,
  activeFilterCount,
}: SearchFilterPanelProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  const handleGenresChange = (genres: string[]) => {
    onFiltersChange({
      ...filters,
      genres: genres.length > 0 ? genres : undefined,
    });
  };

  const handleMinRatingChange = (value: MinRating) => {
    onFiltersChange({
      ...filters,
      minRating: value === 0 ? undefined : value,
    });
  };

  const handleYearChange = (yearFrom?: number, yearTo?: number) => {
    onFiltersChange({
      ...filters,
      yearFrom,
      yearTo,
    });
  };

  const handleLanguageChange = (value: string) => {
    onFiltersChange({
      ...filters,
      language: value === '' ? undefined : value,
    });
  };

  return (
    <View style={{ marginBottom: theme.spacing.sm }}>
      <Pressable onPress={toggleExpand}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: theme.spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <Text variant="body" muted>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <Badge variant="accent" size="sm">
                {String(activeFilterCount)}
              </Badge>
            )}
          </View>
          <Text variant="caption" color="primary">
            {isExpanded ? 'Hide' : 'Show'}
          </Text>
        </View>
      </Pressable>

      {isExpanded && (
        <View
          style={{
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius: theme.radii.md,
            padding: theme.spacing.md,
            marginTop: theme.spacing.xs,
          }}
        >
          <View style={{ marginBottom: theme.spacing.md }}>
            <GenreChips
              selected={filters.genres ?? []}
              onChange={handleGenresChange}
            />
          </View>

          <View style={{ marginBottom: theme.spacing.md }}>
            <RadioGroup<MinRating>
              label="Minimum Rating"
              options={MIN_RATING_OPTIONS}
              value={filters.minRating ?? 0}
              onChange={handleMinRatingChange}
              size="md"
            />
          </View>

          <View style={{ marginBottom: theme.spacing.md }}>
            <YearRangeInput
              yearFrom={filters.yearFrom}
              yearTo={filters.yearTo}
              onChange={handleYearChange}
            />
          </View>

          <View style={{ marginBottom: theme.spacing.md }}>
            <RadioGroup<string>
              label="Language"
              options={LANGUAGE_OPTIONS}
              value={filters.language ?? ''}
              onChange={handleLanguageChange}
              size="md"
            />
          </View>

          {activeFilterCount > 0 && (
            <View style={{ marginTop: theme.spacing.xs }}>
              <Button variant="ghost" size="sm" onPress={handleClearAll}>
                Clear All Filters
              </Button>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
