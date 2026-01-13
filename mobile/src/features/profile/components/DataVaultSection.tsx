import React, { useState } from 'react';
import { View, StyleSheet, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FS = FileSystem as any;
import { Text, Card, Button, ConfirmModal, ImportProgressModal, ImportOptionsModal, PasswordConfirmModal, type ImportStatus } from '@/components';
import { useTheme } from '@/themes';
import { useAuthActions } from '@/stores/authStore';
import { usePreferencesActions } from '@/stores/preferencesStore';
import { authApi, type ImportResult, type ImportOptions } from '@/api/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

let Sharing: typeof import('expo-sharing') | null = null;
try {
  Sharing = require('expo-sharing');
} catch {
  // expo-sharing not available (e.g., in Expo Go)
}

export function DataVaultSection() {
  const { theme } = useTheme();
  const { clearAuth } = useAuthActions();
  const { resetPreferences } = usePreferencesActions();
  const queryClient = useQueryClient();
  const [exportLoading, setExportLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [showImportModal, setShowImportModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const [importError, setImportError] = useState<string | undefined>();
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>();
  const [selectedFileUri, setSelectedFileUri] = useState<string | undefined>();
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    enrichment_enabled: true,
    import_tags: true,
    import_reviews: true,
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = await authApi.exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const filename = `athenaeum-export-${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = `${FS.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FS.EncodingType?.UTF8,
      });

      const canShare = Sharing != null && (await Sharing.isAvailableAsync());
      if (canShare && Sharing) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Your Library',
          UTI: 'public.json',
        });
      } else {
        // Fallback: use native Share API with the content
        try {
          await Share.share({
            message: jsonString,
            title: 'Athenaeum Export',
          });
        } catch {
          Alert.alert('Success', `Data exported to ${filename}`);
        }
      }
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export your data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleImport = async () => {
    setImportResult(undefined);
    setImportError(undefined);
    setSelectedFileName(undefined);
    setSelectedFileUri(undefined);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
        Alert.alert('Invalid File', 'Please select a CSV file exported from Goodreads.');
        return;
      }

      setSelectedFileName(file.name);
      setSelectedFileUri(file.uri);
      setShowOptionsModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to select file. Please try again.');
    }
  };

  const handleConfirmImport = async (options: ImportOptions) => {
    if (!selectedFileUri) return;

    setShowOptionsModal(false);
    setImportStatus('uploading');
    setShowImportModal(true);

    try {
      const importResultData = await authApi.importLibrary(selectedFileUri, 'goodreads', options);
      setImportResult(importResultData);
      setImportStatus('complete');

      if (importResultData.imported > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      }
    } catch (error) {
      setImportStatus('error');
      setImportError(error instanceof Error ? error.message : 'Failed to import. Please try again.');
    }
  };

  const handleCloseImportModal = () => {
    setShowImportModal(false);
    setImportStatus('idle');
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    setDeleteError(undefined);
    setShowPasswordModal(true);
  };

  const handleDeleteAccount = async (password: string) => {
    setDeleteLoading(true);
    setDeleteError(undefined);
    try {
      await authApi.deleteAccount({ password });
      setShowPasswordModal(false);
      resetPreferences();
      await clearAuth();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete account';
      setDeleteError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <View>
      <Text variant="h3" style={{ marginBottom: theme.spacing.md }}>
        Data Vault
      </Text>

      <Card variant="elevated" padding="lg">
        <View style={{ gap: theme.spacing.md }}>
          {/* Export */}
          <View>
            <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
              Export Your Library
            </Text>
            <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
              Download all your books, reading sessions, and notes as JSON.
            </Text>
            <Button
              variant="outline"
              onPress={handleExport}
              loading={exportLoading}
            >
              Download My Data
            </Button>
          </View>

          {/* Import */}
          <View
            style={{
              paddingTop: theme.spacing.md,
              borderTopWidth: theme.borders.thin,
              borderTopColor: theme.colors.border,
            }}
          >
            <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
              Import Library
            </Text>
            <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
              Import your Goodreads export (.csv file). Go to Goodreads → My Books → Import/Export → Export Library.
            </Text>
            <Button variant="secondary" onPress={handleImport}>
              Select CSV File
            </Button>
          </View>

          {/* Sign Out */}
          <View
            style={{
              paddingTop: theme.spacing.md,
              borderTopWidth: theme.borders.thin,
              borderTopColor: theme.colors.border,
            }}
          >
            <Text variant="body" style={{ marginBottom: theme.spacing.xs }}>
              Sign Out
            </Text>
            <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
              Sign out of your account on this device.
            </Text>
            <Button variant="secondary" onPress={clearAuth}>
              Sign Out
            </Button>
          </View>

          {/* Danger Zone */}
          <View
            style={{
              paddingTop: theme.spacing.md,
              borderTopWidth: theme.borders.thin,
              borderTopColor: theme.colors.border,
            }}
          >
            <Text
              variant="body"
              style={{ marginBottom: theme.spacing.xs, color: theme.colors.danger }}
            >
              Danger Zone
            </Text>
            <Text variant="caption" muted style={{ marginBottom: theme.spacing.sm }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Text>
            <Button variant="danger" onPress={() => setShowDeleteModal(true)}>
              Delete Account
            </Button>
          </View>
        </View>
      </Card>

      <ConfirmModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account Forever?"
        message={
          "This will PERMANENTLY delete:\n\n" +
          "• Your entire book library\n" +
          "• All reading sessions and progress\n" +
          "• Reading goals and statistics\n" +
          "• Notes, quotes, and reviews\n" +
          "• Tags and preferences\n\n" +
          "This action cannot be reversed."
        }
        status="danger"
        confirmLabel="Yes, Delete Everything"
        cancelLabel="Keep My Account"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmDestructive
      />

      <PasswordConfirmModal
        visible={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setDeleteError(undefined);
        }}
        onConfirm={handleDeleteAccount}
        title="Final Confirmation"
        message="This is your last chance to turn back. Enter your password to permanently delete your account."
        confirmLabel="Delete Forever"
        loading={deleteLoading}
        error={deleteError}
        requireConfirmWord="DELETE"
      />

      <ImportProgressModal
        visible={showImportModal}
        onClose={handleCloseImportModal}
        status={importStatus}
        result={importResult}
        errorMessage={importError}
        selectedFileName={selectedFileName}
      />

      <ImportOptionsModal
        visible={showOptionsModal}
        onClose={() => setShowOptionsModal(false)}
        onConfirm={handleConfirmImport}
        fileName={selectedFileName ?? ''}
        options={importOptions}
        onOptionsChange={setImportOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({});
