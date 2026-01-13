import React from 'react';
import { View } from 'react-native';
import { Card } from '@/components/organisms';
import { Text, Icon, Badge } from '@/components/atoms';
import { RatingInput } from '@/components/molecules';
import { Tick02Icon, Cancel01Icon, Book01Icon } from '@hugeicons/core-free-icons';
import { useTheme } from '@/themes';
import { formatShortDateWithYear } from '@/utils/dateUtils';
import type { ReadThrough } from '@/types';

interface ReadThroughCardProps {
  readThrough: ReadThrough;
  isCurrentRead?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const ReadThroughCard = React.memo(function ReadThroughCard({
  readThrough,
  isCurrentRead = false,
  onRatingChange,
}: ReadThroughCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const getStatusInfo = () => {
    if (readThrough.is_dnf) {
      return {
        label: 'Did Not Finish',
        variant: 'danger' as const,
        icon: Cancel01Icon,
      };
    }
    if (readThrough.status === 'read') {
      return {
        label: 'Completed',
        variant: 'success' as const,
        icon: Tick02Icon,
      };
    }
    if (readThrough.status === 'reading') {
      return {
        label: 'In Progress',
        variant: 'primary' as const,
        icon: Book01Icon,
      };
    }
    return {
      label: readThrough.status,
      variant: 'muted' as const,
      icon: Book01Icon,
    };
  };

  const statusInfo = getStatusInfo();
  const formattedStartDate = readThrough.started_at
    ? formatShortDateWithYear(readThrough.started_at)
    : null;
  const formattedEndDate = readThrough.finished_at
    ? formatShortDateWithYear(readThrough.finished_at)
    : null;

  return (
    <Card
      variant="outlined"
      padding="md"
      style={
        isCurrentRead
          ? {
              borderColor: theme.colors.primary,
              borderWidth: 1.5,
            }
          : undefined
      }
    >
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {isScholar ? `Reading #${readThrough.read_number}` : `Read #${readThrough.read_number}`}
            </Text>
            {isCurrentRead && (
              <Badge variant="primary" size="sm">
                Current
              </Badge>
            )}
          </View>
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </View>

        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          {formattedStartDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                Started:
              </Text>
              <Text variant="caption">{formattedStartDate}</Text>
            </View>
          )}
          {formattedEndDate && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <Text variant="caption" muted>
                Finished:
              </Text>
              <Text variant="caption">{formattedEndDate}</Text>
            </View>
          )}
        </View>

        {readThrough.total_pages_read > 0 && (
          <Text variant="caption" muted>
            {readThrough.total_pages_read} pages read
          </Text>
        )}

        {(readThrough.status === 'read' || readThrough.rating) && (
          <View style={{ marginTop: theme.spacing.xs }}>
            <RatingInput
              value={readThrough.rating ?? 0}
              onChange={onRatingChange ?? (() => {})}
              size="sm"
              readonly={!onRatingChange}
            />
          </View>
        )}

        {readThrough.is_dnf && readThrough.dnf_reason && (
          <Text
            variant="caption"
            muted
            style={{
              fontStyle: isScholar ? 'italic' : 'normal',
              marginTop: theme.spacing.xs,
            }}
          >
            {isScholar ? 'Reason: ' : ''}{readThrough.dnf_reason}
          </Text>
        )}

        {readThrough.review && (
          <Text
            variant="caption"
            muted
            numberOfLines={2}
            style={{
              fontStyle: isScholar ? 'italic' : 'normal',
              marginTop: theme.spacing.xs,
            }}
          >
            "{readThrough.review}"
          </Text>
        )}
      </View>
    </Card>
  );
});
