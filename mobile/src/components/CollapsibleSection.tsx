import React, { useState, useCallback, memo } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { SectionHeader } from '@/components/SectionHeader';
import { useTheme } from '@/themes';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  count?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * A collapsible section with animated expand/collapse.
 * Uses Reanimated layout animations for smooth 60fps transitions.
 */
export const CollapsibleSection = memo(function CollapsibleSection({
  title,
  children,
  defaultExpanded = true,
  count,
  action,
}: CollapsibleSectionProps) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View>
      <SectionHeader
        title={title}
        collapsible
        expanded={expanded}
        onToggle={handleToggle}
        count={count}
        action={action}
      />

      {expanded && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={{ marginTop: theme.spacing.md }}
        >
          {children}
        </Animated.View>
      )}
    </View>
  );
});
