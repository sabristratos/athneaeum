import { useEffect, useRef, useState, useCallback } from 'react';

interface FPSData {
  fps: number;
  avgFps: number;
  minFps: number;
  isLow: boolean;
}

const LOW_FPS_THRESHOLD = 55;
const SAMPLE_SIZE = 60; // Keep last 60 samples for averaging

/**
 * Hook to monitor FPS in development builds.
 * Uses requestAnimationFrame to calculate actual frame rate.
 *
 * @param enabled - Whether to enable monitoring (defaults to __DEV__)
 * @returns FPS data including current, average, minimum, and isLow flag
 *
 * @example
 * ```tsx
 * const { fps, isLow } = useFPSMonitor();
 * if (isLow) console.warn('Low FPS detected:', fps);
 * ```
 */
export function useFPSMonitor(enabled = __DEV__): FPSData {
  const [fpsData, setFpsData] = useState<FPSData>({
    fps: 60,
    avgFps: 60,
    minFps: 60,
    isLow: false,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const measureFrame = (timestamp: number) => {
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        const currentFps = Math.round(1000 / delta);

        // Keep rolling window of samples
        frameTimesRef.current.push(currentFps);
        if (frameTimesRef.current.length > SAMPLE_SIZE) {
          frameTimesRef.current.shift();
        }

        // Calculate stats
        const samples = frameTimesRef.current;
        const avgFps = Math.round(
          samples.reduce((a, b) => a + b, 0) / samples.length
        );
        const minFps = Math.min(...samples);

        setFpsData({
          fps: currentFps,
          avgFps,
          minFps,
          isLow: avgFps < LOW_FPS_THRESHOLD,
        });
      }

      lastFrameTimeRef.current = timestamp;
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled]);

  return fpsData;
}

/**
 * Lightweight FPS counter that only logs when FPS drops below threshold.
 * Useful for background monitoring without constant state updates.
 */
export function useFPSLogger(options: {
  enabled?: boolean;
  threshold?: number;
  label?: string;
} = {}) {
  const {
    enabled = __DEV__,
    threshold = LOW_FPS_THRESHOLD,
    label = 'FPS',
  } = options;

  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number>(0);
  const lowFpsCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const measureFrame = (timestamp: number) => {
      if (lastFrameTimeRef.current > 0) {
        const delta = timestamp - lastFrameTimeRef.current;
        const fps = Math.round(1000 / delta);

        if (fps < threshold) {
          lowFpsCountRef.current++;
          if (lowFpsCountRef.current >= 5) {
            lowFpsCountRef.current = 0;
          }
        } else {
          lowFpsCountRef.current = 0;
        }
      }

      lastFrameTimeRef.current = timestamp;
      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, threshold, label]);
}

/**
 * Hook to measure performance of a specific operation.
 * Returns a function to wrap operations for timing.
 */
export function usePerformanceTimer(label: string) {
  const measure = useCallback(
    async <T>(operation: () => T | Promise<T>): Promise<T> => {
      const start = performance.now();
      try {
        const result = await operation();
        const duration = performance.now() - start;
        if (__DEV__) {
          console.log(`[Perf] ${label}: ${duration.toFixed(1)}ms`);
        }
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        if (__DEV__) {
          console.error(`[Perf] ${label} failed after ${duration.toFixed(1)}ms`);
        }
        throw error;
      }
    },
    [label]
  );

  return measure;
}
