import React, { memo } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { useCalendarController } from '@/features/stats/hooks/useCalendarController';
import { CalendarHeader } from './CalendarHeader';
import { CalendarGrid } from './CalendarGrid';
import { DayLogModal } from './DayLogModal';
import { MonthlyWrapCard } from './MonthlyWrapCard';

export const CalendarSection = memo(function CalendarSection() {
  const { theme } = useTheme();

  const {
    monthLabel,
    calendarDays,
    calendarGridData,
    monthlySummary,

    selectedDay,
    isDayLogVisible,
    closeDayLog,
    handleDayPress,

    goToPreviousMonth,
    goToNextMonth,
    canGoNext,

    wrapCardRef,
    handleExportWrapCard,

    isLoading,
    isError,
  } = useCalendarController();

  const hasNoData = !isLoading && !isError && calendarGridData.every(
    (day) => day === null || (day.pages_read === 0 && day.books_completed.length === 0)
  );

  return (
    <View style={styles.container}>
      <CalendarHeader
        monthLabel={monthLabel}
        onPrevious={goToPreviousMonth}
        onNext={goToNextMonth}
        canGoNext={canGoNext}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text variant="body" muted style={{ textAlign: 'center' }}>
            Failed to load calendar data
          </Text>
        </View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          layout={Layout.springify()}
        >
          <CalendarGrid
            gridData={calendarGridData}
            onDayPress={handleDayPress}
          />

          {hasNoData && (
            <View style={[styles.emptyState, { marginTop: theme.spacing.md }]}>
              <Text variant="caption" muted style={{ textAlign: 'center' }}>
                No reading activity this month
              </Text>
            </View>
          )}

          {monthlySummary && (monthlySummary.books_completed > 0 || monthlySummary.pages_read > 0) && (
            <MonthlyWrapCard
              ref={wrapCardRef}
              summary={monthlySummary}
              days={calendarDays}
              onExport={handleExportWrapCard}
            />
          )}
        </Animated.View>
      )}

      <DayLogModal
        visible={isDayLogVisible}
        onClose={closeDayLog}
        day={selectedDay}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 8,
    alignItems: 'center',
  },
});
