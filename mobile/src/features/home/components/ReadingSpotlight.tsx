import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { PlayIcon, PencilEdit01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon, Progress, Pressable } from '@/components';
import { CoverImage } from '@/components/organisms/CoverImage';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations';
import type { UserBook } from '@/types';

interface ReadingSpotlightProps {
  book: UserBook;
  isPinned?: boolean;
  onContinueReading: () => void;
  onLogPages: () => void;
  onViewDetails: () => void;
  onLongPress?: () => void;
}

export function ReadingSpotlight({
  book,
  isPinned,
  onContinueReading,
  onLogPages,
  onViewDetails,
  onLongPress,
}: ReadingSpotlightProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const scale = useSharedValue(1);
  const progressPercentage = book.progress_percentage ?? 0;
  const currentPage = book.current_page ?? 0;
  const pageCount = book.book.page_count ?? 0;

  const handlePressIn = () => {
    scale.value = withSpring(0.98, SPRINGS.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, SPRINGS.gentle);
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pagesRemaining = pageCount > 0 ? pageCount - currentPage : null;

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        onPress={onViewDetails}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        haptic="light"
        delayLongPress={500}
      >
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
              borderWidth: theme.borders.thin,
              borderColor: theme.colors.border,
              ...theme.shadows.md,
            },
          ]}
        >
          {isPinned && (
            <View
              style={[
                styles.pinnedBadge,
                {
                  backgroundColor: theme.colors.primarySubtle,
                  borderRadius: isScholar ? theme.radii.xs : theme.radii.full,
                },
              ]}
            >
              <Text
                variant="caption"
                style={{ color: theme.colors.primary, fontSize: 10, fontWeight: '600' }}
              >
                PINNED
              </Text>
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.coverSection}>
              <CoverImage
                uri={book.book.cover_url}
                size="md"
                fallbackText={book.book.title}
              />
            </View>

            <View style={styles.infoSection}>
              <View style={styles.titleSection}>
                <Text
                  variant="h3"
                  numberOfLines={2}
                  style={{
                    color: theme.colors.foreground,
                    fontSize: 17,
                    lineHeight: 22,
                  }}
                >
                  {book.book.title}
                </Text>
                <Text
                  variant="body"
                  numberOfLines={1}
                  style={{
                    color: theme.colors.foregroundMuted,
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {book.book.author}
                </Text>
              </View>

              <View style={styles.progressSection}>
                <Progress
                  value={progressPercentage}
                  size="md"
                  showPercentage={false}
                />
                <View style={styles.progressLabels}>
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}
                  >
                    Page {currentPage}{pageCount > 0 ? ` of ${pageCount}` : ''}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '600' }}
                  >
                    {Math.round(progressPercentage)}%
                  </Text>
                </View>
                {pagesRemaining !== null && pagesRemaining > 0 && (
                  <Text
                    variant="caption"
                    style={{
                      color: theme.colors.foregroundFaint,
                      fontSize: 11,
                      marginTop: 2,
                      fontStyle: isScholar ? 'italic' : 'normal',
                    }}
                  >
                    {pagesRemaining} pages remaining
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              variant="primary"
              size="md"
              onPress={onContinueReading}
              fullWidth
            >
              <Icon icon={PlayIcon} size={16} color={theme.colors.onPrimary} />
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', marginLeft: 6 }}>
                Continue Reading
              </Text>
            </Button>

            <View style={styles.secondaryActions}>
              <View style={styles.secondaryButton}>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={onLogPages}
                  fullWidth
                >
                  <Icon icon={PencilEdit01Icon} size={16} color={theme.colors.foreground} />
                  <Text style={{ color: theme.colors.foreground, marginLeft: 4, fontSize: 13 }}>
                    Log
                  </Text>
                </Button>
              </View>

              <View style={styles.secondaryButton}>
                <Button
                  variant="ghost"
                  size="md"
                  onPress={onViewDetails}
                  fullWidth
                >
                  <Text style={{ color: theme.colors.foregroundMuted, fontSize: 13 }}>
                    Details
                  </Text>
                  <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.foregroundMuted} />
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface EmptySpotlightProps {
  onBrowseLibrary: () => void;
  onExploreDiscovery: () => void;
}

export function EmptySpotlight({ onBrowseLibrary, onExploreDiscovery }: EmptySpotlightProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const quotes = [
    { text: "A reader lives a thousand lives before he dies.", author: "George R.R. Martin" },
    { text: "There is no friend as loyal as a book.", author: "Ernest Hemingway" },
    { text: "Books are a uniquely portable magic.", author: "Stephen King" },
    { text: "Reading is dreaming with open eyes.", author: "Anissa Trisdianty" },
  ];

  const randomQuote = React.useMemo(
    () => quotes[Math.floor(Math.random() * quotes.length)],
    []
  );

  return (
    <View
      style={[
        styles.emptyContainer,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: isScholar ? theme.radii.md : theme.radii.xl,
          borderWidth: theme.borders.thin,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text
        variant="body"
        style={{
          color: theme.colors.foreground,
          textAlign: 'center',
          fontStyle: 'italic',
          fontSize: 15,
          lineHeight: 22,
          paddingHorizontal: 16,
        }}
      >
        "{randomQuote.text}"
      </Text>
      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundMuted,
          textAlign: 'center',
          marginTop: 8,
        }}
      >
        — {randomQuote.author}
      </Text>

      <View style={styles.emptyActions}>
        <Button
          variant="primary"
          size="md"
          onPress={onBrowseLibrary}
          fullWidth
        >
          <Text style={{ color: theme.colors.onPrimary, fontWeight: '600' }}>
            Browse Library
          </Text>
        </Button>
      </View>

      <Pressable onPress={onExploreDiscovery} haptic="light">
        <Text
          variant="caption"
          style={{
            color: theme.colors.primary,
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          or explore the Discovery tab →
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    overflow: 'hidden',
  },
  pinnedBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
  },
  content: {
    flexDirection: 'row',
    gap: 16,
  },
  coverSection: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  titleSection: {
    flex: 1,
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  primaryButton: {
    width: '100%',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyActions: {
    flexDirection: 'row',
    marginTop: 24,
    width: '100%',
    maxWidth: 200,
  },
});
