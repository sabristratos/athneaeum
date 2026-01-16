import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text, Pressable, Icon } from '@/components';
import { Card } from '@/components/organisms/cards';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { useGroupedPreferences } from '@/database/hooks/usePreferences';
import { Settings03Icon, UserIcon, Book01Icon } from '@hugeicons/core-free-icons';
import type { MainStackParamList } from '@/navigation/MainNavigator';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

export function PreferencesQuickAccess() {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const navigation = useNavigation<NavigationProp>();
  const { grouped, loading } = useGroupedPreferences();

  if (loading) {
    return null;
  }

  const authorCount = grouped.favorite.authors.length;
  const genreCount = grouped.favorite.genres.length;
  const seriesCount = grouped.favorite.series.length;
  const totalPreferences = authorCount + genreCount + seriesCount;

  if (totalPreferences > 0) {
    return null;
  }

  const handlePress = () => {
    navigation.navigate('Preferences');
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <Pressable onPress={handlePress} haptic="light">
        <Card
          variant="outlined"
          style={[
            styles.card,
            {
              borderColor: theme.colors.primarySubtle,
              backgroundColor: theme.colors.primarySubtle,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
            },
          ]}
        >
          <View style={styles.iconContainer}>
            <Icon icon={Settings03Icon} size={24} color={theme.colors.primary} />
          </View>
          <View style={styles.content}>
            <Text
              variant="body"
              style={{ color: theme.colors.foreground, fontWeight: '600' }}
            >
              Personalize your recommendations
            </Text>
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundMuted, marginTop: 4 }}
            >
              Add favorite authors, genres, and series to get better suggestions
            </Text>
          </View>
          <View style={styles.badges}>
            <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
              <Icon icon={UserIcon} size={12} color={theme.colors.foregroundMuted} />
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
              <Icon icon={Book01Icon} size={12} color={theme.colors.foregroundMuted} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: sharedSpacing.lg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: sharedSpacing.md,
    gap: sharedSpacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
