import React, { useState } from 'react';
import { View, StyleSheet, Pressable as RNPressable, TextInput } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/themes';
import { Text, Button, Icon } from '@/components';
import { ArrowLeft02Icon, Target02Icon } from '@hugeicons/core-free-icons';
import { SPRINGS } from '@/animations/constants';

interface GoalStepProps {
  yearlyGoal: number | null;
  onSetGoal: (goal: number | null) => void;
  onNext: () => void;
  onBack: () => void;
}

const PRESET_GOALS = [
  { value: 12, label: '12 books', subtitle: '1 per month' },
  { value: 24, label: '24 books', subtitle: '2 per month' },
  { value: 52, label: '52 books', subtitle: '1 per week' },
];

export function GoalStep({
  yearlyGoal,
  onSetGoal,
  onNext,
  onBack,
}: GoalStepProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const [customGoal, setCustomGoal] = useState('');
  const currentYear = new Date().getFullYear();

  const handleCustomGoalChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomGoal(cleaned);
    const num = parseInt(cleaned, 10);
    if (!isNaN(num) && num > 0) {
      onSetGoal(num);
    } else if (cleaned === '') {
      onSetGoal(null);
    }
  };

  const handlePresetSelect = (value: number) => {
    setCustomGoal('');
    onSetGoal(value);
  };

  const handleSkip = () => {
    onSetGoal(null);
    onNext();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <RNPressable
          onPress={onBack}
          style={styles.backButton}
          accessibilityLabel="Go back to authors"
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
          <Icon icon={Target02Icon} size={48} color={theme.colors.primary} />
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
          {isScholar
            ? `Set a Reading Goal for ${currentYear}`
            : `Reading Goal for ${currentYear}?`}
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
          You can always change this later
        </Text>

        <View style={styles.presetContainer}>
          {PRESET_GOALS.map(({ value, label, subtitle }) => (
            <GoalPresetButton
              key={value}
              value={value}
              label={label}
              subtitle={subtitle}
              isSelected={yearlyGoal === value && customGoal === ''}
              onSelect={() => handlePresetSelect(value)}
              theme={theme}
            />
          ))}
        </View>

        <View style={styles.customContainer}>
          <Text
            variant="caption"
            style={[
              styles.orText,
              {
                color: theme.colors.foregroundMuted,
                fontFamily: theme.fonts.body,
              },
            ]}
          >
            or set your own
          </Text>

          <View
            style={[
              styles.customInput,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                borderColor: customGoal
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
          >
            <TextInput
              value={customGoal}
              onChangeText={handleCustomGoalChange}
              placeholder="Enter number..."
              placeholderTextColor={theme.colors.foregroundMuted}
              keyboardType="number-pad"
              style={[
                styles.input,
                {
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.body,
                },
              ]}
            />
            {customGoal !== '' && (
              <Text
                style={[
                  styles.booksLabel,
                  {
                    color: theme.colors.foregroundMuted,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              >
                books
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          variant="primary"
          size="lg"
          onPress={onNext}
          disabled={yearlyGoal === null}
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
            Set Goal
          </Text>
        </Button>

        <RNPressable onPress={handleSkip} style={styles.skipButton}>
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
      </View>
    </View>
  );
}

interface GoalPresetButtonProps {
  value: number;
  label: string;
  subtitle: string;
  isSelected: boolean;
  onSelect: () => void;
  theme: any;
}

function GoalPresetButton({
  label,
  subtitle,
  isSelected,
  onSelect,
  theme,
}: GoalPresetButtonProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withSpring(
      isSelected ? theme.colors.primarySubtle : theme.colors.surfaceAlt,
      SPRINGS.snappy
    ),
    borderColor: withSpring(
      isSelected ? theme.colors.primary : theme.colors.border,
      SPRINGS.snappy
    ),
    transform: [{ scale: withSpring(isSelected ? 1.02 : 1, SPRINGS.snappy) }],
  }));

  return (
    <RNPressable onPress={onSelect} style={styles.presetButton}>
      <Animated.View
        style={[
          styles.presetContent,
          { borderRadius: theme.radii.md, borderWidth: 1 },
          animatedStyle,
        ]}
      >
        <Text
          style={[
            styles.presetLabel,
            {
              color: isSelected
                ? theme.colors.primary
                : theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {label}
        </Text>
        <Text
          style={[
            styles.presetSubtitle,
            {
              color: theme.colors.foregroundMuted,
              fontFamily: theme.fonts.body,
            },
          ]}
        >
          {subtitle}
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
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 24,
  },
  iconContainer: {
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
  presetContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  presetButton: {
    flex: 1,
  },
  presetContent: {
    padding: 16,
    alignItems: 'center',
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetSubtitle: {
    fontSize: 12,
  },
  customContainer: {
    width: '100%',
    alignItems: 'center',
  },
  orText: {
    fontSize: 14,
    marginBottom: 12,
  },
  customInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  booksLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  footer: {
    paddingVertical: 24,
    gap: 16,
    width: '100%',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 15,
  },
});
