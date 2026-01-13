import React, { memo, useMemo } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { Text, Card, Icon, CoverImage, Badge } from '@/components';
import { useTheme } from '@/themes';
import {
  Layers01Icon,
  ArrowRight01Icon,
  Book01Icon,
} from '@hugeicons/core-free-icons';
import type { UserBook } from '@/types';

interface SeriesGroup {
  seriesId: number;
  seriesTitle: string;
  author: string;
  books: UserBook[];
  totalVolumes: number | null;
  readCount: number;
}

interface SeriesGroupViewProps {
  books: UserBook[];
  onBookPress: (book: UserBook) => void;
  onSeriesPress?: (seriesId: number) => void;
}

export const SeriesGroupView = memo(function SeriesGroupView({
  books,
  onBookPress,
  onSeriesPress,
}: SeriesGroupViewProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const { seriesGroups, standaloneBooks } = useMemo(() => {
    const groupMap = new Map<number, SeriesGroup>();
    const standalone: UserBook[] = [];

    for (const userBook of books) {
      const book = userBook.book;
      if (book.series_id && book.series) {
        const existing = groupMap.get(book.series_id);
        if (existing) {
          existing.books.push(userBook);
          if (userBook.status === 'read') {
            existing.readCount++;
          }
        } else {
          groupMap.set(book.series_id, {
            seriesId: book.series_id,
            seriesTitle: book.series.title,
            author: book.series.author || book.author,
            books: [userBook],
            totalVolumes: book.series.total_volumes,
            readCount: userBook.status === 'read' ? 1 : 0,
          });
        }
      } else {
        standalone.push(userBook);
      }
    }

    const groups = Array.from(groupMap.values()).sort((a, b) =>
      a.seriesTitle.localeCompare(b.seriesTitle)
    );

    groups.forEach((group) => {
      group.books.sort((a, b) => {
        const volA = a.book.volume_number ?? 999;
        const volB = b.book.volume_number ?? 999;
        return volA - volB;
      });
    });

    return { seriesGroups: groups, standaloneBooks: standalone };
  }, [books]);

  const renderSeriesCard = (group: SeriesGroup) => {
    const progressText = group.totalVolumes
      ? `${group.readCount} of ${group.totalVolumes} read`
      : `${group.readCount} of ${group.books.length} read`;

    return (
      <Pressable
        key={group.seriesId}
        onPress={() => onSeriesPress?.(group.seriesId)}
        style={{ marginBottom: theme.spacing.md }}
      >
        <Card
          variant="outlined"
          padding="md"
          style={{
            borderColor: theme.colors.primary,
            borderWidth: 1,
          }}
        >
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: theme.radii.sm,
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon icon={Layers01Icon} size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3" numberOfLines={1} style={{ fontSize: 18 }}>
                  {group.seriesTitle}
                </Text>
                <Text variant="caption" muted>
                  {group.author} · {progressText}
                </Text>
              </View>
              {onSeriesPress && (
                <Icon
                  icon={ArrowRight01Icon}
                  size={20}
                  color={theme.colors.foregroundMuted}
                />
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: theme.spacing.sm }}
            >
              {group.books.map((userBook) => (
                <Pressable
                  key={userBook.id}
                  onPress={() => onBookPress(userBook)}
                >
                  <View style={{ alignItems: 'center', width: 70 }}>
                    <View style={{ opacity: userBook.status === 'read' ? 1 : 0.7 }}>
                      <CoverImage
                        uri={userBook.book.cover_url}
                        size="sm"
                        fallbackText={userBook.book.title}
                      />
                    </View>
                    {userBook.book.volume_number && (
                      <View style={{ marginTop: theme.spacing.xs }}>
                        <Badge
                          variant={userBook.status === 'read' ? 'success' : 'muted'}
                          size="sm"
                        >
                          #{userBook.book.volume_number}
                        </Badge>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderStandaloneSection = () => {
    if (standaloneBooks.length === 0) return null;

    return (
      <View style={{ marginTop: theme.spacing.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          <Icon icon={Book01Icon} size={18} color={theme.colors.foregroundMuted} />
          <Text variant="label" muted>
            {isScholar ? 'Standalone Volumes' : 'Not in a Series'}
          </Text>
          <Badge variant="muted" size="sm">
            {standaloneBooks.length}
          </Badge>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.md }}
        >
          {standaloneBooks.map((userBook) => (
            <Pressable
              key={userBook.id}
              onPress={() => onBookPress(userBook)}
            >
              <View style={{ width: 80 }}>
                <CoverImage
                  uri={userBook.book.cover_url}
                  size="md"
                  fallbackText={userBook.book.title}
                />
                <Text
                  variant="caption"
                  numberOfLines={2}
                  style={{ marginTop: theme.spacing.xs, textAlign: 'center' }}
                >
                  {userBook.book.title}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  };

  if (seriesGroups.length === 0 && standaloneBooks.length === 0) {
    return (
      <View style={{ padding: theme.spacing.xl, alignItems: 'center' }}>
        <Text variant="body" muted>
          No books in your library
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: theme.spacing.md,
        paddingBottom: theme.spacing.xl * 2,
      }}
      showsVerticalScrollIndicator={false}
    >
      {seriesGroups.length > 0 && (
        <View style={{ marginBottom: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.sm,
              marginBottom: theme.spacing.md,
            }}
          >
            <Icon icon={Layers01Icon} size={18} color={theme.colors.primary} />
            <Text variant="label" style={{ color: theme.colors.primary }}>
              {isScholar ? 'Series Collections' : 'Your Series'}
            </Text>
            <Badge variant="primary" size="sm">
              {seriesGroups.length}
            </Badge>
          </View>

          {seriesGroups.map(renderSeriesCard)}
        </View>
      )}

      {renderStandaloneSection()}
    </ScrollView>
  );
});
