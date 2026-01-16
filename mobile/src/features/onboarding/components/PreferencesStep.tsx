import React from 'react';
import { View, StyleSheet, ScrollView, Pressable as RNPressable } from 'react-native';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import {
  FormatPreferenceSection,
  GenrePreferenceSection,
} from '@/components/organisms/preferences';
import { ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import type { BookFormat } from '@/database/hooks/useFormatPreferences';

interface PreferencesStepProps {
  selectedFormats: BookFormat[];
  selectedGenres: string[];
  formatError: string | null;
  onToggleFormat: (format: BookFormat) => void;
  onToggleGenre: (genre: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function PreferencesStep({
  selectedFormats,
  selectedGenres,
  formatError,
  onToggleFormat,
  onToggleGenre,
  onNext,
  onBack,
}: PreferencesStepProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNPressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back to theme selection"
          accessibilityRole="button"
        >
          <Icon icon={ArrowLeft02Icon} size={24} color={theme.colors.foreground} />
        </RNPressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text
          variant="h2"
          style={[
            styles.title,
            {
              color: theme.colors.foreground,
              fontFamily: theme.fonts.heading,
            },
          ]}
        >
          {isScholar ? 'Reading Preferences' : 'A Few Quick Questions'}
        </Text>

        <View style={styles.section}>
          <Text
            variant="label"
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.foreground,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            {isScholar ? 'How do you prefer to read?' : 'How do you read?'}
          </Text>

          <FormatPreferenceSection
            selectedFormats={selectedFormats}
            onToggleFormat={onToggleFormat}
            error={formatError}
            showHeader={false}
            showDescription
          />
        </View>

        <View style={styles.section}>
          <Text
            variant="label"
            style={[
              styles.sectionTitle,
              {
                color: theme.colors.foreground,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            {isScholar
              ? 'Select your favorite genres (optional)'
              : 'Pick genres you love (optional)'}
          </Text>

          <GenrePreferenceSection
            mode="onboarding"
            localSelectedGenres={selectedGenres}
            onLocalToggle={onToggleGenre}
            showHeader={false}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button variant="primary" size="lg" onPress={onNext} fullWidth>
          <Text
            style={{
              color: theme.colors.onPrimary,
              fontFamily: theme.fonts.body,
              fontWeight: '600',
              fontSize: 16,
            }}
          >
            Continue
          </Text>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    height: 48,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  footer: {
    paddingVertical: 24,
    width: '100%',
  },
});
