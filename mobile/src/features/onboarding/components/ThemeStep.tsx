import React from 'react';
import { View, StyleSheet, Pressable as RNPressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import { Tick02Icon, ArrowLeft02Icon } from '@hugeicons/core-free-icons';
import { SPRINGS } from '@/animations/constants';
import { EDITION_LABELS, EDITION_DESCRIPTIONS } from '@/stores/themeStore';
import type { ThemeName } from '@/types/theme';
import { scholarTheme, dreamerTheme, wandererTheme, midnightTheme } from '@/themes/themes';

interface ThemeStepProps {
  selectedTheme: ThemeName;
  onSelectTheme: (theme: ThemeName) => void;
  onNext: () => void;
  onBack: () => void;
}

const THEMES: { name: ThemeName; theme: typeof scholarTheme }[] = [
  { name: 'scholar', theme: scholarTheme },
  { name: 'dreamer', theme: dreamerTheme },
  { name: 'wanderer', theme: wandererTheme },
  { name: 'midnight', theme: midnightTheme },
];

export function ThemeStep({
  selectedTheme,
  onSelectTheme,
  onNext,
  onBack,
}: ThemeStepProps) {
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

      <View style={styles.content}>
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
          Choose Your Edition
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
            ? 'Select an aesthetic that resonates with your reading soul'
            : 'Pick a look that feels like home'}
        </Text>

        <View style={styles.themesGrid}>
          {THEMES.map(({ name, theme: themeData }) => (
            <ThemeCard
              key={name}
              themeName={name}
              themeData={themeData}
              isSelected={selectedTheme === name}
              onSelect={() => onSelectTheme(name)}
              currentTheme={theme}
            />
          ))}
        </View>
      </View>

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

interface ThemeCardProps {
  themeName: ThemeName;
  themeData: typeof scholarTheme;
  isSelected: boolean;
  onSelect: () => void;
  currentTheme: typeof scholarTheme;
}

function ThemeCard({
  themeName,
  themeData,
  isSelected,
  onSelect,
  currentTheme,
}: ThemeCardProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(isSelected ? 1.02 : 1, SPRINGS.snappy) }],
    borderWidth: withSpring(isSelected ? 2 : 1, SPRINGS.snappy),
    borderColor: isSelected
      ? currentTheme.colors.primary
      : currentTheme.colors.border,
  }));

  return (
    <RNPressable onPress={onSelect}>
      <Animated.View
        style={[
          styles.themeCard,
          {
            backgroundColor: themeData.colors.surface,
            borderRadius: currentTheme.radii.lg,
          },
          animatedStyle,
        ]}
      >
        {isSelected && (
          <View
            style={[
              styles.checkBadge,
              {
                backgroundColor: currentTheme.colors.primary,
                borderRadius: currentTheme.radii.full,
              },
            ]}
          >
            <Icon icon={Tick02Icon} size={14} color={currentTheme.colors.onPrimary} />
          </View>
        )}

        <View style={styles.colorPreview}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: themeData.colors.primary },
            ]}
          />
          <View
            style={[
              styles.colorDot,
              { backgroundColor: themeData.colors.accent },
            ]}
          />
          <View
            style={[
              styles.colorDot,
              { backgroundColor: themeData.colors.surface },
              { borderWidth: 1, borderColor: themeData.colors.border },
            ]}
          />
        </View>

        <Text
          style={[
            styles.themeName,
            {
              color: themeData.colors.foreground,
              fontFamily: themeData.fonts.heading,
            },
          ]}
        >
          {EDITION_LABELS[themeName].replace(' Edition', '')}
        </Text>

        <Text
          style={[
            styles.themeDescription,
            {
              color: themeData.colors.foregroundMuted,
              fontFamily: themeData.fonts.body,
            },
          ]}
        >
          {EDITION_DESCRIPTIONS[themeName]}
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
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  themeCard: {
    width: 155,
    padding: 16,
    alignItems: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  themeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 12,
  },
  footer: {
    paddingVertical: 24,
    width: '100%',
  },
});
