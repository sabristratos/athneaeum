import React, { useCallback, useRef } from 'react';
import { View, Switch, StyleSheet, Pressable as RNPressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PaintBoardIcon,
  ArrowRight01Icon,
  CloudServerIcon,
  FavouriteIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Text, Card, Icon } from '@/components';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useTheme } from '@/themes';
import { EDITION_LABELS } from '@/stores/themeStore';
import { useToast } from '@/stores/toastStore';
import type { MainStackParamList } from '@/navigation/MainNavigator';
import {
  usePreferences,
  usePreferencesActions,
  type UserPreferences,
} from '@/stores/preferencesStore';
import {
  useFavoriteFormats,
  useFormatPreferenceActions,
  FORMAT_OPTIONS,
  type BookFormat,
} from '@/database/hooks/useFormatPreferences';
import { authApi } from '@/api/auth';

export function PreferencesSection() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const preferences = usePreferences();
  const { setPreference } = usePreferencesActions();
  const toast = useToast();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const toastShownRef = useRef(false);

  const { formats: preferredFormats, defaultFormat } = useFavoriteFormats();
  const { toggleFormat, setDefaultFormat } = useFormatPreferenceActions();

  const syncToBackend = useCallback((newValue: Partial<UserPreferences & { preferredFormats?: BookFormat[]; defaultFormat?: BookFormat }>) => {
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

  const handleToggleFormat = useCallback(
    async (format: BookFormat) => {
      triggerHaptic('light');
      const isSelected = preferredFormats.includes(format);

      if (isSelected && preferredFormats.length === 1) {
        toast.warning('You must have at least one format selected');
        return;
      }

      await toggleFormat(format, preferredFormats);

      const newFormats = isSelected
        ? preferredFormats.filter((f) => f !== format)
        : [...preferredFormats, format];

      const newDefault = isSelected && defaultFormat === format
        ? newFormats[0]
        : defaultFormat;

      syncToBackend({ preferredFormats: newFormats, defaultFormat: newDefault });
    },
    [preferredFormats, defaultFormat, toggleFormat, syncToBackend, toast]
  );

  const handleSetDefaultFormat = useCallback(
    async (format: BookFormat) => {
      triggerHaptic('light');
      if (!preferredFormats.includes(format)) {
        toast.warning('Select this format in "Reading Formats" first');
        return;
      }
      await setDefaultFormat(format, preferredFormats);
      syncToBackend({ defaultFormat: format });
    },
    [preferredFormats, setDefaultFormat, syncToBackend, toast]
  );

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Preferences
      </Text>

      <Card variant="elevated" padding="none">
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

        <View
          style={{
            padding: theme.spacing.md,
            borderBottomWidth: theme.borders.thin,
            borderBottomColor: theme.colors.border,
          }}
        >
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text variant="body">Reading Formats</Text>
            <Text variant="caption" muted>
              Select all formats you read
            </Text>
          </View>
          <View style={styles.formatGrid}>
            {FORMAT_OPTIONS.map((option) => {
              const isSelected = preferredFormats.includes(option.key);
              return (
                <RNPressable
                  key={option.key}
                  onPress={() => handleToggleFormat(option.key)}
                >
                  <View
                    style={[
                      styles.formatChip,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.surfaceAlt,
                        borderRadius: theme.radii.md,
                        borderWidth: 1,
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View style={{ marginRight: 6 }}>
                        <Icon
                          icon={Tick02Icon}
                          size={14}
                          color={theme.colors.onPrimary}
                        />
                      </View>
                    )}
                    <Text
                      variant="caption"
                      style={{
                        color: isSelected
                          ? theme.colors.onPrimary
                          : theme.colors.foreground,
                        fontWeight: '500',
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </RNPressable>
              );
            })}
          </View>
        </View>

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
            <Text variant="body">Default Format</Text>
            <Text variant="caption" muted>
              Assumed format for new books
            </Text>
          </View>
          <View style={styles.formatPicker}>
            {FORMAT_OPTIONS.filter((opt) =>
              preferredFormats.includes(opt.key)
            ).map((option) => {
              const isSelected = defaultFormat === option.key;
              return (
                <RNPressable
                  key={option.key}
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
                  onPress={() => handleSetDefaultFormat(option.key)}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: isSelected
                        ? theme.colors.onPrimary
                        : theme.colors.foregroundMuted,
                    }}
                  >
                    {option.shortLabel}
                  </Text>
                </RNPressable>
              );
            })}
          </View>
        </View>

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
  formatGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
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
