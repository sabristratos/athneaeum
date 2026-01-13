import React from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { useTheme } from '@/themes';
import type { Theme, ThemeName } from '@/types/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH * 0.85;
export const CARD_MARGIN = 8;

interface EditionInfo {
  name: ThemeName;
  label: string;
  description: string;
  ratingLabel: string;
}

export const EDITION_INFO: EditionInfo[] = [
  {
    name: 'scholar',
    label: 'Scholar',
    description: 'Dark Academia',
    ratingLabel: 'Stars',
  },
  {
    name: 'dreamer',
    label: 'Dreamer',
    description: 'Cozy Cottagecore',
    ratingLabel: 'Hearts',
  },
  {
    name: 'wanderer',
    label: 'Wanderer',
    description: 'Desert Explorer',
    ratingLabel: 'Compass',
  },
  {
    name: 'midnight',
    label: 'Midnight',
    description: 'Celestial Library',
    ratingLabel: 'Moons',
  },
];

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

interface EditionPreviewCardProps {
  editionInfo: EditionInfo;
  previewTheme: Theme;
  isActive: boolean;
  onSelect: () => void;
  index: number;
  scrollX: SharedValue<number>;
}

export function EditionPreviewCard({
  editionInfo,
  previewTheme,
  isActive,
  onSelect,
  index,
  scrollX,
}: EditionPreviewCardProps) {
  const { theme: currentTheme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_MARGIN * 2),
      index * (CARD_WIDTH + CARD_MARGIN * 2),
      (index + 1) * (CARD_WIDTH + CARD_MARGIN * 2),
    ];

    const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], 'clamp');

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <Pressable onPress={onSelect}>
        <Animated.View
          style={[
            styles.card,
            {
              width: CARD_WIDTH,
              backgroundColor: previewTheme.colors.canvas,
              borderRadius: previewTheme.radii.xl,
              borderWidth: isActive ? 2 : 1,
              borderColor: isActive ? currentTheme.colors.primary : previewTheme.colors.border,
            },
          ]}
        >
          {isActive && (
            <View style={styles.checkmark}>
              <Icon
                icon={CheckmarkCircle02Icon}
                size={28}
                color={currentTheme.colors.primary}
              />
            </View>
          )}

        <View style={[styles.previewContent, { padding: previewTheme.spacing.md }]}>
          <View
            style={[
              styles.mockBookCard,
              {
                backgroundColor: previewTheme.colors.surface,
                borderRadius: previewTheme.radii.lg,
                padding: previewTheme.spacing.sm,
                borderWidth: previewTheme.borders.thin,
                borderColor: previewTheme.colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.mockCover,
                {
                  backgroundColor: previewTheme.colors.primary,
                  borderRadius: previewTheme.radii.sm,
                },
              ]}
            >
              <View style={styles.coverLines}>
                <View style={[styles.coverLine, { backgroundColor: previewTheme.colors.onPrimary, opacity: 0.3 }]} />
                <View style={[styles.coverLine, styles.coverLineShort, { backgroundColor: previewTheme.colors.onPrimary, opacity: 0.2 }]} />
              </View>
            </View>

            <View style={styles.mockBookInfo}>
              <Text
                variant="label"
                style={{
                  color: previewTheme.colors.foreground,
                  fontFamily: previewTheme.fonts.heading,
                  fontSize: 14,
                }}
                numberOfLines={1}
              >
                The Secret Garden
              </Text>
              <Text
                variant="caption"
                style={{
                  color: previewTheme.colors.foregroundMuted,
                  fontFamily: previewTheme.fonts.body,
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Frances Hodgson Burnett
              </Text>

              <View style={styles.mockRating}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <RatingIconPreview
                    key={i}
                    type={previewTheme.icons.rating}
                    color={i <= 4 ? previewTheme.colors.primary : previewTheme.colors.borderMuted}
                    size={14}
                  />
                ))}
                <Text
                  variant="caption"
                  style={{
                    color: previewTheme.colors.foregroundMuted,
                    fontFamily: previewTheme.fonts.body,
                    fontSize: 10,
                    marginLeft: 6,
                  }}
                >
                  4.0
                </Text>
              </View>

              <View
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: previewTheme.colors.primarySubtle,
                    borderRadius: previewTheme.radii.sm,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{
                    color: previewTheme.colors.primary,
                    fontFamily: previewTheme.fonts.body,
                    fontSize: 9,
                    fontWeight: '600',
                  }}
                >
                  READING
                </Text>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.mockButton,
              {
                backgroundColor: previewTheme.colors.primary,
                borderRadius: previewTheme.radii.md,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{
                color: previewTheme.colors.onPrimary,
                fontFamily: previewTheme.fonts.body,
                fontSize: 12,
                fontWeight: '600',
              }}
            >
              Log Reading Session
            </Text>
          </View>

          <View style={styles.typographySample}>
            <Text
              variant="h3"
              style={{
                color: previewTheme.colors.foreground,
                fontFamily: previewTheme.fonts.heading,
                fontSize: 16,
              }}
            >
              {previewTheme.fonts.heading.split('-')[0]}
            </Text>
            <Text
              variant="body"
              style={{
                color: previewTheme.colors.foregroundMuted,
                fontFamily: previewTheme.fonts.body,
                fontSize: 11,
              }}
            >
              {previewTheme.fonts.body.split('-')[0]} body text
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.labelContainer,
            {
              backgroundColor: previewTheme.colors.surface,
              borderTopWidth: previewTheme.borders.thin,
              borderColor: previewTheme.colors.border,
              padding: previewTheme.spacing.sm,
            },
          ]}
        >
          <Text
            variant="label"
            style={{
              color: previewTheme.colors.foreground,
              fontFamily: previewTheme.fonts.heading,
              textAlign: 'center',
              fontSize: 16,
            }}
          >
            {editionInfo.label}
          </Text>
          <Text
            variant="caption"
            style={{
              color: previewTheme.colors.foregroundMuted,
              fontFamily: previewTheme.fonts.body,
              textAlign: 'center',
              fontSize: 12,
            }}
          >
            {editionInfo.description}
          </Text>
        </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: CARD_MARGIN,
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  previewContent: {
    gap: 12,
  },
  mockBookCard: {
    flexDirection: 'row',
    gap: 12,
  },
  mockCover: {
    width: 60,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLines: {
    gap: 4,
    alignItems: 'center',
  },
  coverLine: {
    height: 2,
    width: 30,
    borderRadius: 1,
  },
  coverLineShort: {
    width: 20,
  },
  mockBookInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  mockRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  mockButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  typographySample: {
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  labelContainer: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
});
