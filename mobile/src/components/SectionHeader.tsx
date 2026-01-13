import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { Text, Icon, Pressable } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';

interface SectionHeaderProps {
  title: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  count?: number;
}

function AnimatedChevron({ expanded }: { expanded: boolean }) {
  const { theme } = useTheme();
  const rotation = useSharedValue(expanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withSpring(expanded ? 180 : 0, SPRINGS.responsive);
  }, [expanded, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon
        icon={ArrowDown01Icon}
        size={16}
        color={theme.colors.foregroundMuted}
      />
    </Animated.View>
  );
}

export function SectionHeader({
  title,
  action,
  collapsible = false,
  expanded = true,
  onToggle,
  count,
}: SectionHeaderProps) {
  const { theme } = useTheme();

  const headerContent = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Text variant="h3">{title}</Text>
        {count !== undefined && (
          <Text variant="caption" muted>
            ({count})
          </Text>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        {action && (
          <Pressable onPress={action.onPress} activeOpacity={0.7} haptic="light">
            <Text variant="body" color="primary">
              {action.label}
            </Text>
          </Pressable>
        )}
        {collapsible && <AnimatedChevron expanded={expanded} />}
      </View>
    </View>
  );

  if (collapsible && onToggle) {
    return (
      <Pressable
        onPress={onToggle}
        activeOpacity={0.9}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={`${title}${count !== undefined ? `, ${count} items` : ''}`}
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Tap to collapse section' : 'Tap to expand section'}
      >
        {headerContent}
      </Pressable>
    );
  }

  return headerContent;
}
