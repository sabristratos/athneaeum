import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { ReadingStats } from '@/types/book';

export interface SmartEstimationProps {
  currentPage: number;
  pageCount: number | null;
  stats: ReadingStats | null;
}

export function SmartEstimation({
  currentPage,
  pageCount,
  stats,
}: SmartEstimationProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const estimation = useMemo(() => {
    if (!pageCount) {
      return { text: 'Unknown length', subtext: null };
    }

    const pagesRemaining = pageCount - currentPage;

    if (pagesRemaining <= 0) {
      return { text: 'Finished!', subtext: null };
    }

    if (!stats || stats.avg_pages_per_session === 0 || stats.avg_session_duration_seconds === 0) {
      return {
        text: `${pagesRemaining} pages remaining`,
        subtext: null,
      };
    }

    const avgPagesPerSession = stats.avg_pages_per_session;
    const avgSessionDuration = stats.avg_session_duration_seconds;

    const sessionsNeeded = Math.ceil(pagesRemaining / avgPagesPerSession);
    const totalSecondsNeeded = sessionsNeeded * avgSessionDuration;

    const hours = Math.floor(totalSecondsNeeded / 3600);
    const minutes = Math.round((totalSecondsNeeded % 3600) / 60);

    let timeText: string;
    if (hours > 0 && minutes > 0) {
      timeText = `~${hours}h ${minutes}m left`;
    } else if (hours > 0) {
      timeText = `~${hours}h left`;
    } else if (minutes > 0) {
      timeText = `~${minutes}m left`;
    } else {
      timeText = 'Almost done!';
    }

    return {
      text: timeText,
      subtext: 'at your current pace',
    };
  }, [currentPage, pageCount, stats]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        variant="body"
        style={{
          color: theme.colors.foreground,
          fontFamily: isScholar ? theme.fonts.heading : theme.fonts.body,
          fontStyle: isScholar ? 'italic' : 'normal',
          fontSize: 14,
          fontWeight: '500',
        }}
      >
        {estimation.text}
      </Text>
      {estimation.subtext && (
        <Text
          variant="caption"
          style={{
            color: theme.colors.foregroundMuted,
            fontSize: 11,
            marginTop: 2,
          }}
        >
          {estimation.subtext}
        </Text>
      )}
    </View>
  );
}
