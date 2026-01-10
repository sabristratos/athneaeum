import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Text } from '@/components';
import { useTheme } from '@/themes';

interface LoadMoreFooterProps {
  loading: boolean;
  hasMore: boolean;
}

export function LoadMoreFooter({ loading, hasMore }: LoadMoreFooterProps) {
  const { theme } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          paddingVertical: theme.spacing.lg,
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text
          variant="caption"
          muted
          style={{ marginTop: theme.spacing.xs }}
        >
          Loading more...
        </Text>
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View
        style={{
          paddingVertical: theme.spacing.lg,
          alignItems: 'center',
        }}
      >
        <Text variant="caption" muted>
          No more results
        </Text>
      </View>
    );
  }

  return null;
}
