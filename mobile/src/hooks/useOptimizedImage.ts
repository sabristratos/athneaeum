import { useMemo } from 'react';
import { Platform, PixelRatio } from 'react-native';

type ImageSize = 'thumbnail' | 'small' | 'medium' | 'large' | 'original';

interface ImageDimensions {
  width: number;
  height: number;
}

const SIZE_MAP: Record<ImageSize, ImageDimensions> = {
  thumbnail: { width: 80, height: 120 },
  small: { width: 120, height: 180 },
  medium: { width: 200, height: 300 },
  large: { width: 400, height: 600 },
  original: { width: 0, height: 0 },
};

interface OptimizedImageOptions {
  size?: ImageSize;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png' | 'auto';
  quality?: number;
}

interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  isOptimized: boolean;
}

function supportsWebP(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getPixelDensityMultiplier(): number {
  const density = PixelRatio.get();
  if (density >= 3) return 3;
  if (density >= 2) return 2;
  return 1;
}

export function useOptimizedImage(
  originalUri: string | null | undefined,
  options: OptimizedImageOptions = {}
): OptimizedImageResult | null {
  const {
    size = 'medium',
    width: customWidth,
    height: customHeight,
    format = 'auto',
    quality = 80,
  } = options;

  return useMemo(() => {
    if (!originalUri) return null;

    const dimensions = customWidth && customHeight
      ? { width: customWidth, height: customHeight }
      : SIZE_MAP[size];

    const multiplier = getPixelDensityMultiplier();
    const targetWidth = dimensions.width * multiplier;
    const targetHeight = dimensions.height * multiplier;

    const preferredFormat = format === 'auto'
      ? (supportsWebP() ? 'webp' : 'jpeg')
      : format;

    const isGoogleBooksUrl = originalUri.includes('books.google.com');
    const isOpenLibraryUrl = originalUri.includes('openlibrary.org');

    let optimizedUri = originalUri;
    let isOptimized = false;

    if (isGoogleBooksUrl && size !== 'original') {
      const zoomMap: Record<ImageSize, number> = {
        thumbnail: 1,
        small: 1,
        medium: 2,
        large: 3,
        original: 0,
      };

      const zoom = zoomMap[size];
      if (zoom > 0) {
        optimizedUri = originalUri
          .replace(/&zoom=\d/, `&zoom=${zoom}`)
          .replace(/zoom=\d/, `zoom=${zoom}`);

        if (!optimizedUri.includes('zoom=')) {
          optimizedUri += `&zoom=${zoom}`;
        }

        isOptimized = true;
      }
    }

    if (isOpenLibraryUrl && size !== 'original') {
      const sizeMap: Record<ImageSize, string> = {
        thumbnail: 'S',
        small: 'S',
        medium: 'M',
        large: 'L',
        original: 'L',
      };

      const olSize = sizeMap[size];
      optimizedUri = originalUri.replace(/-[SML]\.jpg/, `-${olSize}.jpg`);
      isOptimized = originalUri !== optimizedUri;
    }

    return {
      uri: optimizedUri,
      width: targetWidth,
      height: targetHeight,
      isOptimized,
    };
  }, [originalUri, size, customWidth, customHeight, format, quality]);
}

export function getOptimalImageSize(
  containerWidth: number,
  containerHeight: number
): ImageSize {
  const maxDimension = Math.max(containerWidth, containerHeight);
  const density = PixelRatio.get();
  const pixelSize = maxDimension * density;

  if (pixelSize <= 120) return 'thumbnail';
  if (pixelSize <= 200) return 'small';
  if (pixelSize <= 400) return 'medium';
  if (pixelSize <= 800) return 'large';
  return 'original';
}

export function useResponsiveImageSize(
  containerWidth: number,
  containerHeight: number
): ImageSize {
  return useMemo(
    () => getOptimalImageSize(containerWidth, containerHeight),
    [containerWidth, containerHeight]
  );
}
