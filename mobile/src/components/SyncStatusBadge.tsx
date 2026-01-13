import React, { useCallback, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  Tick01Icon,
  CloudIcon,
  WifiDisconnected01Icon,
  ArrowReloadHorizontalIcon,
} from '@hugeicons/core-free-icons';
import { Icon } from './atoms/Icon';
import { Text } from './atoms/Text';
import { useTheme } from '@/themes';
import { useSync } from '@/database/DatabaseProvider';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';

type SyncStatus = 'synced' | 'syncing' | 'pending' | 'offline';

interface StatusConfig {
  icon: typeof Tick01Icon;
  color: string;
  label: string;
}

export function SyncStatusBadge() {
  const { theme, themeName } = useTheme();
  const { isSyncing, isOnline, pendingCount, lastSyncAt, triggerSync } = useSync();
  const reducedMotion = useReducedMotion();
  const rotation = useSharedValue(0);
  const lastPressTime = useRef(0);

  const status: SyncStatus = !isOnline
    ? 'offline'
    : isSyncing
      ? 'syncing'
      : pendingCount > 0
        ? 'pending'
        : 'synced';

  React.useEffect(() => {
    if (status === 'syncing' && !reducedMotion) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [status, reducedMotion, rotation]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getStatusConfig = useCallback((): StatusConfig => {
    switch (status) {
      case 'synced':
        return {
          icon: Tick01Icon,
          color: theme.colors.success,
          label: 'Synced',
        };
      case 'syncing':
        return {
          icon: ArrowReloadHorizontalIcon,
          color: theme.colors.primary,
          label: 'Syncing',
        };
      case 'pending':
        return {
          icon: CloudIcon,
          color: theme.colors.warning,
          label: `${pendingCount} pending`,
        };
      case 'offline':
        return {
          icon: WifiDisconnected01Icon,
          color: theme.colors.danger,
          label: 'Offline',
        };
    }
  }, [status, pendingCount, theme.colors]);

  const config = getStatusConfig();
  const isScholar = themeName === 'scholar';

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (now - lastPressTime.current < 1000) return;
    lastPressTime.current = now;

    if (isOnline && !isSyncing) {
      triggerSync();
    }
  }, [isOnline, isSyncing, triggerSync]);

  const formatLastSync = useCallback(() => {
    if (!lastSyncAt) return 'Never synced';
    const date = new Date(lastSyncAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }, [lastSyncAt]);

  return (
    <Pressable
      onPress={handlePress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Sync status: ${config.label}. Last synced ${formatLastSync()}. ${isOnline && !isSyncing ? 'Tap to sync now' : ''}`}
      accessibilityState={{ busy: isSyncing }}
      accessibilityHint={isOnline && !isSyncing ? 'Double tap to trigger sync' : undefined}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isScholar ? 'transparent' : theme.colors.surfaceAlt,
            borderWidth: isScholar ? theme.borders.thin : 0,
            borderColor: isScholar ? theme.colors.borderMuted : 'transparent',
            borderRadius: isScholar ? theme.radii.sm : theme.radii.full,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
          },
        ]}
      >
        {status === 'syncing' ? (
          <Animated.View style={animatedIconStyle}>
            <Icon icon={config.icon} size={14} color={config.color} />
          </Animated.View>
        ) : (
          <View>
            <Icon icon={config.icon} size={14} color={config.color} />
          </View>
        )}
        <Text
          style={{
            fontSize: 11,
            color: config.color,
            fontWeight: isScholar ? '400' : '600',
            textTransform: isScholar ? 'uppercase' : 'none',
            letterSpacing: isScholar ? 0.5 : 0,
            marginLeft: theme.spacing.xs,
          }}
        >
          {config.label}
        </Text>
        {status === 'synced' && (
          <View
            style={[
              styles.dot,
              {
                backgroundColor: theme.colors.success,
                marginLeft: theme.spacing.xs,
              },
            ]}
          />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
