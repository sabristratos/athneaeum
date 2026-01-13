import React, { useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Pressable as RNPressable,
} from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { triggerHaptic } from '@/hooks/useHaptic';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { Text, Icon } from '@/components/atoms';
import { BottomSheet } from './BottomSheet';
import { useTheme } from '@/themes';
import { themes } from '@/themes/themes';
import type { ThemeName, Theme } from '@/types/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 80;
const CARD_MARGIN = 8;

interface ThemePreviewSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeInfo {
  name: ThemeName;
  label: string;
  description: string;
}

const THEME_INFO: ThemeInfo[] = [
  {
    name: 'scholar',
    label: 'Scholar',
    description: 'Dark Academia',
  },
  {
    name: 'dreamer',
    label: 'Dreamer',
    description: 'Cozy Cottagecore',
  },
  {
    name: 'wanderer',
    label: 'Wanderer',
    description: 'Desert Explorer',
  },
  {
    name: 'midnight',
    label: 'Midnight',
    description: 'Celestial Library',
  },
];

function MiniRatingIcon({ type, color, size = 12 }: { type: 'star' | 'heart' | 'compass' | 'moon'; color: string; size?: number }) {
  if (type === 'heart') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 20.5C12 20.5 2 14.5 2 8.69444C2 5.82563 4.10526 3.5 7 3.5C8.5 3.5 10 4 12 6C14 4 15.5 3.5 17 3.5C19.8947 3.5 22 5.82563 22 8.69444C22 14.5 12 20.5 12 20.5Z"
          fill={color}
        />
      </Svg>
    );
  }
  if (type === 'compass') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z" fill={color} />
      </Svg>
    );
  }
  if (type === 'moon') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M20.5 14.469C19.3635 15.0758 18.0654 15.4199 16.687 15.4199C12.2097 15.4199 8.58014 11.7903 8.58014 7.31302C8.58014 5.9346 8.92416 4.63654 9.53102 3.5C5.50093 4.44451 2.5 8.0617 2.5 12.3798C2.5 17.4167 6.58325 21.5 11.6202 21.5C15.9383 21.5 19.5555 18.4991 20.5 14.469Z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M11.109 3.74829C11.48 3.02037 12.52 3.02037 12.891 3.74829L15.0785 8.0407C15.2237 8.32561 15.4964 8.5239 15.8122 8.5742L20.5671 9.33147C21.373 9.45983 21.6941 10.4474 21.1178 11.0252L17.7138 14.4383C17.4883 14.6644 17.3844 14.9846 17.4341 15.3001L18.1843 20.0635C18.3114 20.8702 17.4703 21.4808 16.7426 21.1102L12.4539 18.9254C12.1687 18.7801 11.8313 18.7801 11.5461 18.9254L7.25739 21.1102C6.52973 21.4808 5.68859 20.8702 5.81565 20.0635L6.56594 15.3001C6.61562 14.9846 6.51167 14.6644 6.28617 14.4383L2.88217 11.0252C2.3059 10.4474 2.62703 9.45983 3.43294 9.33147L8.18782 8.5742C8.50362 8.5239 8.77632 8.32561 8.92151 8.0407L11.109 3.74829Z"
        fill={color}
      />
    </Svg>
  );
}

interface ThemePreviewCardProps {
  themeInfo: ThemeInfo;
  previewTheme: Theme;
  isActive: boolean;
  onSelect: () => void;
  index: number;
  scrollX: SharedValue<number>;
}

