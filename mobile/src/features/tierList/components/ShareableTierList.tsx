import React, { memo, forwardRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { Analytics01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components';
import { useTheme } from '@/themes';
import {
  TIER_DEFINITIONS,
  TIER_COLORS,
  type TierListState,
  type TierListBook,
} from '@/types/tierList';

interface ShareableTierListProps {
  tiers: TierListState;
}

interface ShareableTierRowProps {
  label: string;
  color: string;
  books: TierListBook[];
  maxVisible?: number;
}

function ShareableTierRow({
  label,
  color,
  books,
  maxVisible = 8,
}: ShareableTierRowProps) {
  const { theme } = useTheme();
  const visibleBooks = books.slice(0, maxVisible);
  const overflowCount = books.length - maxVisible;

  return (
    <View style={styles.tierRow}>
      <View
        style={[
          styles.tierLabel,
          { backgroundColor: color, borderRadius: theme.radii.xs },
        ]}
      >
        <Text
          variant="caption"
          style={{ color: '#ffffff', fontWeight: '700', fontSize: 10 }}
        >
          {label}
        </Text>
      </View>
      <View
        style={[
          styles.tierBooks,
          {
            backgroundColor: theme.colors.surface,
            borderWidth: theme.borders.thin,
            borderLeftWidth: 0,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {visibleBooks.length === 0 ? (
          <View style={styles.emptyTier} />
        ) : (
          <View style={styles.booksRow}>
            {visibleBooks.map((book, index) => (
              <View
                key={book.id}
                style={[
                  styles.bookCover,
                  { borderRadius: theme.radii.xs },
                  index > 0 && { marginLeft: 4 },
                ]}
              >
                {book.coverUrl ? (
                  <Image
                    source={{ uri: book.coverUrl }}
                    style={[styles.coverImage, { borderRadius: theme.radii.xs }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.coverPlaceholder,
                      {
                        backgroundColor: theme.colors.surfaceHover,
                        borderRadius: theme.radii.xs,
                      },
                    ]}
                  />
                )}
              </View>
            ))}
            {overflowCount > 0 && (
              <View
                style={[
                  styles.overflow,
                  { backgroundColor: theme.colors.surfaceHover },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ fontSize: 9, color: theme.colors.foregroundMuted }}
                >
                  +{overflowCount}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export const ShareableTierList = memo(
  forwardRef<ViewShot, ShareableTierListProps>(function ShareableTierList(
    { tiers },
    ref
  ) {
    const { theme, themeName } = useTheme();
    const isScholar = themeName === 'scholar';

    const totalBooks = Object.values(tiers).reduce(
      (sum, tierBooks) => sum + tierBooks.length,
      0
    );

    return (
      <ViewShot
        ref={ref}
        options={{ format: 'png', quality: 1, result: 'tmpfile' }}
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.canvas,
              borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
              padding: theme.spacing.md,
            },
          ]}
        >
          <View style={styles.header}>
            <Icon icon={Analytics01Icon} size={18} color={theme.colors.primary} />
            <Text
              variant="h3"
              style={[
                { marginLeft: 8, color: theme.colors.foreground },
                isScholar && { textTransform: 'uppercase', letterSpacing: 1 },
              ]}
            >
              My Tier List
            </Text>
          </View>

          <View style={{ marginTop: theme.spacing.md }}>
            {TIER_DEFINITIONS.map((tier) => (
              <ShareableTierRow
                key={tier.id}
                label={tier.label}
                color={TIER_COLORS[tier.id][themeName]}
                books={tiers[tier.id]}
              />
            ))}
          </View>

          <View
            style={[
              styles.footer,
              {
                marginTop: theme.spacing.md,
                paddingTop: theme.spacing.sm,
                borderTopWidth: theme.borders.thin,
                borderTopColor: theme.colors.border,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundSubtle, textAlign: 'center' }}
            >
              {totalBooks} books • via Digital Athenaeum
            </Text>
          </View>
        </View>
      </ViewShot>
    );
  })
);

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRow: {
    flexDirection: 'row',
    marginBottom: 4,
    minHeight: 48,
  },
  tierLabel: {
    width: 64,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
  },
  tierBooks: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  booksRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyTier: {
    height: 40,
  },
  bookCover: {
    width: 28,
    height: 40,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
  },
  overflow: {
    width: 24,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  footer: {},
});
