import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { SectionHeader } from '@/components/SectionHeader';
import { useTheme } from '@/themes';
import type { Book, UserBook } from '@/types';

interface ExLibrisSectionProps {
  book: Book;
  userBook: UserBook;
  onEditPress?: () => void;
}

export function ExLibrisSection({
  book,
  userBook,
  onEditPress,
}: ExLibrisSectionProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const startDate = formatDate(userBook.started_at);
  const finishDate = formatDate(userBook.finished_at);

  return (
    <View style={{ gap: theme.spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text
          variant="caption"
          style={{
            textTransform: 'uppercase',
            letterSpacing: theme.letterSpacing.wide,
            fontWeight: '700',
            color: theme.colors.foregroundMuted,
          }}
        >
          Ex Libris
        </Text>
        {onEditPress && (
          <TouchableOpacity onPress={onEditPress}>
            <Text
              variant="caption"
              style={{
                color: theme.colors.primary,
                textDecorationLine: 'underline',
                textDecorationStyle: isScholar ? 'dotted' : 'solid',
              }}
            >
              Edit Details
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        {/* Format (placeholder for future) */}
        <View
          style={{
            flex: 1,
            minWidth: '45%',
          }}
        >
          <Card variant="outlined" padding="md">
            <Text
              variant="caption"
              style={{
                textTransform: 'uppercase',
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.xs,
              }}
            >
              Format
            </Text>
            <Text
              variant="body"
              style={{ fontWeight: '700', color: theme.colors.foreground }}
            >
              Hardcover
            </Text>
          </Card>
        </View>

        {/* Pages */}
        <View
          style={{
            flex: 1,
            minWidth: '45%',
          }}
        >
          <Card variant="outlined" padding="md">
            <Text
              variant="caption"
              style={{
                textTransform: 'uppercase',
                color: theme.colors.foregroundMuted,
                marginBottom: theme.spacing.xs,
              }}
            >
              Pages
            </Text>
            <Text
              variant="body"
              style={{ fontWeight: '700', color: theme.colors.foreground }}
            >
              {book.page_count ?? '—'}
            </Text>
          </Card>
        </View>

        {/* Dates */}
        {(startDate || finishDate) && (
          <View style={{ width: '100%' }}>
            <Card variant="outlined" padding="md">
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View>
                  <Text
                    variant="caption"
                    style={{
                      textTransform: 'uppercase',
                      color: theme.colors.foregroundMuted,
                      marginBottom: theme.spacing.xs,
                    }}
                  >
                    {finishDate ? 'Finished' : 'Started'}
                  </Text>
                  <Text
                    variant="body"
                    style={{ fontWeight: '700', color: theme.colors.foreground }}
                  >
                    {finishDate ?? startDate}
                  </Text>
                </View>
                <Icon
                  icon={Calendar03Icon}
                  size={20}
                  color={theme.colors.foregroundMuted}
                />
              </View>
            </Card>
          </View>
        )}
      </View>
    </View>
  );
}
