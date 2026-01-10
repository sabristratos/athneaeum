import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { Text, Card } from '@/components';
import { useTheme } from '@/themes';
import type { RecentSession } from '@/types';

interface RecentSessionCardProps {
  session: RecentSession;
}

export function RecentSessionCard({ session }: RecentSessionCardProps) {
  const { theme } = useTheme();

  const formattedDate = new Date(session.date).toLocaleDateString();

  return (
    <Card
      variant="outlined"
      padding="sm"
      style={{ marginBottom: theme.spacing.sm }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        {session.book.cover_url ? (
          <Image
            source={{ uri: session.book.cover_url }}
            style={{
              width: 40,
              height: 60,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={{
              width: 40,
              height: 60,
              borderRadius: theme.radii.sm,
              backgroundColor: theme.colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" muted style={{ fontSize: 8 }}>
              No Cover
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text variant="body" numberOfLines={1}>
            {session.book.title}
          </Text>
          <Text variant="caption" muted>
            Pages {session.start_page} - {session.end_page} ({session.pages_read} pages)
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: 2 }}>
            <Text variant="caption" muted>
              {formattedDate}
            </Text>
            {session.formatted_duration && (
              <Text variant="caption" muted>
                {session.formatted_duration}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
}
