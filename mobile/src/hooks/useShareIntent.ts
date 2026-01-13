import { useEffect, useCallback } from 'react';
import ReceiveSharingIntent from 'react-native-receive-sharing-intent';
import { useShareIntentActions, type SharedFile } from '@/stores/shareIntentStore';
import { Platform } from 'react-native';

export function useShareIntent() {
  const { setSharedFile, clearSharedFile } = useShareIntentActions();

  const handleSharedFiles = useCallback(
    (files: Array<{ filePath: string; fileName?: string; mimeType?: string }>) => {
      if (files && files.length > 0) {
        const file = files[0];

        const fileName = file.fileName || file.filePath.split('/').pop() || 'shared_file';

        if (fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
          const sharedFile: SharedFile = {
            filePath: file.filePath,
            fileName: fileName,
            mimeType: file.mimeType,
          };
          setSharedFile(sharedFile);
        }
      }
    },
    [setSharedFile]
  );

  useEffect(() => {
    ReceiveSharingIntent.getReceivedFiles(
      handleSharedFiles,
      () => {}
    );

    return () => {
      if (Platform.OS === 'android') {
        ReceiveSharingIntent.clearReceivedFiles();
      }
    };
  }, [handleSharedFiles]);

  return { clearSharedFile };
}
