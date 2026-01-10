import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import type { ReadingSession } from '@/types';

interface SessionCardProps {
  session: ReadingSession;
  compact?: boolean;
  onPress?: (session: ReadingSession) => void;
}

export const SessionCard = React.memo(function SessionCard({
  session,
  compact = false,
  onPress,
}: SessionCardProps) {
  const handlePress = useCallback(() => {
    onPress?.(session);
  }, [onPress, session]);
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const formattedDate = new Date(session.date + 'T00:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const content = compact ? (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="body">
          p.{session.start_page} - {session.end_page}
        </Text>
        <Text variant="caption" muted>
          ({session.pages_read} pages)
        </Text>
      </View>
      <Text variant="caption" muted>
        {formattedDate}
      </Text>
    </View>
  ) : (
    <Card variant="outlined" padding="md">
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="body" style={{ fontWeight: '600' }}>
            {formattedDate}
          </Text>
          {session.formatted_duration && (
            <Text variant="caption" muted>
              {session.formatted_duration}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.lg,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text variant="caption" muted>
              Pages:
            </Text>
            <Text variant="body">
              {session.start_page} - {session.end_page}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            <Text variant="caption" muted>
              Read:
            </Text>
            <Text variant="body">{session.pages_read}</Text>
          </View>
        </View>

        {session.notes && (
          <Text
            variant="caption"
            muted
            style={{
              fontStyle: isScholar ? 'italic' : 'normal',
              marginTop: theme.spacing.xs,
            }}
          >
            "{session.notes}"
          </Text>
        )}
      </View>
    </Card>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});
