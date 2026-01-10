import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line, Rect, G, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import type { BookStatus } from '@/types';

interface LibraryEmptyStateProps {
  activeTab: BookStatus | 'all';
}

// Scholar: Dusty wooden shelf with cobweb
function ScholarIllustration() {
  const { theme } = useTheme();
  const shelfColor = theme.colors.surfaceHover;
  const cobwebColor = theme.colors.foregroundFaint;
  const dustColor = theme.colors.foregroundSubtle;

  return (
    <Svg width={200} height={140} viewBox="0 0 200 140">
      <Defs>
        <LinearGradient id="shelfGradient" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={shelfColor} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.colors.surfaceAlt} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Shelf back */}
      <Rect x="20" y="60" width="160" height="50" fill="url(#shelfGradient)" rx="2" />

      {/* Shelf edge highlight */}
      <Line x1="20" y1="60" x2="180" y2="60" stroke={theme.colors.border} strokeWidth="1" />

      {/* Shelf bottom shadow */}
      <Rect x="20" y="106" width="160" height="4" fill={theme.colors.canvas} opacity="0.6" rx="1" />

      {/* Cobweb in corner */}
      <G opacity="0.6">
        {/* Main web lines */}
        <Path
          d="M20 60 Q50 75 20 90"
          stroke={cobwebColor}
          strokeWidth="0.5"
          fill="none"
        />
        <Path
          d="M20 60 L60 60"
          stroke={cobwebColor}
          strokeWidth="0.5"
          fill="none"
        />
        <Path
          d="M20 60 L45 85"
          stroke={cobwebColor}
          strokeWidth="0.5"
          fill="none"
        />
        {/* Cross threads */}
        <Path
          d="M25 65 Q35 70 30 80"
          stroke={cobwebColor}
          strokeWidth="0.3"
          fill="none"
        />
        <Path
          d="M30 63 Q42 72 35 83"
          stroke={cobwebColor}
          strokeWidth="0.3"
          fill="none"
        />
        <Path
          d="M40 61 Q50 73 42 85"
          stroke={cobwebColor}
          strokeWidth="0.3"
          fill="none"
        />
      </G>

      {/* Dust particles */}
      <Circle cx="100" cy="80" r="1" fill={dustColor} opacity="0.4" />
      <Circle cx="130" cy="75" r="0.8" fill={dustColor} opacity="0.3" />
      <Circle cx="150" cy="85" r="1.2" fill={dustColor} opacity="0.5" />
      <Circle cx="80" cy="90" r="0.6" fill={dustColor} opacity="0.3" />

      {/* Faint book outline (ghost of missing book) */}
      <G opacity="0.15">
        <Rect x="90" y="65" width="20" height="40" fill={theme.colors.foreground} rx="1" />
      </G>
    </Svg>
  );
}

