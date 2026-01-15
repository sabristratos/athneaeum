import React from 'react';
import { View, StyleSheet, ScrollView, Pressable as RNPressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import { ArrowLeft02Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { SPRINGS } from '@/animations/constants';
import type { BookFormat } from '@/stores/preferencesStore';

interface PreferencesStepProps {
  selectedFormats: BookFormat[];
  selectedGenres: string[];
  popularGenres: string[];
  onToggleFormat: (format: BookFormat) => void;
  onToggleGenre: (genre: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const FORMAT_OPTIONS: { key: BookFormat; label: string }[] = [
  { key: 'physical', label: 'Physical Books' },
  { key: 'ebook', label: 'E-books' },
  { key: 'audiobook', label: 'Audiobooks' },
];

export function PreferencesStep({
  selectedFormats,
  selectedGenres,
  popularGenres,
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
        <RNPressable onPress={onBack} style={styles.backButton}>
          <Icon
            icon={ArrowLeft02Icon}
            size={24}
            color={theme.colors.foreground}
          />
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

          <Text
            variant="caption"
            style={[
              styles.sectionHint,
              {
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            Select all that apply
          </Text>

          <View style={styles.formatsGrid}>
            {FORMAT_OPTIONS.map(({ key, label }) => (
              <FormatChip
                key={key}
                format={key}
                label={label}
                isSelected={selectedFormats.includes(key)}
                onToggle={() => onToggleFormat(key)}
                theme={theme}
              />
            ))}
          </View>
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

          <Text
            variant="caption"
            style={[
              styles.sectionHint,
              {
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            This helps us personalize your experience
          </Text>

          <View style={styles.genresGrid}>
            {popularGenres.map((genre) => (
              <GenreChip
                key={genre}
                genre={genre}
                isSelected={selectedGenres.includes(genre)}
                onToggle={() => onToggleGenre(genre)}
                theme={theme}
              />
            ))}
          </View>
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

interface FormatChipProps {
  format: BookFormat;
  label: string;
  isSelected: boolean;
  onToggle: () => void;
  theme: any;
}

function FormatChip({ label, isSelected, onToggle, theme }: FormatChipProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(
      isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
      SPRINGS.snappy
    ),
    borderColor: withSpring(
      isSelected ? theme.colors.primary : theme.colors.border,
      SPRINGS.snappy
    ),
  }));

  return (
    <RNPressable onPress={onToggle} style={styles.formatChipWrapper}>
      <Animated.View
        style={[
          styles.formatChip,
          { borderRadius: theme.radii.md, borderWidth: 1 },
          animatedStyle,
        ]}
      >
        {isSelected && (
          <Icon
            icon={Tick02Icon}
            size={16}
            color={theme.colors.onPrimary}
            style={styles.chipIcon}
          />
        )}
        <Text
          style={[
            styles.formatText,
            {
              color: isSelected
                ? theme.colors.onPrimary
                : theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {label}
        </Text>
      </Animated.View>
    </RNPressable>
  );
}

interface GenreChipProps {
  genre: string;
  isSelected: boolean;
  onToggle: () => void;
  theme: any;
}

function GenreChip({ genre, isSelected, onToggle, theme }: GenreChipProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(
      isSelected ? theme.colors.primary : theme.colors.surfaceAlt,
      SPRINGS.snappy
    ),
    borderColor: withSpring(
      isSelected ? theme.colors.primary : theme.colors.border,
      SPRINGS.snappy
    ),
  }));

  return (
    <RNPressable onPress={onToggle}>
      <Animated.View
        style={[
          styles.genreChip,
          { borderRadius: theme.radii.full, borderWidth: 1 },
          animatedStyle,
        ]}
      >
        {isSelected && (
          <Icon
            icon={Tick02Icon}
            size={14}
            color={theme.colors.onPrimary}
            style={styles.chipIcon}
          />
        )}
        <Text
          style={[
            styles.genreText,
            {
              color: isSelected
                ? theme.colors.onPrimary
                : theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {genre}
        </Text>
      </Animated.View>
    </RNPressable>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
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
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
  },
  formatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  formatChipWrapper: {
    flex: 1,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '500',
  },
  genresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipIcon: {
    marginRight: 6,
  },
  genreText: {
    fontSize: 14,
  },
  footer: {
    paddingVertical: 24,
    width: '100%',
  },
});
