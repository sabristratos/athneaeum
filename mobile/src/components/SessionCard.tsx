import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Card } from '@/components/organisms';
import { Text, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';
import { formatShortDateWithYear } from '@/utils/dateUtils';
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

  const formattedDate = formatShortDateWithYear(session.date);

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

  const accessibilityLabel = `Reading session on ${formattedDate}. Pages ${session.start_page} to ${session.end_page}, ${session.pages_read} pages read${session.formatted_duration ? `. Duration: ${session.formatted_duration}` : ''}${session.notes ? `. Note: ${session.notes}` : ''}`;

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to edit session"
      >
        {content}
      </Pressable>
    );
  }

  return content;
});
