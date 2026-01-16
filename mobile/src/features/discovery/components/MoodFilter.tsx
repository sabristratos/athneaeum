import React, { memo, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Coffee01Icon,
  FlashIcon,
  Rocket01Icon,
  Idea01Icon,
  Cancel01Icon,
  FavouriteIcon,
  MagicWand01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Text, Icon, Pressable } from '@/components';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';
import { triggerHaptic } from '@/hooks/useHaptic';

export interface Mood {
  id: string;
  label: string;
  icon: IconSvgElement;
}

const MOODS: Mood[] = [
  { id: 'cozy', label: 'Cozy', icon: Coffee01Icon },
  { id: 'tense', label: 'Intense', icon: FlashIcon },
  { id: 'thought_provoking', label: 'Thoughtful', icon: Idea01Icon },
  { id: 'romantic', label: 'Romantic', icon: FavouriteIcon },
  { id: 'adventurous', label: 'Adventurous', icon: Rocket01Icon },
  { id: 'mysterious', label: 'Mysterious', icon: MagicWand01Icon },
];

interface MoodChipProps {
  mood: Mood;
  isSelected: boolean;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(
  View as React.ComponentType<any>
);

function MoodChip({ mood, isSelected, onPress }: MoodChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, SPRINGS.snappy);
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRINGS.snappy);
  }, []);

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;
  const iconColor = isSelected ? theme.colors.primary : theme.colors.foregroundMuted;
  const textColor = isSelected ? theme.colors.primary : theme.colors.foreground;

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: isSelected ? theme.colors.tintPrimary : theme.colors.surface,
            borderRadius,
            borderWidth: theme.borders.thin,
            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          },
          animatedStyle,
        ]}
      >
        <Icon icon={mood.icon} size={16} color={iconColor} />
        <Text
          variant="caption"
          style={{
            color: textColor,
            fontWeight: isSelected ? '600' : '400',
            marginLeft: 6,
          }}
        >
          {mood.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

interface ClearChipProps {
  onPress: () => void;
}

function ClearChip({ onPress }: ClearChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const handlePress = useCallback(() => {
    triggerHaptic('light');
    onPress();
  }, [onPress]);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  return (
    <Pressable onPress={handlePress}>
      <View
        style={[
          styles.chip,
          styles.clearChip,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderRadius,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.borderMuted,
          },
        ]}
      >
        <Icon icon={Cancel01Icon} size={14} color={theme.colors.foregroundMuted} />
      </View>
    </Pressable>
  );
}

interface MoodFilterProps {
  selectedMoods: string[];
  onMoodToggle: (moodId: string) => void;
  onClearMoods: () => void;
}

function MoodFilterComponent({
  selectedMoods,
  onMoodToggle,
  onClearMoods,
}: MoodFilterProps) {
  const { theme } = useTheme();

  const hasSelection = selectedMoods.length > 0;

  return (
    <View style={styles.container}>
      <Text
        variant="caption"
        style={{
          color: theme.colors.foregroundMuted,
          marginBottom: theme.spacing.sm,
        }}
      >
        What are you in the mood for?
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {MOODS.map((mood) => (
          <MoodChip
            key={mood.id}
            mood={mood}
            isSelected={selectedMoods.includes(mood.id)}
            onPress={() => onMoodToggle(mood.id)}
          />
        ))}
        {hasSelection && <ClearChip onPress={onClearMoods} />}
      </ScrollView>
    </View>
  );
}

export const MoodFilter = memo(MoodFilterComponent);

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearChip: {
    paddingHorizontal: 10,
  },
});
