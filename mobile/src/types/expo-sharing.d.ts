declare module 'expo-sharing' {
  export interface SharingOptions {
    mimeType?: string;
    dialogTitle?: string;
    UTI?: string;
  }

  export function isAvailableAsync(): Promise<boolean>;

  export function shareAsync(url: string, options?: SharingOptions): Promise<void>;
}
