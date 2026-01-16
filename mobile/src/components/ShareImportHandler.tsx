import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedFile, useShareIntentActions } from '@/stores/shareIntentStore';
import { useShareIntent } from '@/hooks/useShareIntent';
import { ImportProgressModal, type ImportStatus } from '@/components';
import { authApi, type ImportResult, type EnrichmentStatus } from '@/api/auth';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

const ENRICHMENT_POLL_INTERVAL = 3000;

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
  const [enrichmentStatus, setEnrichmentStatus] = useState<EnrichmentStatus | undefined>();

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollEnrichmentStatus = useCallback(async () => {
    try {
      const status = await authApi.getEnrichmentStatus();
      setEnrichmentStatus(status);

      if (status.is_complete) {
        stopPolling();
        setImportStatus('complete');
        queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
      }
    } catch {
      stopPolling();
      setImportStatus('complete');
    }
  }, [stopPolling, queryClient]);

  const startEnrichmentPolling = useCallback(() => {
    stopPolling();
    pollEnrichmentStatus();
    pollIntervalRef.current = setInterval(pollEnrichmentStatus, ENRICHMENT_POLL_INTERVAL);
  }, [pollEnrichmentStatus, stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

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
    setEnrichmentStatus(undefined);
    setShowModal(true);

    try {
      const result = await authApi.importLibrary(filePath, 'goodreads');
      setImportResult(result);

      if (result.imported > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.library.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.library.externalIds() });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.goals.all });

        setImportStatus('enriching');
        startEnrichmentPolling();
      } else {
        setImportStatus('complete');
      }
    } catch (error) {
      setImportStatus('error');
      setImportError(
        error instanceof Error ? error.message : 'Failed to import. Please try again.'
      );
    }
  };

  const handleClose = () => {
    stopPolling();
    setShowModal(false);
    setImportStatus('idle');
    setEnrichmentStatus(undefined);
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
      enrichmentStatus={enrichmentStatus}
    />
  );
}
