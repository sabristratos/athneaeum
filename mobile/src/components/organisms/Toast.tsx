import React, { memo, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { useFloatingNavBarHeight } from '@/components/FloatingNavBar';
import { SPRINGS, TIMING } from '@/animations/constants';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { useToasts, useToastActions, type ToastVariant, type ToastAction } from '@/stores/toastStore';
import {
  CheckmarkCircle02Icon,
  Alert02Icon,
  InformationCircleIcon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';

const TOAST_DURATION = 3000;
const TOAST_DURATION_WITH_ACTION = 5000;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ToastItemProps {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  action?: ToastAction;
  onDismiss: (id: string) => void;
}

const ToastItem = memo(function ToastItem({
  id,
  message,
  variant,
  duration,
  action,
  onDismiss,
}: ToastItemProps) {
  const { theme } = useTheme();
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const effectiveDuration = duration ?? (action ? TOAST_DURATION_WITH_ACTION : TOAST_DURATION);

  const variantConfig = {
    success: {
      icon: CheckmarkCircle02Icon,
      iconBg: theme.colors.successSubtle,
      iconColor: theme.colors.success,
    },
    danger: {
      icon: Cancel01Icon,
      iconBg: theme.colors.dangerSubtle,
      iconColor: theme.colors.danger,
    },
    warning: {
      icon: Alert02Icon,
      iconBg: theme.colors.warningSubtle,
      iconColor: theme.colors.warning,
    },
    info: {
      icon: InformationCircleIcon,
      iconBg: theme.colors.primarySubtle,
      iconColor: theme.colors.primary,
    },
  };

  const config = variantConfig[variant];

  useEffect(() => {
    const hapticType =
      variant === 'success'
        ? 'success'
        : variant === 'danger'
          ? 'error'
          : 'warning';

    triggerHaptic(hapticType);

    const dismissToast = () => onDismiss(id);

    translateY.value = withSequence(
      withSpring(0, SPRINGS.toastSubtle),
      withDelay(
        effectiveDuration,
        withTiming(100, TIMING.slow, (finished) => {
          if (finished) {
            runOnJS(dismissToast)();
          }
        })
      )
    );

    opacity.value = withSequence(
      withTiming(1, TIMING.normal),
      withDelay(effectiveDuration, withTiming(0, TIMING.slow))
    );
  }, []);

  const handleActionPress = () => {
    if (action) {
      action.onPress();
      onDismiss(id);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        animatedStyle,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          ...theme.shadows.lg,
        },
      ]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${variant} notification: ${message}`}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: config.iconBg,
            borderRadius: theme.radii.full,
          },
        ]}
      >
        <Icon icon={config.icon} size={16} color={config.iconColor} />
      </View>
      <Text
        style={[
          styles.toastMessage,
          {
            color: theme.colors.foreground,
            fontFamily: theme.fonts.body,
          },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
      {action && (
        <TouchableOpacity
          onPress={handleActionPress}
          style={[
            styles.actionButton,
            {
              backgroundColor: config.iconBg,
              borderRadius: theme.radii.md,
            },
          ]}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text
            style={{
              color: config.iconColor,
              fontFamily: theme.fonts.body,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
});

export const ToastContainer = memo(function ToastContainer() {
  const rawToasts = useToasts();
  const { removeToast } = useToastActions();
  const navBarHeight = useFloatingNavBarHeight();

  const toasts = Array.isArray(rawToasts) ? rawToasts : [];

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { bottom: navBarHeight + 8 }]} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          id={toast.id}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          action={toast.action}
          onDismiss={removeToast}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
    gap: 8,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    maxWidth: SCREEN_WIDTH - 32,
    width: '100%',
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});

