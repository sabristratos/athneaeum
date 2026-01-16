import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, useTabScreenPadding, SyncStatusBadge, VignetteOverlay } from '@/components';
import { useTheme } from '@/themes';
import { IdentityCard, PreferencesSection, DataVaultSection, AccountSection, ReadingGoalsSection, ReadingStatsSection } from './components';

export function ProfileScreen() {
  const { theme, themeName } = useTheme();
  const tabPadding = useTabScreenPadding();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.canvas }}
      edges={['top']}
    >
      {themeName === 'scholar' && <VignetteOverlay intensity="light" />}

      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <Text variant="h2" style={{ flex: 1 }}>
          Profile
        </Text>
        <SyncStatusBadge />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          gap: theme.spacing.xl,
          paddingBottom: tabPadding.bottom + theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <IdentityCard />

        <ReadingStatsSection />

        <ReadingGoalsSection />

        <AccountSection />

        <PreferencesSection />

        <DataVaultSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
