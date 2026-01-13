import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FavouriteIcon, Cancel01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { Text, Card, Icon, IconButton, Pressable } from '@/components';
import { useTheme } from '@/themes';
import type { LibraryAuthor, OpenLibraryAuthor } from '@/types';

interface LibraryAuthorCardProps {
  author: LibraryAuthor;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  onToggleExclude?: () => void;
}

export function LibraryAuthorCard({
  author,
  onPress,
  onToggleFavorite,
  onToggleExclude,
}: LibraryAuthorCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const statusLabel = author.is_favorite
    ? ', favorited'
    : author.is_excluded
    ? ', excluded'
    : '';

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      accessibilityLabel={`${author.name}, ${author.book_count} books${statusLabel}`}
      accessibilityRole="button"
    >
      <Card variant="outlined" style={styles.card}>
        <View style={styles.row}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              },
            ]}
          >
            <Icon icon={UserIcon} size={20} color={theme.colors.primary} />
          </View>

          <View style={styles.content}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {author.name}
            </Text>
            <Text variant="caption" muted>
              {author.book_count} {author.book_count === 1 ? 'book' : 'books'}
              {author.avg_rating !== null && ` · ★ ${author.avg_rating}`}
            </Text>
          </View>

          <View style={styles.actions}>
            <IconButton
              icon={FavouriteIcon}
              size="sm"
              variant={author.is_favorite ? 'primary' : 'ghost'}
              onPress={onToggleFavorite}
              accessibilityLabel={
                author.is_favorite ? 'Remove from favorites' : 'Add to favorites'
              }
            />
            <IconButton
              icon={Cancel01Icon}
              size="sm"
              variant={author.is_excluded ? 'danger' : 'ghost'}
              onPress={onToggleExclude}
              accessibilityLabel={
                author.is_excluded ? 'Remove from excluded' : 'Exclude author'
              }
            />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

interface OpenLibraryAuthorCardProps {
  author: OpenLibraryAuthor;
  onPress?: () => void;
}

export function OpenLibraryAuthorCard({
  author,
  onPress,
}: OpenLibraryAuthorCardProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      accessibilityLabel={`${author.name}, ${author.work_count} works${author.top_work ? `, known for ${author.top_work}` : ''}`}
      accessibilityRole="button"
    >
      <Card variant="outlined" style={styles.card}>
        <View style={styles.row}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              },
            ]}
          >
            <Icon icon={UserIcon} size={20} color={theme.colors.foregroundMuted} />
          </View>

          <View style={styles.content}>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {author.name}
            </Text>
            {author.top_work && (
              <Text variant="caption" muted numberOfLines={1}>
                Known for: {author.top_work}
              </Text>
            )}
            <Text variant="caption" muted>
              {author.work_count} works
              {author.birth_date && ` · Born ${author.birth_date}`}
            </Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
});
