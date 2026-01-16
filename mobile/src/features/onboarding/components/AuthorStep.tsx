import React from 'react';
import { View, StyleSheet, Pressable as RNPressable } from 'react-native';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import { AuthorPreferenceSection } from '@/components/organisms/preferences';
import { ArrowLeft02Icon, UserIcon } from '@hugeicons/core-free-icons';

interface AuthorStepProps {
  selectedAuthors: string[];
  onAddAuthor: (name: string) => void;
  onRemoveAuthor: (name: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function AuthorStep({
  selectedAuthors,
  onAddAuthor,
  onRemoveAuthor,
  onNext,
  onBack,
}: AuthorStepProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handleSkip = () => {
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNPressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back to preferences"
          accessibilityRole="button"
        >
          <Icon
            icon={ArrowLeft02Icon}
            size={24}
            color={theme.colors.foreground}
          />
        </RNPressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Icon icon={UserIcon} size={48} color={theme.colors.primary} />
        </View>

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
          {isScholar ? 'Favorite Authors' : 'Authors You Love'}
        </Text>

        <Text
          variant="body"
          style={[
            styles.subtitle,
            {
              color: theme.colors.foregroundMuted,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {isScholar
            ? 'Add authors whose works you admire (optional)'
            : 'Search for your favorite authors (optional)'}
        </Text>

        <AuthorPreferenceSection
          mode="onboarding"
          localSelectedAuthors={selectedAuthors}
          onLocalAdd={onAddAuthor}
          onLocalRemove={onRemoveAuthor}
          showHeader={false}
        />
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          onPress={onNext}
          disabled={false}
          fullWidth
        >
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

        {selectedAuthors.length === 0 && (
          <RNPressable
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityLabel="Skip author selection"
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.skipText,
                {
                  color: theme.colors.foregroundMuted,
                  fontFamily: theme.fonts.body,
                },
              ]}
            >
              Skip for now
            </Text>
          </RNPressable>
        )}
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
  content: {
    flex: 1,
    paddingTop: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  footer: {
    paddingVertical: 24,
    gap: 16,
    width: '100%',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 15,
  },
});
