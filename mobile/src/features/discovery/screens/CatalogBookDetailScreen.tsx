import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Text, Button, Pressable, Icon, ClassificationBadges } from '@/components';
import { useTheme } from '@/themes';
import { useCatalogBookDetailController } from '../hooks/useCatalogBookDetailController';
import { DiscoveryBookCard } from '../components';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import type { CatalogBook } from '@/types/discovery';
import { ArrowLeft02Icon, Add01Icon, Tick01Icon } from '@hugeicons/core-free-icons';

type Props = NativeStackScreenProps<MainStackParamList, 'CatalogBookDetail'>;

export function CatalogBookDetailScreen({ route, navigation }: Props) {
  const { theme } = useTheme();
  const { catalogBook } = route.params;

  const {
    book,
    similarBooks,
    isSimilarLoading,
    similarError,
    isAdding,
    isInLibrary,
    handleAddToLibrary,
    handleSimilarBookClick,
  } = useCatalogBookDetailController({ catalogBook });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSimilarPress = useCallback(
    (similarBook: CatalogBook) => {
      handleSimilarBookClick(similarBook);
      navigation.push('CatalogBookDetail', { catalogBook: similarBook });
    },
    [handleSimilarBookClick, navigation]
  );

  const parseYear = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    const match = dateStr.match(/\d{4}/);
    return match ? match[0] : dateStr.slice(0, 4);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <Pressable onPress={handleBack}>
          <View style={styles.backButton}>
            <Icon icon={ArrowLeft02Icon} size={24} color={theme.colors.foreground} />
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl * 2 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroSection, { paddingHorizontal: theme.spacing.lg }]}>
          {book.cover_url ? (
            <Image
              source={{ uri: book.cover_url }}
              style={[styles.coverImage, { borderRadius: theme.radii.md }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.coverImage,
                styles.coverPlaceholder,
                {
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radii.md,
                },
              ]}
            >
              <Text variant="body" muted style={{ textAlign: 'center' }}>
                {book.title}
              </Text>
            </View>
          )}

          <Text variant="h2" style={[styles.title, { marginTop: theme.spacing.lg }]}>
            {book.title}
          </Text>

          {book.author && (
            <Text variant="body" muted style={styles.author}>
              {book.author}
            </Text>
          )}

          <View style={[styles.metaRow, { marginTop: theme.spacing.md, gap: theme.spacing.lg }]}>
            {book.page_count && (
              <View style={styles.metaItem}>
                <Text variant="h3">{book.page_count}</Text>
                <Text variant="caption" muted>
                  pages
                </Text>
              </View>
            )}
            {book.average_rating && (
              <View style={styles.metaItem}>
                <Text variant="h3">{book.average_rating.toFixed(1)}</Text>
                <Text variant="caption" muted>
                  rating
                </Text>
              </View>
            )}
            {book.published_date && parseYear(book.published_date) && (
              <View style={styles.metaItem}>
                <Text variant="h3">{parseYear(book.published_date)}</Text>
                <Text variant="caption" muted>
                  year
                </Text>
              </View>
            )}
          </View>

          <View style={{ marginTop: theme.spacing.xl, width: '100%' }}>
            <Button
              variant={isInLibrary ? 'secondary' : 'primary'}
              size="lg"
              onPress={handleAddToLibrary}
              disabled={isAdding || isInLibrary}
              fullWidth
            >
            {isAdding ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : isInLibrary ? (
              <>
                <Icon icon={Tick01Icon} size={20} color={theme.colors.foreground} />
                <Text style={{ color: theme.colors.foreground, fontWeight: '600', marginLeft: 8 }}>
                  In Library
                </Text>
              </>
            ) : (
              <>
                <Icon icon={Add01Icon} size={20} color={theme.colors.onPrimary} />
                <Text style={{ color: theme.colors.onPrimary, fontWeight: '600', marginLeft: 8 }}>
                  Add to Library
                </Text>
              </>
            )}
            </Button>
          </View>
        </View>

        {book.genres && book.genres.length > 0 && (
          <View style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              Genres
            </Text>
            <View style={styles.genreContainer}>
              {book.genres.slice(0, 5).map((genre) => (
                <View
                  key={genre}
                  style={[
                    styles.genreChip,
                    {
                      backgroundColor: theme.colors.surface,
                      borderRadius: theme.radii.full,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.xs,
                    },
                  ]}
                >
                  <Text variant="caption">{genre}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {book.is_classified && (
          <View style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              Classification
            </Text>
            <ClassificationBadges
              audience={book.audience}
              audienceLabel={book.audience_label}
              intensity={book.intensity}
              intensityLabel={book.intensity_label}
              moods={book.moods}
              isClassified={book.is_classified}
              confidence={book.classification_confidence}
            />
          </View>
        )}

        {book.description && (
          <View style={{ marginTop: theme.spacing.xl, paddingHorizontal: theme.spacing.lg }}>
            <Text variant="h3" style={{ marginBottom: theme.spacing.sm }}>
              Description
            </Text>
            <Text variant="body" style={{ color: theme.colors.foregroundMuted, lineHeight: 24 }}>
              {book.description}
            </Text>
          </View>
        )}

        <View style={{ marginTop: theme.spacing.xl }}>
          <Text
            variant="h3"
            style={{ marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.lg }}
          >
            Similar Books
          </Text>

          {isSimilarLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : similarError ? (
            <View style={[styles.emptyContainer, { paddingHorizontal: theme.spacing.lg }]}>
              <Text variant="body" muted>
                Unable to load similar books.
              </Text>
            </View>
          ) : similarBooks.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md }}
            >
              {similarBooks.map((similarBook) => (
                <DiscoveryBookCard
                  key={similarBook.id}
                  book={similarBook}
                  onPress={() => handleSimilarPress(similarBook)}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.emptyContainer, { paddingHorizontal: theme.spacing.lg }]}>
              <Text variant="body" muted>
                No similar books found.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
  },
  coverImage: {
    width: 180,
    height: 270,
  },
  coverPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    textAlign: 'center',
  },
  author: {
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  metaItem: {
    alignItems: 'center',
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genreChip: {
    marginBottom: 4,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 16,
  },
});
