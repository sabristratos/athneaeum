import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export interface SharedFile {
  filePath: string;
  fileName: string;
  mimeType?: string;
}

interface ShareIntentState {
  sharedFile: SharedFile | null;
  setSharedFile: (file: SharedFile | null) => void;
  clearSharedFile: () => void;
}

export const useShareIntentStore = create<ShareIntentState>((set) => ({
  sharedFile: null,
  setSharedFile: (file) => set({ sharedFile: file }),
  clearSharedFile: () => set({ sharedFile: null }),
}));

export const useSharedFile = () => useShareIntentStore((state) => state.sharedFile);
export const useShareIntentActions = () =>
  useShareIntentStore(
    useShallow((state) => ({
      setSharedFile: state.setSharedFile,
      clearSharedFile: state.clearSharedFile,
    }))
  );
