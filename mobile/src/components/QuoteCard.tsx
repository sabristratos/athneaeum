import React, { useCallback } from 'react';
import { View, type ViewStyle } from 'react-native';
import { Card } from '@/components/organisms';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { formatShortDate } from '@/utils/dateUtils';
import { MOOD_OPTIONS, type Quote } from '@/types/quote';

interface QuoteCardProps {
  quote: Quote;
  onPress: (quote: Quote) => void;
  style?: ViewStyle;
}

export const QuoteCard = React.memo(function QuoteCard({
  quote,
  onPress,
  style,
}: QuoteCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handlePress = useCallback(() => {
    onPress(quote);
  }, [onPress, quote]);

  const moodOption = quote.mood
    ? MOOD_OPTIONS.find((m) => m.value === quote.mood)
    : null;

  const accessibilityLabel = `Quote: ${quote.text}${quote.pageNumber ? `. Page ${quote.pageNumber}` : ''}${moodOption ? `. Mood: ${moodOption.label}` : ''}`;

  return (
    <Card
      variant={isScholar ? 'paper' : 'outlined'}
      padding="md"
      onPress={handlePress}
      style={style}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Tap to view or edit quote"
    >
      <View style={{ flex: 1, gap: theme.spacing.sm }}>
        <Text
          variant="body"
          numberOfLines={6}
          style={{
            fontStyle: 'italic',
            lineHeight: 22,
            color: theme.colors.foreground,
            flexShrink: 1,
          }}
        >
          "{quote.text}"
        </Text>

        {quote.note && (
          <Text
            variant="caption"
            numberOfLines={2}
            style={{
              color: theme.colors.foregroundMuted,
            }}
          >
            {quote.note}
          </Text>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: theme.spacing.xs,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}
          >
            {quote.pageNumber && (
              <Text
                variant="caption"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                p. {quote.pageNumber}
              </Text>
            )}
            {moodOption && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 2,
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 2,
                  backgroundColor: theme.colors.tintPrimary,
                  borderRadius: theme.radii.sm,
                }}
              >
                <Text style={{ fontSize: 12 }}>{moodOption.emoji}</Text>
                <Text
                  variant="caption"
                  style={{
                    fontSize: 10,
                    color: theme.colors.primary,
                  }}
                >
                  {moodOption.label}
                </Text>
              </View>
            )}
          </View>

          <Text
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: 10,
            }}
          >
            {formatShortDate(quote.createdAt)}
          </Text>
        </View>
      </View>
    </Card>
  );
});
