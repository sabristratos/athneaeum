import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { usePreferencesStore } from '@/stores/preferencesStore';

export type HapticFeedback =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

const feedbackMap: Record<HapticFeedback, () => Promise<void>> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => Haptics.selectionAsync(),
};

export function useHaptic() {
  const hapticsEnabled = usePreferencesStore((state) => state.preferences.hapticsEnabled);

  const trigger = useCallback((type: HapticFeedback = 'light') => {
    if (hapticsEnabled) {
      feedbackMap[type]();
    }
  }, [hapticsEnabled]);

  return {
    trigger,
    light: () => trigger('light'),
    medium: () => trigger('medium'),
    heavy: () => trigger('heavy'),
    success: () => trigger('success'),
    warning: () => trigger('warning'),
    error: () => trigger('error'),
    selection: () => trigger('selection'),
  };
}

/**
 * Standalone haptic trigger for use outside of React components.
 * Checks the preference store directly.
 */
export function triggerHaptic(type: HapticFeedback = 'light'): void {
  const hapticsEnabled = usePreferencesStore.getState().preferences.hapticsEnabled;
  if (hapticsEnabled) {
    feedbackMap[type]();
  }
}
