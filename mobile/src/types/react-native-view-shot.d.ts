declare module 'react-native-view-shot' {
  import type { RefObject } from 'react';

  export interface CaptureOptions {
    format?: 'png' | 'jpg' | 'webm' | 'raw';
    quality?: number;
    result?: 'tmpfile' | 'base64' | 'data-uri' | 'zip-base64';
    snapshotContentContainer?: boolean;
    width?: number;
    height?: number;
  }

  export function captureRef(
    view: RefObject<any> | number,
    options?: CaptureOptions
  ): Promise<string>;

  export function captureScreen(options?: CaptureOptions): Promise<string>;

  export function releaseCapture(uri: string): void;
}
