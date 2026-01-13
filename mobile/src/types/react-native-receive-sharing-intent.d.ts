declare module 'react-native-receive-sharing-intent' {
  export interface SharedFile {
    filePath: string;
    text?: string;
    weblink?: string;
    mimeType?: string;
    contentUri?: string;
    fileName?: string;
    extension?: string;
  }

  type SuccessCallback = (files: SharedFile[]) => void;
  type ErrorCallback = (error: Error) => void;

  interface ReceiveSharingIntentModule {
    getReceivedFiles(
      successCallback: SuccessCallback,
      errorCallback: ErrorCallback,
      protocol?: string
    ): void;
    clearReceivedFiles(): void;
  }

  const ReceiveSharingIntent: ReceiveSharingIntentModule;
  export default ReceiveSharingIntent;
}
