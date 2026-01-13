import React, { useCallback, useRef, useMemo, useState } from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
  Layout,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { BottomSheet } from './BottomSheet';
import {
  EditionPreviewCard,
  EDITION_INFO,
  CARD_WIDTH,
  CARD_MARGIN,
} from './EditionPreviewCard';
import { useTheme } from '@/themes';
import { themes } from '@/themes/themes';
import { SPRINGS } from '@/animations';
import type { ThemeName } from '@/types/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditionSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
}

function RatingStyleIcon({
  type,
  color,
  size = 16,
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

interface FloatingCalloutProps {
  currentIndex: number;
}

const EDITION_DETAILS: Record<string, { corners: string; fonts: string }> = {
  scholar: { corners: 'Sharp', fonts: 'Classic Serif' },
  dreamer: { corners: 'Soft', fonts: 'Friendly Sans' },
  wanderer: { corners: 'Medium', fonts: 'Warm Serif' },
  midnight: { corners: 'Medium', fonts: 'Elegant Serif' },
};

function FloatingCallout({ currentIndex }: FloatingCalloutProps) {
  const { theme } = useTheme();

  const activeIndex = Math.max(0, Math.min(currentIndex, EDITION_INFO.length - 1));
  const activeEdition = EDITION_INFO[activeIndex];
  const activeTheme = themes[activeEdition.name];
  const details = EDITION_DETAILS[activeEdition.name];

  return (
    <View
      style={[
        styles.floatingCallout,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.lg,
        },
      ]}
    >
      <Animated.View
        key={activeEdition.name}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(100)}
        style={styles.calloutContent}
      >
        <View style={styles.calloutRow}>
          <RatingStyleIcon
            type={activeTheme.icons.rating}
            color={activeTheme.colors.primary}
            size={18}
          />
          <Text
            variant="caption"
            style={{
              color: theme.colors.foreground,
              fontFamily: theme.fonts.body,
              fontSize: 12,
              fontWeight: '600',
            }}
          >
            {activeEdition.ratingLabel}
          </Text>
        </View>
        <Text
          variant="caption"
          style={{
            color: theme.colors.foregroundMuted,
            fontFamily: theme.fonts.body,
            fontSize: 10,
          }}
        >
          {details.corners} corners Â· {details.fonts}
        </Text>
      </Animated.View>
    </View>
  );
}

export function EditionSelectorSheet({ visible, onClose }: EditionSelectorSheetProps) {
  const { theme, themeName, setTheme } = useTheme();
  const scrollX = useSharedValue(0);
  const flatListRef = useRef<FlatList>(null);
  const initialIndex = EDITION_INFO.findIndex((t) => t.name === themeName);
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);

  const handleSelectTheme = useCallback(
    (name: ThemeName) => {
      triggerHaptic('medium');
      setTheme(name);
    },
    [setTheme]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollX.value = event.nativeEvent.contentOffset.x;

      const itemWidth = CARD_WIDTH + CARD_MARGIN * 2;
      const newIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);

      if (newIndex >= 0 && newIndex < EDITION_INFO.length) {
        setCurrentIndex((prev) => {
          if (prev !== newIndex) {
            triggerHaptic('light');
          }
          return newIndex;
        });
      }
    },
    [scrollX]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: (typeof EDITION_INFO)[0]; index: number }) => {
      const previewTheme = themes[item.name];
      const isActive = themeName === item.name;

      return (
        <EditionPreviewCard
          editionInfo={item}
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

  const initialScrollIndex = useMemo(
    () => EDITION_INFO.findIndex((t) => t.name === themeName),
    [themeName]
  );

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Choose Your Edition"
      contentStyle={{ paddingHorizontal: 0 }}
      maxHeight="90%"
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={EDITION_INFO}
          renderItem={renderItem}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN,
          }}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialScrollIndex >= 0 ? initialScrollIndex : 0}
        />

        <FloatingCallout currentIndex={currentIndex} />

        <View style={[styles.pagination, { marginTop: theme.spacing.md }]}>
          {EDITION_INFO.map((item, index) => {
            const isActive = index === currentIndex;
            return (
              <Animated.View
                key={item.name}
                layout={Layout.springify().damping(22).stiffness(140)}
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
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  floatingCallout: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 160,
  },
  calloutContent: {
    alignItems: 'center',
    gap: 4,
  },
  calloutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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

