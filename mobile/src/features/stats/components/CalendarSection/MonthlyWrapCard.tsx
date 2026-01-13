import React, { memo, forwardRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Book01Icon, FileExportIcon } from '@hugeicons/core-free-icons';
import { Text, Icon, Button } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { MonthlySummary, CalendarDay } from '@/types/stats';

interface MonthlyWrapCardProps {
  summary: MonthlySummary | null;
  days: CalendarDay[];
  onExport: () => void;
}

export const MonthlyWrapCard = memo(
  forwardRef<ViewShot, MonthlyWrapCardProps>(function MonthlyWrapCard(
    { summary, days, onExport },
    ref
  ) {
    const { theme, themeName } = useTheme();
    const isScholar = themeName === 'scholar';

    if (!summary) return null;

    const completedBookCovers = days
      .flatMap((d) => d.books_completed)
      .filter((b) => b.cover_url)
      .slice(0, 4)
      .map((b) => b.cover_url);

    const formatNumber = (num: number): string => {
      if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}k`;
      }
      return String(num);
    };

    return (
      <View style={{ marginTop: theme.spacing.lg }}>
        <View style={styles.headerRow}>
          <Text
            variant="label"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {isScholar ? 'MONTHLY WRAP' : 'Monthly Wrap'}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            onPress={onExport}
            accessibilityLabel="Share wrap card"
          >
            <Icon icon={FileExportIcon} size={14} color={theme.colors.foreground} />
            <Text
              variant="caption"
              style={{ color: theme.colors.foreground, fontWeight: '600' }}
            >
              Share
            </Text>
          </Button>
        </View>

        <ViewShot
          ref={ref}
          options={{ format: 'png', quality: 1, result: 'tmpfile' }}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
                borderWidth: theme.borders.thin,
                borderColor: theme.colors.border,
                padding: theme.spacing.lg,
                marginTop: theme.spacing.sm,
              },
              !isScholar && {
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              },
            ]}
          >
            <View style={styles.titleRow}>
              <Icon
                icon={Book01Icon}
                size={20}
                color={theme.colors.primary}
              />
              <Text
                variant="h3"
                style={[
                  styles.monthTitle,
                  { color: theme.colors.foreground },
                  isScholar && { textTransform: 'uppercase', letterSpacing: 1 },
                ]}
              >
                {summary.label}
              </Text>
            </View>

            <View style={[styles.statsRow, { marginTop: theme.spacing.md }]}>
              <View style={styles.statItem}>
                <Text
                  variant="h2"
                  style={{ color: theme.colors.primary }}
                >
                  {summary.books_completed}
                </Text>
                <Text variant="caption" muted>
                  {summary.books_completed === 1 ? 'Book' : 'Books'}
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text
                  variant="h2"
                  style={{ color: theme.colors.foreground }}
                >
                  {formatNumber(summary.pages_read)}
                </Text>
                <Text variant="caption" muted>
                  Pages
                </Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.statItem}>
                <Text
                  variant="h2"
                  style={{ color: theme.colors.foreground }}
                >
                  {summary.sessions_count}
                </Text>
                <Text variant="caption" muted>
                  Sessions
                </Text>
              </View>
            </View>

            {completedBookCovers.length > 0 && (
              <View
                style={[
                  styles.coversRow,
                  { marginTop: theme.spacing.lg },
                ]}
              >
                {completedBookCovers.map((coverUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: coverUrl! }}
                    style={[
                      styles.cover,
                      {
                        borderRadius: isScholar ? theme.radii.xs : theme.radii.sm,
                        marginLeft: index > 0 ? -8 : 0,
                        zIndex: completedBookCovers.length - index,
                      },
                    ]}
                    resizeMode="cover"
                  />
                ))}
              </View>
            )}

            <View
              style={[
                styles.footer,
                {
                  marginTop: theme.spacing.lg,
                  paddingTop: theme.spacing.md,
                  borderTopWidth: theme.borders.thin,
                  borderTopColor: theme.colors.border,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{ color: theme.colors.foregroundSubtle, textAlign: 'center' }}
              >
                via Digital Athenaeum
              </Text>
            </View>
          </View>
        </ViewShot>
      </View>
    );
  })
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {},
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  coversRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cover: {
    width: 48,
    height: 68,
  },
  footer: {},
});
