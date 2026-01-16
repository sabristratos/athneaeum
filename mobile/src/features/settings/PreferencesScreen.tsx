import React, { useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, Card, IconButton } from '@/components';
import { useTheme } from '@/themes';
import { useGroupedPreferences } from '@/database/hooks';
import { useGenresQuery } from '@/queries/usePreferences';
import {
  AuthorPreferenceSection,
  GenrePreferenceSection,
  SeriesPreferenceSection,
} from '@/components/organisms/preferences';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import type { MainStackParamList } from '@/navigation/MainNavigator';

export function PreferencesScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const isScholar = themeName === 'scholar';

  const { grouped, loading } = useGroupedPreferences();
  const { refetch: refetchGenres, isRefetching } = useGenresQuery();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchGenres();
    setRefreshing(false);
  };

  if (loading && !grouped) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          Favorites & Excludes
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        <Card variant="filled" padding="md" style={{ marginBottom: theme.spacing.xl }}>
          <Text variant="caption" style={{ color: theme.colors.foregroundMuted }}>
            {isScholar
              ? 'Curate your reading experience. Favorites are prioritized in search, excludes are filtered out.'
              : 'Personalize your discovery! Long press for quick state selection.'}
          </Text>
        </Card>

        <View style={{ marginBottom: theme.spacing.xl }}>
          <AuthorPreferenceSection mode="settings" />
        </View>

        <View style={{ marginBottom: theme.spacing.xl }}>
          <GenrePreferenceSection mode="settings" />
        </View>

        <View style={{ marginBottom: theme.spacing.xl }}>
          <SeriesPreferenceSection />
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
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