// Dreamer: Empty flower pot waiting for seed
function DreamerIllustration() {
  const { theme } = useTheme();
  const potColor = theme.colors.primary;
  const potLight = theme.colors.primaryHover;
  const soilColor = theme.colors.foregroundMuted;
  const accentColor = theme.colors.accent;

  return (
    <Svg width={200} height={140} viewBox="0 0 200 140">
      <Defs>
        <LinearGradient id="potGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={potLight} stopOpacity="1" />
          <Stop offset="0.5" stopColor={potColor} stopOpacity="1" />
          <Stop offset="1" stopColor={theme.colors.primaryDark || potColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Pot body */}
      <Path
        d="M65 70 L70 120 Q100 125 130 120 L135 70 Z"
        fill="url(#potGradient)"
      />

      {/* Pot rim */}
      <Path
        d="M60 65 Q100 60 140 65 L140 75 Q100 70 60 75 Z"
        fill={potLight}
      />

      {/* Soil */}
      <Path
        d="M72 75 Q100 72 128 75 L126 85 Q100 82 74 85 Z"
        fill={soilColor}
        opacity="0.6"
      />

      {/* Tiny seed (the hope) */}
      <G>
        <Circle cx="100" cy="80" r="4" fill={accentColor} opacity="0.8" />
        {/* Seed shine */}
        <Circle cx="98" cy="78" r="1" fill={theme.colors.surface} opacity="0.4" />
      </G>

      {/* Small sprout hint (very subtle) */}
      <Path
        d="M100 76 Q102 68 100 60"
        stroke={accentColor}
        strokeWidth="1"
        strokeDasharray="2,2"
        fill="none"
        opacity="0.3"
      />

      {/* Decorative hearts floating */}
      <G opacity="0.2">
        <Path
          d="M50 45 C50 40 55 38 58 42 C61 38 66 40 66 45 C66 50 58 56 58 56 C58 56 50 50 50 45"
          fill={theme.colors.primary}
        />
        <Path
          d="M145 50 C145 46 149 44 151 47 C153 44 157 46 157 50 C157 54 151 58 151 58 C151 58 145 54 145 50"
          fill={theme.colors.accent}
          transform="scale(0.7) translate(65, 20)"
        />
      </G>

      {/* Ground line */}
      <Path
        d="M40 125 Q100 130 160 125"
        stroke={theme.colors.border}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

// Wanderer: Rolled-up empty map with compass
function WandererIllustration() {
  const { theme } = useTheme();
  const mapColor = theme.colors.paper;
  const mapEdge = theme.colors.border;
  const compassColor = theme.colors.primary;
  const accentColor = theme.colors.accent;

  return (
    <Svg width={200} height={140} viewBox="0 0 200 140">
      <Defs>
        <LinearGradient id="mapGradient" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={mapEdge} stopOpacity="0.3" />
          <Stop offset="0.2" stopColor={mapColor} stopOpacity="1" />
          <Stop offset="0.8" stopColor={mapColor} stopOpacity="1" />
          <Stop offset="1" stopColor={mapEdge} stopOpacity="0.3" />
        </LinearGradient>
      </Defs>

      {/* Rolled map */}
      <G>
        {/* Map body (rolled) */}
        <Path
          d="M40 50 L40 110 Q45 115 50 110 L50 50 Q45 45 40 50"
          fill="url(#mapGradient)"
          stroke={mapEdge}
          strokeWidth="1"
        />

        {/* Unrolled portion */}
        <Path
          d="M50 50 Q100 45 150 50 L150 110 Q100 115 50 110 Z"
          fill={mapColor}
          stroke={mapEdge}
          strokeWidth="1"
        />

        {/* Map grid lines (faint) */}
        <G opacity="0.15">
          <Line x1="70" y1="50" x2="70" y2="110" stroke={theme.colors.foreground} strokeWidth="0.5" />
          <Line x1="100" y1="48" x2="100" y2="112" stroke={theme.colors.foreground} strokeWidth="0.5" />
          <Line x1="130" y1="50" x2="130" y2="110" stroke={theme.colors.foreground} strokeWidth="0.5" />
          <Line x1="55" y1="70" x2="150" y2="70" stroke={theme.colors.foreground} strokeWidth="0.5" />
          <Line x1="55" y1="90" x2="150" y2="90" stroke={theme.colors.foreground} strokeWidth="0.5" />
        </G>

        {/* "X marks the spot" placeholder (dashed) */}
        <G opacity="0.3">
          <Path
            d="M95 75 L105 85 M105 75 L95 85"
            stroke={compassColor}
            strokeWidth="2"
            strokeDasharray="3,2"
            strokeLinecap="round"
          />
        </G>
      </G>

      {/* Compass */}
      <G transform="translate(160, 30)">
        {/* Outer ring */}
        <Circle cx="0" cy="0" r="18" fill={theme.colors.surface} stroke={compassColor} strokeWidth="2" />

        {/* Inner ring */}
        <Circle cx="0" cy="0" r="12" fill="none" stroke={mapEdge} strokeWidth="1" />

        {/* Cardinal directions */}
        <G>
          {/* North needle */}
          <Path d="M0 -10 L3 0 L0 -2 L-3 0 Z" fill={compassColor} />
          {/* South needle */}
          <Path d="M0 10 L3 0 L0 2 L-3 0 Z" fill={accentColor} opacity="0.6" />
        </G>

        {/* Center pin */}
        <Circle cx="0" cy="0" r="2" fill={compassColor} />

        {/* Direction markers */}
        <SvgText
          x="0"
          y="-6"
          fill={theme.colors.foreground}
          fontSize="4"
          textAnchor="middle"
          fontWeight="bold"
        >
          N
        </SvgText>
      </G>

      {/* Decorative rope/tie */}
      <Path
        d="M42 55 Q35 60 42 65"
        stroke={theme.colors.foregroundMuted}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function getEmptyStateContent(activeTab: BookStatus | 'all', themeName: string) {
  const tabMessages: Record<string, { title: string; subtitle: string }> = {
    all: {
      title:
        themeName === 'scholar'
          ? 'The archives are incomplete.'
          : themeName === 'dreamer'
            ? 'Ready to plant something new?'
            : 'Your journey awaits.',
      subtitle:
        themeName === 'scholar'
          ? 'Search the stacks to discover your next read.'
          : themeName === 'dreamer'
            ? 'Search for books and watch your garden grow.'
            : 'Search for books to chart your reading adventure.',
    },
    reading: {
      title:
        themeName === 'scholar'
          ? 'No tomes currently open.'
          : themeName === 'dreamer'
            ? 'Nothing blooming yet.'
            : 'No trails being blazed.',
      subtitle: 'Start reading a book to see it here.',
    },
    want_to_read: {
      title:
        themeName === 'scholar'
          ? 'The queue stands empty.'
          : themeName === 'dreamer'
            ? 'Your wishlist is waiting.'
            : 'No destinations marked.',
      subtitle: 'Add books you want to read later.',
    },
    read: {
      title:
        themeName === 'scholar'
          ? 'No completed volumes yet.'
          : themeName === 'dreamer'
            ? 'No flowers in bloom yet.'
            : 'No journeys completed.',
      subtitle: 'Finish reading a book to see it here.',
    },
    dnf: {
      title:
        themeName === 'scholar'
          ? 'No abandoned manuscripts.'
          : themeName === 'dreamer'
            ? 'No wilted stories here.'
            : 'No paths abandoned.',
      subtitle: "Books you didn't finish will appear here.",
    },
  };

  return tabMessages[activeTab] || tabMessages.all;
}

export function LibraryEmptyState({ activeTab }: LibraryEmptyStateProps) {
  const { theme, themeName } = useTheme();
  const content = getEmptyStateContent(activeTab, themeName);

  const Illustration =
    themeName === 'scholar'
      ? ScholarIllustration
      : themeName === 'dreamer'
        ? DreamerIllustration
        : WandererIllustration;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      style={[styles.container, { paddingVertical: theme.spacing.xl }]}
    >
      <View style={styles.illustrationContainer}>
        <Illustration />
      </View>

      <Text
        variant="h3"
        style={[
          styles.title,
          {
            color: theme.colors.foregroundMuted,
            marginTop: theme.spacing.lg,
            fontFamily: theme.fonts.heading,
          },
        ]}
      >
        {content.title}
      </Text>

      <Text
        variant="body"
        style={[
          styles.subtitle,
          {
            color: theme.colors.foregroundSubtle,
            marginTop: theme.spacing.sm,
            fontFamily: theme.fonts.body,
          },
        ]}
      >
        {content.subtitle}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    maxWidth: 280,
  },
});
