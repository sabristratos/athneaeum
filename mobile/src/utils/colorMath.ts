/**
 * Pure math utilities for color interpolation.
 * Zero dependencies.
 */

export function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    return [
      parseInt(cleanHex[0] + cleanHex[0], 16),
      parseInt(cleanHex[1] + cleanHex[1], 16),
      parseInt(cleanHex[2] + cleanHex[2], 16),
    ];
  }
  return [
    parseInt(cleanHex.substring(0, 2), 16),
    parseInt(cleanHex.substring(2, 4), 16),
    parseInt(cleanHex.substring(4, 6), 16),
  ];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function lerpColor(startHex: string, endHex: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(startHex);
  const [r2, g2, b2] = hexToRgb(endHex);

  const clampedT = Math.min(1, Math.max(0, t));

  return rgbToHex(
    lerp(r1, r2, clampedT),
    lerp(g1, g2, clampedT),
    lerp(b1, b2, clampedT)
  );
}

export function lerpNumber(start: number, end: number, t: number): number {
  const clampedT = Math.min(1, Math.max(0, t));
  return lerp(start, end, clampedT);
}
