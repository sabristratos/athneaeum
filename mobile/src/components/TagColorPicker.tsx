import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Pressable, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import { sharedSpacing } from '@/themes/shared';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import { TAG_COLORS, type TagColor } from '@/types/tag';

interface TagColorPickerProps {
  selectedColor: TagColor;
  onSelectColor: (color: TagColor) => void;
}

export function TagColorPicker({
  selectedColor,
  onSelectColor,
}: TagColorPickerProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  return (
    <View style={styles.container}>
      {TAG_COLORS.map((color) => {
        const tagColor = theme.tagColors[color];
        const isSelected = selectedColor === color;

        return (
          <Pressable
            key={color}
            onPress={() => onSelectColor(color)}
            haptic="light"
            activeScale={0.9}
          >
            <View
              style={[
                styles.colorItem,
                {
                  backgroundColor: tagColor.bg,
                  borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: theme.colors.foreground,
                },
              ]}
            >
              {isSelected && (
                <Icon icon={Tick02Icon} size={18} color={tagColor.text} />
              )}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: sharedSpacing.sm,
  },
  colorItem: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
