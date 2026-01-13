import {
  hexToRgb,
  rgbToHex,
  getLuminance,
  isLightColor,
  getContrastingTextColor,
  darkenColor,
  lightenColor,
  mixColors,
  getSaturation,
  isDistinctColor,
} from '../utils/colorUtils';

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('converts 6-digit hex to RGB array', () => {
      expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
      expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
      expect(hexToRgb('#8b2e2e')).toEqual([139, 46, 46]);
    });

    it('handles hex without # prefix', () => {
      expect(hexToRgb('ffffff')).toEqual([255, 255, 255]);
    });

    it('returns null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#gg0000')).toBeNull();
      expect(hexToRgb('#fff')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('converts RGB to hex', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(139, 46, 46)).toBe('#8b2e2e');
    });

    it('clamps values to 0-255 range', () => {
      expect(rgbToHex(300, -50, 128)).toBe('#ff0080');
    });
  });

  describe('getLuminance', () => {
    it('returns 0 for black', () => {
      expect(getLuminance('#000000')).toBeCloseTo(0, 2);
    });

    it('returns 1 for white', () => {
      expect(getLuminance('#ffffff')).toBeCloseTo(1, 2);
    });

    it('returns middle value for gray', () => {
      const lum = getLuminance('#808080');
      expect(lum).toBeGreaterThan(0.2);
      expect(lum).toBeLessThan(0.4);
    });
  });

  describe('isLightColor', () => {
    it('returns true for light colors', () => {
      expect(isLightColor('#ffffff')).toBe(true);
      expect(isLightColor('#fdfbf7')).toBe(true);
    });

    it('returns false for dark colors', () => {
      expect(isLightColor('#000000')).toBe(false);
      expect(isLightColor('#12100e')).toBe(false);
      expect(isLightColor('#8b2e2e')).toBe(false);
    });
  });

  describe('getContrastingTextColor', () => {
    it('returns light color for dark backgrounds', () => {
      expect(getContrastingTextColor('#000000', '#ffffff', '#000000')).toBe('#ffffff');
      expect(getContrastingTextColor('#12100e', '#ffffff', '#000000')).toBe('#ffffff');
      expect(getContrastingTextColor('#8b2e2e', '#ffffff', '#000000')).toBe('#ffffff');
    });

    it('returns dark color for light backgrounds', () => {
      expect(getContrastingTextColor('#ffffff', '#ffffff', '#000000')).toBe('#000000');
      expect(getContrastingTextColor('#fdfbf7', '#ffffff', '#000000')).toBe('#000000');
    });
  });

  describe('darkenColor', () => {
    it('darkens colors', () => {
      const result = darkenColor('#ffffff', 0.5);
      expect(result).toBe('#808080');
    });

    it('returns same color for 0 amount', () => {
      expect(darkenColor('#8b2e2e', 0)).toBe('#8b2e2e');
    });
  });

  describe('lightenColor', () => {
    it('lightens colors', () => {
      const result = lightenColor('#000000', 0.5);
      expect(result).toBe('#808080');
    });

    it('returns same color for 0 amount', () => {
      expect(lightenColor('#8b2e2e', 0)).toBe('#8b2e2e');
    });
  });

  describe('mixColors', () => {
    it('mixes two colors at 50%', () => {
      const result = mixColors('#000000', '#ffffff', 0.5);
      expect(result).toBe('#808080');
    });

    it('returns first color at 0 ratio', () => {
      expect(mixColors('#ff0000', '#0000ff', 0)).toBe('#ff0000');
    });

    it('returns second color at 1 ratio', () => {
      expect(mixColors('#ff0000', '#0000ff', 1)).toBe('#0000ff');
    });
  });

  describe('getSaturation', () => {
    it('returns 0 for grayscale', () => {
      expect(getSaturation('#000000')).toBe(0);
      expect(getSaturation('#808080')).toBe(0);
      expect(getSaturation('#ffffff')).toBe(0);
    });

    it('returns high value for saturated colors', () => {
      const sat = getSaturation('#ff0000');
      expect(sat).toBeGreaterThan(0.9);
    });
  });

  describe('isDistinctColor', () => {
    it('returns false for white', () => {
      expect(isDistinctColor('#ffffff')).toBe(false);
    });

    it('returns false for black', () => {
      expect(isDistinctColor('#000000')).toBe(false);
    });

    it('returns false for gray', () => {
      expect(isDistinctColor('#808080')).toBe(false);
    });

    it('returns true for saturated colors', () => {
      expect(isDistinctColor('#8b2e2e')).toBe(true);
      expect(isDistinctColor('#8da399')).toBe(true);
    });
  });
});
