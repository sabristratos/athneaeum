import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { Theme, ThemeName } from '@/types/theme';

interface EditionTileProps {
  name: ThemeName;
  label: string;
  description: string;
  previewTheme: Theme;
  isActive: boolean;
  onPress: () => void;
}

function RatingIconPreview({
  type,
  color,
  size = 14,
}: {
  type: 'star' | 'heart' | 'compass' | 'moon';
  color: string;
  size?: number;
}) {
  const paths: Record<string, string> = {
    star: 'M11.109 3.74829C11.48 3.02037 12.52 3.02037 12.891 3.74829L15.0785 8.0407C15.2237 8.32561 15.4964 8.5239 15.8122 8.5742L20.5671 9.33147C21.373 9.45983 21.6941 10.4474 21.1178 11.0252L17.7138 14.4383C17.4883 14.6644 17.3844 14.9846 17.4341 15.3001L18.1843 20.0635C18.3114 20.8702 17.4703 21.4808 16.7426 21.1102L12.4539 18.9254C12.1687 18.7801 11.8313 18.7801 11.5461 18.9254L7.25739 21.1102C6.52973 21.4808 5.68859 20.8702 5.81565 20.0635L6.56594 15.3001C6.61562 14.9846 6.51167 14.6644 6.28617 14.4383L2.88217 11.0252C2.3059 10.4474 2.62703 9.45983 3.43294 9.33147L8.18782 8.5742C8.50362 8.5239 8.77632 8.32561 8.92151 8.0407L11.109 3.74829Z',
    heart: 'M12 20.5C12 20.5 2 14.5 2 8.69444C2 5.82563 4.10526 3.5 7 3.5C8.5 3.5 10 4 12 6C14 4 15.5 3.5 17 3.5C19.8947 3.5 22 5.82563 22 8.69444C22 14.5 12 20.5 12 20.5Z',
    compass: 'M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z',
    moon: 'M20.5 14.469C19.3635 15.0758 18.0654 15.4199 16.687 15.4199C12.2097 15.4199 8.58014 11.7903 8.58014 7.31302C8.58014 5.9346 8.92416 4.63654 9.53102 3.5C5.50093 4.44451 2.5 8.0617 2.5 12.3798C2.5 17.4167 6.58325 21.5 11.6202 21.5C15.9383 21.5 19.5555 18.4991 20.5 14.469Z',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={paths[type]} fill={color} />
    </Svg>
  );
}

export function EditionTile({
  name,
  label,
  description,
  previewTheme,
  isActive,
  onPress,
}: EditionTileProps) {
  const { theme: currentTheme } = useTheme();

  const colorSwatches = [
    previewTheme.colors.primary,
    previewTheme.colors.canvas,
    previewTheme.colors.surface,
    previewTheme.colors.accent,
  ];

  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.container,
          {
            backgroundColor: currentTheme.colors.surface,
            borderRadius: currentTheme.radii.lg,
            borderWidth: isActive ? 2 : 1,
            borderColor: isActive ? currentTheme.colors.primary : currentTheme.colors.border,
          },
        ]}
      >
        {isActive && (
          <View style={styles.checkmark}>
            <Icon
              icon={CheckmarkCircle02Icon}
              size={20}
              color={currentTheme.colors.primary}
            />
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.swatchRow}>
            {colorSwatches.map((color, index) => (
              <View
                key={index}
                style={[
                  styles.swatch,
                  {
                    backgroundColor: color,
                    borderRadius: currentTheme.radii.xs,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text
                variant="label"
                style={{
                  color: currentTheme.colors.foreground,
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                {label}
              </Text>
              <RatingIconPreview
                type={previewTheme.icons.rating}
                color={previewTheme.colors.primary}
                size={16}
              />
            </View>
            <Text
              variant="caption"
              style={{
                color: currentTheme.colors.foregroundMuted,
                fontSize: 13,
              }}
            >
              {description}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.previewBar,
            {
              backgroundColor: previewTheme.colors.canvas,
              borderBottomLeftRadius: currentTheme.radii.lg - 1,
              borderBottomRightRadius: currentTheme.radii.lg - 1,
            },
          ]}
        >
          <View
            style={[
              styles.miniButton,
              {
                backgroundColor: previewTheme.colors.primary,
                borderRadius: previewTheme.radii.sm,
              },
            ]}
          />
          <View style={styles.miniRating}>
            {[1, 2, 3, 4, 5].map((i) => (
              <RatingIconPreview
                key={i}
                type={previewTheme.icons.rating}
                color={i <= 4 ? previewTheme.colors.primary : previewTheme.colors.borderMuted}
                size={12}
              />
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  swatch: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  info: {
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  miniButton: {
    width: 60,
    height: 20,
  },
  miniRating: {
    flexDirection: 'row',
    gap: 3,
  },
});
