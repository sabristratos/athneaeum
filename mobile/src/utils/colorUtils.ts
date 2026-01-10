/**
 * Color utility functions for procedural spine generation.
 */

/**
 * Convert hex color to RGB array
 */
export function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : null;
}

/**
 * Convert RGB values to hex color
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Calculate relative luminance of a color (for WCAG contrast)
 * Returns value between 0 (black) and 1 (white)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Check if a color is considered "light" (luminance > 0.5)
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

/**
 * Get a contrasting text color (dark or light) for a background color.
 * Uses a lower threshold (0.45) to ensure light colors like white/cream get dark text.
 */
export function getContrastingTextColor(
  backgroundColor: string,
  lightColor: string = '#ffffff',
  darkColor: string = '#1a1a1a'
): string {
  const luminance = getLuminance(backgroundColor);
  // Use 0.45 threshold to be more aggressive about using dark text on light backgrounds
  return luminance > 0.45 ? darkColor : lightColor;
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, amount: number = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb[0] * (1 - amount),
    rgb[1] * (1 - amount),
    rgb[2] * (1 - amount)
  );
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, amount: number = 0.2): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return rgbToHex(
    rgb[0] + (255 - rgb[0]) * amount,
    rgb[1] + (255 - rgb[1]) * amount,
    rgb[2] + (255 - rgb[2]) * amount
  );
}

/**
 * Adjust color saturation
 * amount: -1 to 1 (negative desaturates, positive saturates)
 */
export function adjustSaturation(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const [r, g, b] = rgb;
  const gray = 0.2989 * r + 0.587 * g + 0.114 * b;

  return rgbToHex(
    gray + (r - gray) * (1 + amount),
    gray + (g - gray) * (1 + amount),
    gray + (b - gray) * (1 + amount)
  );
}

/**
 * Mix two colors together
 */
export function mixColors(color1: string, color2: string, ratio: number = 0.5): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return color1;

  return rgbToHex(
    rgb1[0] * (1 - ratio) + rgb2[0] * ratio,
    rgb1[1] * (1 - ratio) + rgb2[1] * ratio,
    rgb1[2] * (1 - ratio) + rgb2[2] * ratio
  );
}

/**
 * Get a muted version of a color (desaturated and slightly darker/lighter)
 */
export function getMutedColor(hex: string): string {
  const isLight = isLightColor(hex);
  const desaturated = adjustSaturation(hex, -0.3);
  return isLight ? darkenColor(desaturated, 0.1) : lightenColor(desaturated, 0.1);
}

/**
 * Generate an accent color from a base color (complementary-ish)
 */
export function getAccentColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  // Rotate hue by shifting RGB channels
  const [r, g, b] = rgb;
  const avg = (r + g + b) / 3;

  // Shift toward complementary while maintaining some relation
  return rgbToHex(
    255 - r * 0.5 + avg * 0.5,
    255 - g * 0.5 + avg * 0.5,
    255 - b * 0.5 + avg * 0.5
  );
}

/**
 * Parse various color formats to hex
 */
export function parseToHex(color: string): string {
  // Already hex
  if (color.startsWith('#')) {
    return color;
  }

  // RGB format: rgb(r, g, b)
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    return rgbToHex(
      parseInt(rgbMatch[1]),
      parseInt(rgbMatch[2]),
      parseInt(rgbMatch[3])
    );
  }

  // RGBA format: rgba(r, g, b, a) - ignore alpha
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
  if (rgbaMatch) {
    return rgbToHex(
      parseInt(rgbaMatch[1]),
      parseInt(rgbaMatch[2]),
      parseInt(rgbaMatch[3])
    );
  }

  // Return as-is if unknown format
  return color;
}
