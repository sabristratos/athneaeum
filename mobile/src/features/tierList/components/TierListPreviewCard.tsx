import React, { useMemo } from 'react';
import { View, Image, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Analytics01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, Icon, Card } from '@/components';
import { useTheme } from '@/themes';
import { useLibrary } from '@/hooks/useBooks';
import type { MainStackParamList } from '@/navigation/MainNavigator';

export function TierListPreviewCard() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { books } = useLibrary();

  const ratedBooks = useMemo(
    () => books.filter((b) => b.status === 'read' && b.rating && b.rating > 0),
    [books]
  );

  const topCovers = useMemo(
    () =>
      ratedBooks
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
        .slice(0, 3)
        .map((b) => b.book.cover_url)
        .filter((url): url is string => !!url),
    [ratedBooks]
  );

  const handlePress = () => {
    triggerHaptic('light');
    navigation.navigate('TierList');
  };

  return (
    <Pressable onPress={handlePress}>
      <Card
        variant="elevated"
        style={{
          ...styles.card,
          width: 200,
          borderRadius: isScholar ? theme.radii.md : theme.radii.lg,
        }}
      >
        <View style={styles.previewContainer}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primarySubtle,
                borderRadius: theme.radii.md,
              },
            ]}
          >
            <Icon icon={Analytics01Icon} size={28} color={theme.colors.primary} />
          </View>

          {topCovers.length > 0 && (
            <View style={styles.coversStack}>
              {topCovers.map((coverUrl, index) => (
                <Image
                  key={index}
                  source={{ uri: coverUrl }}
                  style={[
                    styles.coverImage,
                    {
                      borderRadius: theme.radii.xs,
                      marginLeft: index > 0 ? -16 : 0,
                      zIndex: topCovers.length - index,
                    },
                  ]}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text variant="label" style={{ fontWeight: '600' }}>
            Tier List
          </Text>
          <Text variant="caption" muted style={{ marginTop: 2 }}>
            {ratedBooks.length > 0
              ? `${ratedBooks.length} rated books`
              : 'Rate books to create'}
          </Text>
        </View>

        <View
          style={[
            styles.footer,
            {
              borderTopWidth: theme.borders.thin,
              borderTopColor: theme.colors.border,
              marginTop: theme.spacing.md,
              paddingTop: theme.spacing.sm,
            },
          ]}
        >
          <Text
            variant="caption"
            style={{ color: theme.colors.primary, fontWeight: '600' }}
          >
            Create & Share
          </Text>
          <Icon icon={ArrowRight01Icon} size={14} color={theme.colors.primary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  previewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coversStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverImage: {
    width: 36,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  content: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
