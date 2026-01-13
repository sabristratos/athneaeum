import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, NativeModules, InteractionManager } from 'react-native';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetrics {
  memoryUsageMB: number | null;
  renderCount: number;
  lastRenderTime: number | null;
  averageRenderTime: number | null;
  isLowMemory: boolean;
}

const MEMORY_WARNING_THRESHOLD_MB = 250;
const MEMORY_CRITICAL_THRESHOLD_MB = 350;

export function useMemoryMonitor(enabled = __DEV__) {
  const [memoryMB, setMemoryMB] = useState<number | null>(null);
  const [isLowMemory, setIsLowMemory] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkMemory = () => {
      if (Platform.OS === 'web' && typeof performance !== 'undefined') {
        const memory = (performance as any).memory as MemoryInfo | undefined;
        if (memory) {
          const usedMB = Math.round(memory.usedJSHeapSize / (1024 * 1024));
          setMemoryMB(usedMB);
          setIsLowMemory(usedMB > MEMORY_WARNING_THRESHOLD_MB);
        }
      }
    };

    const interval = setInterval(checkMemory, 5000);
    checkMemory();

    return () => clearInterval(interval);
  }, [enabled]);

  return { memoryMB, isLowMemory };
}

export function useRenderCounter(componentName?: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef<number>(0);

  useEffect(() => {
    renderCount.current += 1;
    const now = performance.now();

    if (lastRenderStart.current > 0) {
      const renderTime = now - lastRenderStart.current;
      renderTimes.current.push(renderTime);

      if (renderTimes.current.length > 100) {
        renderTimes.current.shift();
      }
    }

    lastRenderStart.current = now;

  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.length > 0
      ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      : null,
  };
}

export function useComponentProfiler(componentName: string, enabled = __DEV__) {
  const mountTime = useRef<number>(0);
  const renderCount = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    mountTime.current = performance.now();

    return () => {
    };
  }, [componentName, enabled]);

  useEffect(() => {
    if (enabled) {
      renderCount.current += 1;
    }
  });

  return { renderCount: renderCount.current };
}

export function useSlowRenderWarning(
  componentName: string,
  threshold = 16,
  enabled = __DEV__
) {
  const lastRenderEnd = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const now = performance.now();
    lastRenderEnd.current = now;
  });
}

export function useNavigationPerformance(screenName: string, enabled = __DEV__) {
  const navigationStart = useRef<number>(performance.now());
  const [timeToInteractive, setTimeToInteractive] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handle = InteractionManager.runAfterInteractions(() => {
      const tti = performance.now() - navigationStart.current;
      setTimeToInteractive(tti);
    });

    return () => handle.cancel();
  }, [screenName, enabled]);

  return { timeToInteractive };
}

interface BundleStats {
  estimatedSizeKB: number;
  importCount: number;
}

export function useBundleEstimate(): BundleStats | null {
  const [stats, setStats] = useState<BundleStats | null>(null);

  useEffect(() => {
    if (!__DEV__) return;

    InteractionManager.runAfterInteractions(() => {
      const metroRequire = require as { getModules?: () => Record<string, unknown> };
      const moduleCount = Object.keys(metroRequire.getModules?.() || {}).length;

      const estimatedSizeKB = Math.round(moduleCount * 2.5);

      setStats({
        estimatedSizeKB,
        importCount: moduleCount,
      });
    });
  }, []);

  return stats;
}

export function usePerformanceMetrics(componentName?: string): PerformanceMetrics {
  const { memoryMB, isLowMemory } = useMemoryMonitor();
  const { renderCount, averageRenderTime } = useRenderCounter(componentName);

  return {
    memoryUsageMB: memoryMB,
    renderCount,
    lastRenderTime: null,
    averageRenderTime,
    isLowMemory,
  };
}
