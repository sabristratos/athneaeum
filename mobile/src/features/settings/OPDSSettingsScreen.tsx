import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Icon,
  Pressable,
} from '@/components';
import { SegmentedControl } from '@/components/molecules';
import { useTheme } from '@/themes';
import { useToast } from '@/stores/toastStore';
import { apiClient } from '@/api/client';
import {
  ArrowLeft01Icon,
  CloudServerIcon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
  EyeIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';

type SearchSource = 'google' | 'opds' | 'both';

interface OPDSSettings {
  opds_server_url: string | null;
  opds_username: string | null;
  has_password: boolean;
  preferred_search_source: SearchSource;
  is_configured: boolean;
}

const SOURCE_OPTIONS: { key: SearchSource; label: string }[] = [
  { key: 'google', label: 'Google' },
  { key: 'opds', label: 'OPDS' },
  { key: 'both', label: 'Both' },
];

export function OPDSSettingsScreen() {
  const { theme, themeName } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const isScholar = themeName === 'scholar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [preferredSource, setPreferredSource] = useState<SearchSource>('google');
  const [isConfigured, setIsConfigured] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    catalog_title?: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await apiClient<OPDSSettings>('/user/opds');
      setServerUrl(settings.opds_server_url || '');
      setUsername(settings.opds_username || '');
      setPreferredSource(settings.preferred_search_source);
      setIsConfigured(settings.is_configured);
    } catch (err) {
      toast.danger('Failed to load OPDS settings');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);

    try {
      const updateData: Record<string, string | null> = {
        opds_server_url: serverUrl.trim() || null,
        opds_username: username.trim() || null,
        preferred_search_source: preferredSource,
      };

      if (password) {
        updateData.opds_password = password;
      }

      const result = await apiClient<OPDSSettings>('/user/opds', {
        method: 'PATCH',
        body: updateData,
      });

      setIsConfigured(result.is_configured);
      setPassword('');
      toast.success('OPDS settings saved');
    } catch (err) {
      toast.danger('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!serverUrl.trim()) {
      toast.warning('Enter a server URL first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await handleSave();

      const result = await apiClient<{
        success: boolean;
        message: string;
        catalog_title?: string;
      }>('/user/opds/test', { method: 'POST' });

      setTestResult(result);

      if (result.success) {
        toast.success('Connection successful!');
      } else {
        toast.danger(result.message || 'Connection failed');
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: 'Connection test failed',
      });
      toast.danger('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      await apiClient('/user/opds', { method: 'DELETE' });
      setServerUrl('');
      setUsername('');
      setPassword('');
      setPreferredSource('google');
      setIsConfigured(false);
      setTestResult(null);
      toast.success('OPDS settings cleared');
    } catch (err) {
      toast.danger('Failed to clear settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.canvas }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

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
          OPDS / Calibre
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: theme.spacing.lg,
          paddingBottom: 100,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card
          variant="outlined"
          padding="md"
          style={{ marginBottom: theme.spacing.lg }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm }}>
            <Icon
              icon={CloudServerIcon}
              size={20}
              color={theme.colors.primary}
            />
            <Text
              variant="label"
              style={{ marginLeft: theme.spacing.sm, color: theme.colors.foreground }}
            >
              {isScholar ? 'Personal Library Connection' : 'OPDS Server'}
            </Text>
          </View>
          <Text
            variant="caption"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Connect to Calibre-web or any OPDS-compatible server to search your personal library.
          </Text>
        </Card>

        <View style={{ gap: theme.spacing.lg }}>
          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Server URL
            </Text>
            <TextInput
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://calibre.example.com"
              placeholderTextColor={theme.colors.foregroundSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.body,
                },
              ]}
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Username (optional)
            </Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.foregroundSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                  color: theme.colors.foreground,
                  fontFamily: theme.fonts.body,
                },
              ]}
            />
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Password (optional)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={isConfigured ? '••••••••' : 'Enter password'}
                placeholderTextColor={theme.colors.foregroundSubtle}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderColor: theme.colors.border,
                    borderRadius: isScholar ? theme.radii.sm : theme.radii.md,
                    color: theme.colors.foreground,
                    fontFamily: theme.fonts.body,
                  },
                ]}
              />
              <View style={{ marginLeft: theme.spacing.sm }}>
                <IconButton
                  icon={showPassword ? ViewOffIcon : EyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  variant="ghost"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                />
              </View>
            </View>
          </View>

          <View style={{ gap: theme.spacing.sm }}>
            <Text variant="label" style={{ color: theme.colors.foregroundMuted }}>
              Preferred Search Source
            </Text>
            <SegmentedControl
              options={SOURCE_OPTIONS}
              selected={preferredSource}
              onSelect={(value) => setPreferredSource(value as SearchSource)}
            />
            <Text
              variant="caption"
              style={{ color: theme.colors.foregroundSubtle }}
            >
              {preferredSource === 'google' && 'Search Google Books for new titles'}
              {preferredSource === 'opds' && 'Search only your OPDS catalog'}
              {preferredSource === 'both' && 'Search both sources and merge results'}
            </Text>
          </View>

          {testResult && (
            <Card
              variant="outlined"
              padding="md"
              style={{
                backgroundColor: testResult.success
                  ? theme.colors.successSubtle
                  : theme.colors.dangerSubtle,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon
                  icon={testResult.success ? CheckmarkCircle02Icon : AlertCircleIcon}
                  size={20}
                  color={testResult.success ? theme.colors.success : theme.colors.danger}
                />
                <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
                  <Text
                    variant="body"
                    style={{
                      color: testResult.success ? theme.colors.success : theme.colors.danger,
                    }}
                  >
                    {testResult.message}
                  </Text>
                  {testResult.catalog_title && (
                    <Text
                      variant="caption"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Connected to: {testResult.catalog_title}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          )}

          <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleSave}
              loading={saving}
              disabled={saving || testing}
              fullWidth
            >
              Save Settings
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onPress={handleTestConnection}
              loading={testing}
              disabled={saving || testing || !serverUrl.trim()}
              fullWidth
            >
              Test Connection
            </Button>

            {isConfigured && (
              <Button
                variant="ghost"
                size="lg"
                onPress={handleClear}
                disabled={saving || testing}
                fullWidth
              >
                Clear Settings
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
});
