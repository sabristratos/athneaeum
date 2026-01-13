import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ArrowLeft02Icon, ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { Text, IconButton } from '@/components/atoms';
import { useTheme } from '@/themes';

interface CalendarHeaderProps {
  monthLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
}

export const CalendarHeader = memo(function CalendarHeader({
  monthLabel,
  onPrevious,
  onNext,
  canGoNext,
}: CalendarHeaderProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={styles.container}>
      <IconButton
        icon={ArrowLeft02Icon}
        onPress={onPrevious}
        variant="ghost"
        size="sm"
        accessibilityLabel="Previous month"
      />

      <Text
        variant="h3"
        style={[
          styles.monthLabel,
          {
            fontFamily: theme.fonts.heading,
            color: theme.colors.foreground,
          },
          isScholar && { textTransform: 'uppercase', letterSpacing: 1 },
        ]}
      >
        {monthLabel}
      </Text>

      <IconButton
        icon={ArrowRight02Icon}
        onPress={onNext}
        variant="ghost"
        size="sm"
        disabled={!canGoNext}
        accessibilityLabel="Next month"
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  monthLabel: {
    flex: 1,
    textAlign: 'center',
  },
});
