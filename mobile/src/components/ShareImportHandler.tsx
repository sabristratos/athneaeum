import React, { useEffect, useState } from 'react';
import { useSharedFile, useShareIntentActions } from '@/stores/shareIntentStore';
import { useShareIntent } from '@/hooks/useShareIntent';
import { ImportProgressModal, type ImportStatus } from '@/components';
import { authApi, type ImportResult } from '@/api/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function ShareImportHandler() {
  useShareIntent();

  const sharedFile = useSharedFile();
  const { clearSharedFile } = useShareIntentActions();
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [importResult, setImportResult] = useState<ImportResult | undefined>();
  const [importError, setImportError] = useState<string | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();

  useEffect(() => {
    if (sharedFile) {
      handleImport(sharedFile.filePath, sharedFile.fileName);
    }
  }, [sharedFile]);

  const handleImport = async (filePath: string, name: string) => {
    setFileName(name);
    setImportStatus('uploading');
    setImportResult(undefined);
    setImportError(undefined);
    setShowModal(true);

    try {
      const result = await authApi.importLibrary(filePath, 'goodreads');
      setImportResult(result);
      setImportStatus('complete');

      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });
      }
    } catch (error) {
      setImportStatus('error');
      setImportError(
        error instanceof Error ? error.message : 'Failed to import. Please try again.'
      );
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setImportStatus('idle');
    clearSharedFile();
  };

  return (
    <ImportProgressModal
      visible={showModal}
      onClose={handleClose}
      status={importStatus}
      result={importResult}
      errorMessage={importError}
      selectedFileName={fileName}
    />
  );
}
