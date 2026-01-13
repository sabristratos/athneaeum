/**
 * Tests for custom hooks.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

describe('Hook Tests', () => {
  describe('usePerformanceTimer', () => {
    const { usePerformanceTimer } = require('../hooks/useFPSMonitor');

    it('measures async operation duration', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() => usePerformanceTimer('Test Operation'));

      let operationResult: string | undefined;

      await act(async () => {
        operationResult = await result.current(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        });
      });

      expect(operationResult).toBe('success');
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[Perf\] Test Operation: \d+\.\dms/)
      );

      consoleSpy.mockRestore();
    });

    it('logs error duration on failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => usePerformanceTimer('Failing Operation'));

      await expect(
        act(async () => {
          await result.current(async () => {
            throw new Error('Test error');
          });
        })
      ).rejects.toThrow('Test error');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[Perf\] Failing Operation failed after \d+\.\dms/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('useRenderCounter', () => {
    const { useRenderCounter } = require('../hooks/usePerformanceMonitor');

    it('tracks render count', () => {
      const { result, rerender } = renderHook(() => useRenderCounter('TestComponent'));

      const initialCount = result.current.renderCount;

      rerender({});
      rerender({});

      expect(result.current.renderCount).toBeGreaterThan(initialCount);
    });

    it('returns averageRenderTime', () => {
      const { result } = renderHook(() => useRenderCounter('TestComponent'));
      expect(result.current).toHaveProperty('averageRenderTime');
    });
  });

  describe('useMemoryMonitor', () => {
    const { useMemoryMonitor } = require('../hooks/usePerformanceMonitor');

    it('returns memory info structure', () => {
      const { result } = renderHook(() => useMemoryMonitor(true));

      expect(result.current).toHaveProperty('memoryMB');
      expect(result.current).toHaveProperty('isLowMemory');
      expect(typeof result.current.isLowMemory).toBe('boolean');
    });

    it('returns null values when disabled', () => {
      const { result } = renderHook(() => useMemoryMonitor(false));

      expect(result.current.memoryMB).toBeNull();
      expect(result.current.isLowMemory).toBe(false);
    });
  });
});
