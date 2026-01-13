import React from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { Pressable, Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import type { Tag, TagColor } from '@/types/tag';

export interface TagChipProps {
  tag: Tag;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  showRemove?: boolean;
  showCount?: boolean;
  disabled?: boolean;
}

const sizeMap = {
  sm: {
    paddingH: sharedSpacing.sm,
    paddingV: sharedSpacing.xs,
    fontSize: 12,
    iconSize: 12,
  },
  md: {
    paddingH: sharedSpacing.sm + sharedSpacing.xs,
    paddingV: sharedSpacing.xs + sharedSpacing.xxs,
    fontSize: 14,
    iconSize: 14,
  },
};

export function TagChip({
  tag,
  selected = false,
  onPress,
  onLongPress,
  onRemove,
  size = 'md',
  showRemove = false,
  showCount = false,
  disabled = false,
}: TagChipProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { paddingH, paddingV, fontSize, iconSize } = sizeMap[size];

  const tagColorKey = tag.color as TagColor;
  const tagColor = theme.tagColors[tagColorKey] || theme.tagColors.primary;

  const getColors = () => {
    if (selected) {
      return {
        background: tagColor.bg,
        text: tagColor.text,
        border: 'transparent',
      };
    }

    return {
      background: theme.colors.surface,
      text: theme.colors.foreground,
      border: theme.colors.border,
    };
  };

  const colors = getColors();
  const borderRadius = isScholar ? theme.radii.sm : theme.radii.full;

  const content = (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
          backgroundColor: colors.background,
          borderRadius,
          borderWidth: selected ? 0 : theme.borders.thin,
          borderColor: colors.border,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {!selected && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: tagColor.bg,
              width: size === 'sm' ? 6 : 8,
              height: size === 'sm' ? 6 : 8,
              borderRadius: size === 'sm' ? 3 : 4,
              marginRight: sharedSpacing.xs,
            },
          ]}
        />
      )}
      <RNText
        style={{
          fontSize,
          color: colors.text,
          fontFamily: theme.fonts.body,
          fontWeight: selected ? '600' : '400',
        }}
      >
        {tag.name}
      </RNText>
      {showCount && tag.books_count !== undefined && tag.books_count > 0 && (
        <Text
          style={{
            fontSize: size === 'sm' ? 10 : 12,
            color: selected ? colors.text : theme.colors.foregroundSubtle,
            fontFamily: theme.fonts.body,
            marginLeft: sharedSpacing.xxs,
            opacity: selected ? 0.8 : 1,
          }}
        >
          ({tag.books_count})
        </Text>
      )}
      {showRemove && onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={{ marginLeft: sharedSpacing.xs }}
          haptic="light"
        >
          <Icon
            icon={Cancel01Icon}
            size={iconSize}
            color={colors.text}
          />
        </Pressable>
      )}
    </View>
  );

  if ((onPress || onLongPress) && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        activeScale={0.95}
        activeOpacity={0.9}
        haptic="light"
        style={{ alignSelf: 'flex-start' }}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
  },
  dot: {},
});
