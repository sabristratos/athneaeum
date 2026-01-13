import React, { useCallback, useRef } from 'react';
import { View, Switch, StyleSheet, Pressable as RNPressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PaintBoardIcon, ArrowRight01Icon, CloudServerIcon, FavouriteIcon } from '@hugeicons/core-free-icons';
import { Text, Card, Icon } from '@/components';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useTheme } from '@/themes';
import { EDITION_LABELS } from '@/stores/themeStore';
import { useToast } from '@/stores/toastStore';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import {
  usePreferences,
  usePreferencesActions,
  type BookFormat,
  type UserPreferences,
} from '@/stores/preferencesStore';
import { authApi } from '@/api/auth';

const FORMAT_OPTIONS: { value: BookFormat; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'ebook', label: 'E-book' },
  { value: 'audiobook', label: 'Audiobook' },
];

export function PreferencesSection() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const preferences = usePreferences();
  const { setPreference } = usePreferencesActions();
  const toast = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastShownRef = useRef(false);

  const syncToBackend = useCallback((newValue: Partial<UserPreferences>) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    toastShownRef.current = false;

    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await authApi.updatePreferences(newValue);
        if (!toastShownRef.current) {
          toastShownRef.current = true;
          toast.success('Preferences saved');
        }
      } catch {
        toast.danger('Failed to save preferences');
      }
    }, 500);
  }, [toast]);

  const handlePreferenceChange = useCallback(
    <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      setPreference(key, value);
      syncToBackend({ [key]: value });
    },
    [setPreference, syncToBackend]
  );

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Preferences
      </Text>

      <Card variant="elevated" padding="none">
        {/* Edition Selector */}
        <RNPressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('EditionGallery');
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ marginRight: 12 }}>
              <Icon
                icon={PaintBoardIcon}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text variant="body">Edition</Text>
              <Text variant="caption" muted>
                {EDITION_LABELS[themeName]}
              </Text>
            </View>
            <View>
              <Icon
                icon={ArrowRight01Icon}
                size={18}
                color={theme.colors.foregroundMuted}
              />
            </View>
          </View>
        </RNPressable>

        {/* OPDS / Calibre Server */}
        <RNPressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('OPDSSettings');
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ marginRight: 12 }}>
              <Icon
                icon={CloudServerIcon}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text variant="body">OPDS / Calibre</Text>
              <Text variant="caption" muted>
                Connect your personal library server
              </Text>
            </View>
            <View>
              <Icon
                icon={ArrowRight01Icon}
                size={18}
                color={theme.colors.foregroundMuted}
              />
            </View>
          </View>
        </RNPressable>

        {/* Favorites & Excludes */}
        <RNPressable
          onPress={() => {
            triggerHaptic('light');
            navigation.navigate('Preferences');
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            }}
          >
            <View style={{ marginRight: 12 }}>
              <Icon
                icon={FavouriteIcon}
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Text variant="body">Favorites & Excludes</Text>
              <Text variant="caption" muted>
                Personalize search with preferred authors and genres
              </Text>
            </View>
            <View>
              <Icon
                icon={ArrowRight01Icon}
                size={18}
                color={theme.colors.foregroundMuted}
              />
            </View>
          </View>
        </RNPressable>

        {/* Default Format */}
        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowContent}>
            <Text variant="body">Default Book Format</Text>
            <Text variant="caption" muted>
              When adding a book, assume it is...
            </Text>
          </View>
          <View style={styles.formatPicker}>
            {FORMAT_OPTIONS.map((option) => {
              const isSelected = preferences.defaultFormat === option.value;
              return (
                <RNPressable
                  key={option.value}
                  style={[
                    styles.formatOption,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primary
                        : theme.colors.surfaceAlt,
                      borderRadius: theme.radii.md,
                      paddingHorizontal: theme.spacing.sm,
                      paddingVertical: theme.spacing.xs,
                    },
                  ]}
                  onPress={() => handlePreferenceChange('defaultFormat', option.value)}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected
                        ? theme.colors.onPrimary
                        : theme.colors.foregroundMuted,
                    }}
                  >
                    {option.label}
                  </Text>
                </RNPressable>
              );
            })}
          </View>
        </View>

        {/* Default Privacy */}
        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowContent}>
            <Text variant="body">Private by Default</Text>
            <Text variant="caption" muted>
              New books are hidden from your public profile
            </Text>
          </View>
          <Switch
            value={preferences.defaultPrivate}
            onValueChange={(value) => handlePreferenceChange('defaultPrivate', value)}
            trackColor={{
              false: theme.colors.surfaceAlt,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceAlt}
          />
        </View>

        {/* Spoiler Shield */}
        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowContent}>
            <Text variant="body">Spoiler Shield</Text>
            <Text variant="caption" muted>
              Blur reviews and detailed descriptions
            </Text>
          </View>
          <Switch
            value={preferences.spoilerShield}
            onValueChange={(value) => handlePreferenceChange('spoilerShield', value)}
            trackColor={{
              false: theme.colors.surfaceAlt,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceAlt}
          />
        </View>

        {/* Reading Streak */}
        <View
          style={[
            styles.row,
            {
              padding: theme.spacing.md,
              borderBottomWidth: theme.borders.thin,
              borderBottomColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.rowContent}>
            <Text variant="body">Show Reading Streak</Text>
            <Text variant="caption" muted>
              Display streak counter on home screen
            </Text>
          </View>
          <Switch
            value={preferences.showReadingStreak}
            onValueChange={(value) => handlePreferenceChange('showReadingStreak', value)}
            trackColor={{
              false: theme.colors.surfaceAlt,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceAlt}
          />
        </View>

        {/* Haptic Feedback */}
        <View style={[styles.row, { padding: theme.spacing.md }]}>
          <View style={styles.rowContent}>
            <Text variant="body">Haptic Feedback</Text>
            <Text variant="caption" muted>
              Vibration on button presses and interactions
            </Text>
          </View>
          <Switch
            value={preferences.hapticsEnabled}
            onValueChange={(value) => handlePreferenceChange('hapticsEnabled', value)}
            trackColor={{
              false: theme.colors.surfaceAlt,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.surface}
            ios_backgroundColor={theme.colors.surfaceAlt}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowContent: {
    flex: 1,
    marginRight: 16,
  },
  formatPicker: {
    flexDirection: 'row',
    gap: 4,
  },
  formatOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
