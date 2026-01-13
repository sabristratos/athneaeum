import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/atoms/Text';
import { Card } from '@/components/organisms/cards/Card';
import { useTheme } from '@/themes';
import type { PageEconomyData } from '@/types/stats';

interface PageEconomySectionProps {
  data: PageEconomyData | undefined;
}

export const PageEconomySection = memo(function PageEconomySection({
  data,
}: PageEconomySectionProps) {
  const { theme } = useTheme();

  if (!data || data.books_with_price === 0 || data.total_hours === 0) {
    const message = !data || data.books_with_price === 0
      ? 'Add prices to your books to see your cost per hour of entertainment.'
      : 'Complete books or log reading sessions to calculate your cost per hour.';

    return (
      <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
        <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
          Page Economy
        </Text>
        <Text variant="caption" muted style={{ marginBottom: theme.spacing.xs }}>
          {message}
        </Text>
        <Text variant="caption" style={{ color: theme.colors.foregroundSubtle }}>
          Time is calculated from reading sessions, or estimated for completed books.
        </Text>
      </Card>
    );
  }

  const comparisonItems = [
    { label: 'Books', value: data.comparison.books, isBooks: true },
    { label: 'Netflix', value: data.comparison.netflix, isBooks: false },
    { label: 'Movies', value: data.comparison.movie_theater, isBooks: false },
  ];

  return (
    <Card variant="elevated" padding="lg" style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
        Page Economy
      </Text>
      <Text variant="caption" muted style={{ marginBottom: theme.spacing.md }}>
        Cost per hour of entertainment
      </Text>

      <View style={[styles.mainStat, { marginBottom: theme.spacing.lg }]}>
        <Text
          variant="h1"
          style={[styles.costValue, { color: theme.colors.success }]}
        >
          ${data.cost_per_hour.toFixed(2)}
        </Text>
        <Text variant="caption" muted>
          per hour of reading
        </Text>
      </View>

      <View style={[styles.comparisonRow, { gap: theme.spacing.sm }]}>
        {comparisonItems.map((item) => (
          <View
            key={item.label}
            style={[
              styles.comparisonItem,
              {
                backgroundColor: item.isBooks
                  ? theme.colors.successSubtle
                  : theme.colors.muted,
                borderRadius: theme.radii.md,
                padding: theme.spacing.sm,
              },
            ]}
          >
            <Text
              variant="body"
              style={[
                styles.comparisonValue,
                { color: item.isBooks ? theme.colors.success : theme.colors.foreground },
              ]}
            >
              ${item.value.toFixed(2)}
            </Text>
            <Text variant="caption" muted>
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.summaryBox,
          {
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            paddingTop: theme.spacing.md,
            marginTop: theme.spacing.md,
          },
        ]}
      >
        <View style={styles.summaryRow}>
          <Text variant="caption" muted>
            Total spent
          </Text>
          <Text variant="body">${data.total_spent.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text variant="caption" muted>
            Total hours
          </Text>
          <Text variant="body">{data.total_hours.toFixed(1)}h</Text>
        </View>
        {data.estimated_hours > 0 && (
          <View style={[styles.hoursBreakdown, { marginTop: theme.spacing.xs }]}>
            <Text variant="caption" style={{ color: theme.colors.foregroundSubtle }}>
              ({data.tracked_hours.toFixed(1)}h tracked, ~{data.estimated_hours.toFixed(1)}h estimated)
            </Text>
          </View>
        )}
        <View style={styles.summaryRow}>
          <Text variant="caption" muted>
            Books tracked
          </Text>
          <Text variant="body">{data.books_with_price}</Text>
        </View>
      </View>

      {data.best_value_books.length > 0 && (
        <View style={{ marginTop: theme.spacing.md }}>
          <Text variant="caption" muted style={{ marginBottom: theme.spacing.xs }}>
            Best value:
          </Text>
          <View style={styles.bestValueRow}>
            <Text variant="body" style={styles.bestValueTitle} numberOfLines={2}>
              {data.best_value_books[0].title}
            </Text>
            <Text variant="body" style={styles.bestValueCost}>
              ${data.best_value_books[0].cost_per_hour.toFixed(2)}/hr
              {data.best_value_books[0].is_estimated ? ' ~' : ''}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  mainStat: {
    alignItems: 'center',
  },
  costValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  comparisonRow: {
    flexDirection: 'row',
  },
  comparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  comparisonValue: {
    fontWeight: '600',
    fontSize: 16,
  },
  summaryBox: {},
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  hoursBreakdown: {
    alignItems: 'flex-end',
  },
  bestValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bestValueTitle: {
    flex: 1,
    marginRight: 8,
  },
  bestValueCost: {
    fontWeight: '600',
    flexShrink: 0,
  },
});
