import React, { useState, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { triggerHaptic } from '@/hooks/useHaptic';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { Text, IconButton } from '@/components/atoms';
import { EditionTile } from './components/EditionTile';
import { EditionPreviewModal } from './components/EditionPreviewModal';
import { useTheme } from '@/themes';
import { SELECTABLE_THEMES, type ThemeMetadata } from '@/stores/themeStore';
import type { ThemeName } from '@/types/theme';

const PADDING = 16;
const CARD_GAP = 16;

export function EditionGalleryScreen() {
  const { theme, themeName, setTheme } = useTheme();
  const navigation = useNavigation();
  const [previewEdition, setPreviewEdition] = useState<ThemeName | null>(null);

  const handleSelectTheme = useCallback(
    (name: ThemeName) => {
      triggerHaptic('medium');
      setTheme(name);
    },
    [setTheme]
  );

  const handleTilePress = useCallback((name: ThemeName) => {
    triggerHaptic('light');
    setPreviewEdition(name);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewEdition(null);
  }, []);

  const handleApplyFromPreview = useCallback(
    (name: ThemeName) => {
      handleSelectTheme(name);
      setPreviewEdition(null);
    },
    [handleSelectTheme]
  );

  const renderItem = useCallback(
    ({ item }: { item: ThemeMetadata }) => {
      const isActive = themeName === item.name;

      return (
        <EditionTile
          name={item.name}
          label={item.label}
          description={item.description}
          previewTheme={item.theme}
          isActive={isActive}
          onPress={() => handleTilePress(item.name)}
        />
      );
    },
    [themeName, handleTilePress]
  );

  const keyExtractor = useCallback((item: ThemeMetadata) => item.name, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.canvas }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          },
        ]}
      >
        <IconButton
          icon={ArrowLeft01Icon}
          onPress={() => navigation.goBack()}
          variant="ghost"
          accessibilityLabel="Go back"
        />
        <Text variant="h3" style={{ flex: 1, marginLeft: theme.spacing.sm }}>
          Choose Your Edition
        </Text>
      </View>

      <Text
        variant="body"
        style={{
          paddingHorizontal: PADDING,
          paddingBottom: theme.spacing.md,
          color: theme.colors.foregroundMuted,
        }}
      >
        Each edition transforms your reading experience with unique colors, typography, and rating icons.
      </Text>

      <FlatList
        data={SELECTABLE_THEMES}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: PADDING,
          paddingBottom: PADDING,
        }}
        ItemSeparatorComponent={() => <View style={{ height: CARD_GAP }} />}
        showsVerticalScrollIndicator={false}
      />

      <EditionPreviewModal
        visible={previewEdition !== null}
        editionName={previewEdition}
        onClose={handleClosePreview}
        onApply={handleApplyFromPreview}
        isActive={previewEdition === themeName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
