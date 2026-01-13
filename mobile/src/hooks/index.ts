export { useHaptic } from '@/hooks/useHaptic';
export type { HapticFeedback } from '@/hooks/useHaptic';
export { useScrollAnimations } from '@/hooks/useScrollAnimations';
export { useScrollPhysics, buildSectionBoundaries } from '@/hooks/useScrollPhysics';
export { useFPSMonitor, useFPSLogger, usePerformanceTimer } from '@/hooks/useFPSMonitor';
export { useDebouncedValue } from '@/hooks/useDebouncedValue';
export {
  useAfterInteractions,
  useDeferredValue,
  useRunAfterInteractions,
  useDeferredEffect,
  useDeferredCallback,
} from '@/hooks/useAfterInteractions';
export {
  useMemoryMonitor,
  useRenderCounter,
  useComponentProfiler,
  useSlowRenderWarning,
  useNavigationPerformance,
  useBundleEstimate,
  usePerformanceMetrics,
} from '@/hooks/usePerformanceMonitor';
export {
  useOptimizedImage,
  useResponsiveImageSize,
  getOptimalImageSize,
} from '@/hooks/useOptimizedImage';
export { useCoverColor } from '@/hooks/useCoverColor';
export {
  useNavBarScrollHandler,
  useShowNavBar,
  useNavBarVisible,
} from '@/stores/navBarStore';
export { useShareIntent } from '@/hooks/useShareIntent';
export { useLocalStats } from '@/hooks/useLocalStats';
