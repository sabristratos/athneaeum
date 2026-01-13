import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, ActivityIndicator, Linking } from 'react-native';
import { FavouriteIcon, Cancel01Icon, LinkSquare01Icon, Add01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { Text, Button, Icon, BottomSheet, Card, SectionHeader, IconButton, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { useAuthorDetailQuery, useAuthorWorksQuery } from '@/queries/useAuthors';
import { useLibraryExternalIdsQuery } from '@/queries/useLibraryExternalIds';
import { booksApi } from '@/api/books';
import { useLibrary } from '@/hooks/useBooks';
import { useToast } from '@/stores/toastStore';
import type { OpenLibraryWork, BookStatus } from '@/types';

interface AuthorDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  authorKey: string;
  authorName: string;
  onFavorite?: () => void;
  onExclude?: () => void;
  isFavorite?: boolean;
  isExcluded?: boolean;
}

const WORKS_PAGE_SIZE = 10;

export function AuthorDetailSheet({
  visible,
  onClose,
  authorKey,
  authorName,
  onFavorite,
  onExclude,
  isFavorite = false,
  isExcluded = false,
}: AuthorDetailSheetProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const toast = useToast();
  const { addToLibrary } = useLibrary();
  const [addingWorkKey, setAddingWorkKey] = useState<string | null>(null);
  const [addedWorkKeys, setAddedWorkKeys] = useState<Set<string>>(new Set());
  const [worksOffset, setWorksOffset] = useState(0);
  const [allWorks, setAllWorks] = useState<OpenLibraryWork[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const { data: authorDetail, isLoading: loadingDetail } = useAuthorDetailQuery(
    visible ? authorKey : ''
  );
  const { data: worksData, isLoading: loadingWorks } = useAuthorWorksQuery(
    visible ? authorKey : '',
    WORKS_PAGE_SIZE,
    worksOffset
  );

  React.useEffect(() => {
    if (worksData?.items) {
      if (worksOffset === 0) {
        setAllWorks(worksData.items);
      } else {
        setAllWorks((prev) => [...prev, ...worksData.items]);
      }
      setLoadingMore(false);
    }
  }, [worksData, worksOffset]);

  React.useEffect(() => {
    if (!visible) {
      setWorksOffset(0);
      setAllWorks([]);
      setAddedWorkKeys(new Set());
    }
  }, [visible]);

  const hasMoreWorks = worksData?.hasMore ?? false;

  const handleLoadMore = () => {
    if (hasMoreWorks && !loadingMore) {
      setLoadingMore(true);
      setWorksOffset((prev) => prev + WORKS_PAGE_SIZE);
    }
  };

  const handleOpenWikipedia = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        toast.danger('Cannot open link');
      }
    } catch {
      toast.danger('Failed to open link');
    }
  };

  const handleAddWorkToLibrary = async (work: OpenLibraryWork, status: BookStatus = 'want_to_read') => {
    setAddingWorkKey(work.key);
    try {
      const coverUrl = work.cover_id
        ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg`
        : undefined;

      await addToLibrary({
        external_id: work.key,
        external_provider: 'openlibrary',
        title: work.title,
        author: authorName,
        cover_url: coverUrl,
        published_date: work.first_publish_year ? `${work.first_publish_year}-01-01` : undefined,
        genres: work.subjects?.slice(0, 5),
        status,
      });

      setAddedWorkKeys((prev) => new Set(prev).add(work.key));
      toast.success('Added to library');
    } catch {
      toast.danger('Failed to add book');
    } finally {
      setAddingWorkKey(null);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={authorName}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingDetail ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : (
          <>
            {authorDetail?.photo_url && (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: authorDetail.photo_url }}
                  style={[
                    styles.photo,
                    { borderRadius: isScholar ? theme.radii.sm : theme.radii.lg },
                  ]}
                />
              </View>
            )}

            {authorDetail?.bio && (
              <Card variant="filled" style={{ marginBottom: theme.spacing.md }}>
                <Text variant="body" style={{ lineHeight: 22 }}>
                  {authorDetail.bio.length > 500
                    ? `${authorDetail.bio.substring(0, 500)}...`
                    : authorDetail.bio}
                </Text>
              </Card>
            )}

            {authorDetail?.birth_date && (
              <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
                {authorDetail.birth_date}
                {authorDetail.death_date && ` – ${authorDetail.death_date}`}
              </Text>
            )}

            <View style={[styles.actions, { marginTop: theme.spacing.md }]}>
              <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                <Button
                  variant={isFavorite ? 'primary' : 'outline'}
                  onPress={onFavorite}
                  fullWidth
                >
                  <Icon
                    icon={FavouriteIcon}
                    size={18}
                    color={isFavorite ? theme.colors.onPrimary : theme.colors.primary}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: isFavorite ? theme.colors.onPrimary : theme.colors.primary,
                      fontWeight: '600',
                    }}
                  >
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </Text>
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  variant={isExcluded ? 'danger' : 'outline'}
                  onPress={onExclude}
                  fullWidth
                >
                  <Icon
                    icon={Cancel01Icon}
                    size={18}
                    color={isExcluded ? theme.colors.onPrimary : theme.colors.danger}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: isExcluded ? theme.colors.onPrimary : theme.colors.danger,
                      fontWeight: '600',
                    }}
                  >
                    {isExcluded ? 'Excluded' : 'Exclude'}
                  </Text>
                </Button>
              </View>
            </View>

            {(allWorks.length > 0 || loadingWorks) && (
              <View style={{ marginTop: theme.spacing.xl }}>
                <SectionHeader
                  title={worksData?.totalItems ? `Notable Works (${worksData.totalItems})` : 'Notable Works'}
                />
                {loadingWorks && worksOffset === 0 ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <>
                    {allWorks.map((work) => (
                      <WorkItem
                        key={work.key}
                        work={work}
                        isAdding={addingWorkKey === work.key}
                        isAdded={addedWorkKeys.has(work.key)}
                        onAdd={() => handleAddWorkToLibrary(work)}
                      />
                    ))}
                    {hasMoreWorks && (
                      <View style={{ marginTop: theme.spacing.md }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={handleLoadMore}
                          loading={loadingMore}
                          fullWidth
                        >
                          {loadingMore ? 'Loading...' : 'Load More Works'}
                        </Button>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}

            {authorDetail?.wikipedia_url && (
              <Pressable
                onPress={() => handleOpenWikipedia(authorDetail.wikipedia_url!)}
                haptic="light"
              >
                <Card
                  variant="outlined"
                  style={{ marginTop: theme.spacing.lg, padding: theme.spacing.md }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Icon
                      icon={LinkSquare01Icon}
                      size={18}
                      color={theme.colors.primary}
                    />
                    <Text variant="caption" style={{ marginLeft: 8, color: theme.colors.primary }}>
                      More on Wikipedia
                    </Text>
                  </View>
                </Card>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

interface WorkItemProps {
  work: OpenLibraryWork;
  isAdding: boolean;
  isAdded: boolean;
  onAdd: () => void;
}

function WorkItem({ work, isAdding, isAdded, onAdd }: WorkItemProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const coverUrl = work.cover_id
    ? `https://covers.openlibrary.org/b/id/${work.cover_id}-S.jpg`
    : null;

  return (
    <View style={[styles.workItem, { borderBottomColor: theme.colors.border }]}>
      {coverUrl && (
        <Image source={{ uri: coverUrl }} style={styles.workCover} />
      )}
      <View style={styles.workContent}>
        <Text variant="body" numberOfLines={2}>
          {work.title}
        </Text>
        <Text variant="caption" muted>
          {work.first_publish_year && `${work.first_publish_year} · `}
          {work.edition_count} editions
        </Text>
      </View>
      <View style={{ justifyContent: 'center', marginLeft: theme.spacing.sm }}>
        {isAdded ? (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              backgroundColor: theme.colors.success,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon icon={Tick01Icon} size={16} color={theme.colors.onPrimary} />
          </View>
        ) : (
          <IconButton
            icon={Add01Icon}
            size="sm"
            variant="primary"
            onPress={onAdd}
            loading={isAdding}
            accessibilityLabel={`Add ${work.title} to library`}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 160,
  },
  actions: {
    flexDirection: 'row',
  },
  workItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  workCover: {
    width: 40,
    height: 60,
    borderRadius: 4,
    marginRight: 12,
  },
  workContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