function ThemePreviewCard({
  themeInfo,
  previewTheme,
  isActive,
  onSelect,
  index,
  scrollX,
}: ThemePreviewCardProps) {
  const { theme: currentTheme } = useTheme();

  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + CARD_MARGIN * 2),
      index * (CARD_WIDTH + CARD_MARGIN * 2),
      (index + 1) * (CARD_WIDTH + CARD_MARGIN * 2),
    ];

    const scale = interpolate(scrollX.value, inputRange, [0.92, 1, 0.92], 'clamp');
    const opacity = interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], 'clamp');

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.cardWrapper, animatedStyle]}>
      <RNPressable
        onPress={onSelect}
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
        {/* Selection indicator */}
        {isActive && (
          <View style={styles.checkmark}>
            <Icon
              icon={CheckmarkCircle02Icon}
              size={24}
              color={currentTheme.colors.primary}
            />
          </View>
        )}

        {/* Mini UI Preview */}
        <View style={[styles.previewContent, { padding: previewTheme.spacing.md }]}>
          {/* Mock book card */}
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
            {/* Mock cover */}
            <View
              style={[
                styles.mockCover,
                {
                  backgroundColor: previewTheme.colors.primary,
                  borderRadius: previewTheme.radii.sm,
                },
              ]}
            />
            {/* Mock text */}
            <View style={styles.mockText}>
              <View
                style={[
                  styles.mockTitle,
                  { backgroundColor: previewTheme.colors.foreground },
                ]}
              />
              <View
                style={[
                  styles.mockAuthor,
                  { backgroundColor: previewTheme.colors.foregroundMuted },
                ]}
              />
              {/* Rating icons */}
              <View style={styles.mockRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <MiniRatingIcon
                    key={star}
                    type={previewTheme.icons.rating}
                    color={star <= 4 ? previewTheme.colors.primary : previewTheme.colors.borderMuted}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Mock button */}
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
                fontSize: 10,
              }}
            >
              Continue Reading
            </Text>
          </View>
        </View>

        {/* Theme label */}
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
            }}
          >
            {themeInfo.label}
          </Text>
          <Text
            variant="caption"
            style={{
              color: previewTheme.colors.foregroundMuted,
              fontFamily: previewTheme.fonts.body,
              textAlign: 'center',
              fontSize: 10,
            }}
          >
            {themeInfo.description}
          </Text>
        </View>
      </RNPressable>
    </Animated.View>
  );
}

export function ThemePreviewSheet({ visible, onClose }: ThemePreviewSheetProps) {
  const { theme, themeName, setTheme } = useTheme();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);

  const handleSelectTheme = useCallback(
    (name: ThemeName) => {
      triggerHaptic('light');
      setTheme(name);
    },
    [setTheme]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ThemeInfo; index: number }) => {
      const previewTheme = themes[item.name];
      const isActive = themeName === item.name;

      return (
        <ThemePreviewCard
          themeInfo={item}
          previewTheme={previewTheme}
          isActive={isActive}
          onSelect={() => handleSelectTheme(item.name)}
          index={index}
          scrollX={scrollX}
        />
      );
    },
    [themeName, handleSelectTheme, scrollX]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: CARD_WIDTH + CARD_MARGIN * 2,
      offset: (CARD_WIDTH + CARD_MARGIN * 2) * index,
      index,
    }),
    []
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose Your Aesthetic"
      contentStyle={{ paddingHorizontal: 0 }}
    >
      <FlatList
        ref={flatListRef}
        data={THEME_INFO}
        renderItem={renderItem}
        keyExtractor={(item) => item.name}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN,
        }}
        onScroll={(event) => {
          scrollX.value = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        initialScrollIndex={THEME_INFO.findIndex((t) => t.name === themeName)}
      />

      {/* Pagination dots */}
      <View style={[styles.pagination, { marginTop: theme.spacing.md }]}>
        {THEME_INFO.map((item, index) => {
          const isActive = themeName === item.name;
          return (
            <View
              key={item.name}
              style={[
                styles.dot,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.borderMuted,
                  width: isActive ? 24 : 8,
                },
              ]}
            />
          );
        })}
      </View>
    </BottomSheet>
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
    top: 8,
    right: 8,
    zIndex: 1,
  },
  previewContent: {
    gap: 12,
  },
  mockBookCard: {
    flexDirection: 'row',
    gap: 10,
  },
  mockCover: {
    width: 50,
    height: 75,
  },
  mockText: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  mockTitle: {
    height: 12,
    width: '80%',
    borderRadius: 2,
    opacity: 0.9,
  },
  mockAuthor: {
    height: 8,
    width: '60%',
    borderRadius: 2,
    opacity: 0.5,
  },
  mockRating: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  mockButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  labelContainer: {
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

