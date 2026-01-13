import React, { memo, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Button, Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';

interface ActionConfig {
  icon: IconSvgElement;
  label: string;
  onPress: () => void;
}

interface FloatingBottomBarProps {
  children: ReactNode;
  action?: ActionConfig | null;
}

export const FloatingBottomBar = memo(function FloatingBottomBar({
  children,
  action,
}: FloatingBottomBarProps) {
  const { theme, themeName } = useTheme();
  const insets = useSafeAreaInsets();
  const isScholar = themeName === 'scholar';

  return (
    <View
      style={[
        styles.container,
        {
          bottom: insets.bottom + theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
        },
      ]}
    >
      <View
        style={[
          styles.barWrapper,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: isScholar ? theme.radii.lg : 28,
            borderWidth: theme.borders.thin,
            borderColor: theme.colors.border,
            padding: 4,
            ...theme.shadows.lg,
          },
        ]}
      >
        {children}

        {action && (
          <>
            <View
              style={[
                styles.divider,
                {
                  backgroundColor: theme.colors.border,
                  marginHorizontal: theme.spacing.sm,
                },
              ]}
            />

            <View style={styles.actionWrapper}>
              <Button variant="primary-outline" size="sm" onPress={action.onPress}>
                <Icon icon={action.icon} size={16} color={theme.colors.primary} />
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: 14,
                    fontWeight: '600',
                  }}
                >
                  {action.label}
                </Text>
              </Button>
            </View>
          </>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  barWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
  },
  actionWrapper: {
    flexShrink: 0,
  },
});
