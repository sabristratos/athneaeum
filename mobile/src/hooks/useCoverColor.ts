import { useEffect, useState } from 'react';
import { useSpineColor, useSpineColorActions } from '@/stores/spineColorStore';
import { isDistinctColor, parseToHex, getLuminance, getSaturation } from '@/utils/colorUtils';

let getPalette: ((uri: string) => Promise<{
  dominant?: string;
  vibrant?: string;
  muted?: string;
  dominantAndroid?: string;
}>) | null = null;

try {
  getPalette = require('@somesoap/react-native-image-palette').getPalette;
} catch {
}

interface UseCoverColorResult {
  color: string | null;
  isLoading: boolean;
}

/**
 * Hook to get a distinct accent color from a book cover.
 * Filters out black, white, and gray colors.
 * Reuses the spine color cache when available.
 */
export function useCoverColor(
  bookId: number | string,
  coverUrl: string | null | undefined
): UseCoverColorResult {
  const bookIdString = bookId.toString();
  const cachedColor = useSpineColor(bookIdString);
  const { setColor } = useSpineColorActions();
  const [extractedColor, setExtractedColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!coverUrl) {
      setIsLoading(false);
      return;
    }

    // If we have a cached color that's distinct, use it
    if (cachedColor && isDistinctColor(cachedColor)) {
      setExtractedColor(cachedColor);
      setIsLoading(false);
      return;
    }

    // No palette library available
    if (!getPalette) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    extractColorsFromCover(coverUrl)
      .then((colors) => {
        const bestColor = findBestColor(colors);
        if (bestColor) {
          setColor(bookIdString, bestColor);
          setExtractedColor(bestColor);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  }, [bookIdString, coverUrl, cachedColor, setColor]);

  return {
    color: extractedColor,
    isLoading,
  };
}

async function extractColorsFromCover(coverUrl: string): Promise<{
  dominant?: string;
  vibrant?: string;
  muted?: string;
}> {
  if (!getPalette) {
    return {};
  }

  try {
    const result = await getPalette(coverUrl);
    return {
      dominant: (result as any).dominantAndroid || result.dominant,
      vibrant: result.vibrant,
      muted: result.muted,
    };
  } catch {
    return {};
  }
}

function findBestColor(colors: {
  dominant?: string;
  vibrant?: string;
  muted?: string;
}): string | null {
  // Match BookSpine order: dominant (from Android), then vibrant, then muted
  const colorOrder = [colors.dominant, colors.vibrant, colors.muted];

  for (const color of colorOrder) {
    if (color) {
      const hex = parseToHex(color);
      if (isDistinctColor(hex)) {
        return hex;
      }
    }
  }

  // If no color passed the strict filter, try with relaxed criteria
  // (allow slightly less saturated colors)
  for (const color of colorOrder) {
    if (color) {
      const hex = parseToHex(color);
      const luminance = getLuminance(hex);
      const saturation = getSaturation(hex);

      // More relaxed: just avoid pure black/white
      if (luminance > 0.05 && luminance < 0.9 && saturation > 0.08) {
        return hex;
      }
    }
  }

  return null;
}
