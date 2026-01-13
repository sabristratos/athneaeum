import React, { useState, useCallback } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, Button, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';

export interface QuickLogKeypadProps {
  currentPage: number;
  pageCount: number | null;
  onLog: (endPage: number, durationSeconds?: number) => void;
  isLogging?: boolean;
}

const QUICK_INCREMENTS = [10, 25, 50];

export function QuickLogKeypad({
  currentPage,
  pageCount,
  onLog,
  isLogging = false,
}: QuickLogKeypadProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const [endPage, setEndPage] = useState(currentPage.toString());

  const handleQuickIncrement = useCallback(
    (increment: number) => {
      const newPage = Math.min(
        currentPage + increment,
        pageCount ?? currentPage + increment
      );
      setEndPage(newPage.toString());
      triggerHaptic('light');
    },
    [currentPage, pageCount]
  );

  const handleChangeText = useCallback((text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setEndPage(numericText);
  }, []);

  const handleLog = useCallback(() => {
    const endPageNum = parseInt(endPage, 10);
    if (isNaN(endPageNum) || endPageNum <= currentPage) {
      triggerHaptic('error');
      return;
    }
    onLog(endPageNum);
  }, [endPage, currentPage, onLog]);

  const endPageNum = parseInt(endPage, 10) || 0;
  const isValid = endPageNum > currentPage && (!pageCount || endPageNum <= pageCount);
  const pagesRead = isValid ? endPageNum - currentPage : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          variant="caption"
          style={{ color: theme.colors.foregroundMuted }}
        >
          Currently on page {currentPage}
          {pageCount ? ` of ${pageCount}` : ''}
        </Text>
      </View>

      <View style={styles.inputSection}>
        <Text variant="label" style={{ color: theme.colors.foreground }}>
          I read to page:
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isValid ? theme.colors.primary : theme.colors.border,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
              color: theme.colors.foreground,
              fontFamily: theme.fonts.body,
            },
          ]}
          value={endPage}
          onChangeText={handleChangeText}
          keyboardType="number-pad"
          maxLength={5}
          selectTextOnFocus
          placeholder="Page #"
          placeholderTextColor={theme.colors.foregroundMuted}
        />
      </View>

      <View style={styles.quickButtons}>
        {QUICK_INCREMENTS.map((increment) => (
          <Pressable
            key={increment}
            onPress={() => handleQuickIncrement(increment)}
            haptic="light"
            activeScale={0.95}
            style={[
              styles.quickButton,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: theme.colors.primary,
                fontWeight: '600',
              }}
            >
              +{increment}
            </Text>
          </Pressable>
        ))}
      </View>

      {pagesRead > 0 && (
        <Text
          variant="caption"
          style={{
            color: theme.colors.success,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          {pagesRead} pages read
        </Text>
      )}

      <View style={{ marginTop: 16, alignItems: 'center' }}>
        <Button
          variant="primary"
          size="lg"
          onPress={handleLog}
          disabled={!isValid || isLogging}
        >
          {isLogging ? 'Logging...' : 'Log Session'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  header: {
    alignItems: 'center',
  },
  inputSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  input: {
    width: 100,
    height: 48,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
  },
  quickButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
