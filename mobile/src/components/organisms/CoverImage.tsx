import React, { useState, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { TIMING } from '@/animations/constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { coverSizes, sharedSpacing } from '@/themes/shared';
import { useReducedMotion } from 'react-native-reanimated';

type CoverSize = 'sm' | 'md' | 'lg' | 'hero' | 'stack' | 'custom';

interface CoverImageProps {
  uri?: string | null;
  size?: CoverSize;
  width?: number;
  height?: number;
  fallbackText?: string;
  accessibilityLabel?: string;
}

const sizeMap = {
  sm: { width: coverSizes.sm.width, height: coverSizes.sm.height },
  md: { width: coverSizes.md.width, height: coverSizes.md.height },
  lg: { width: coverSizes.lg.width + sharedSpacing.md + sharedSpacing.xs, height: (coverSizes.lg.height) + 30 },
  hero: { width: coverSizes.xl.width + sharedSpacing.md + sharedSpacing.xs, height: coverSizes.xl.height + 30 },
  stack: { width: coverSizes.stack.width, height: coverSizes.stack.height },
};

interface ShimmerPlaceholderProps {
  width: number;
  height: number;
  borderRadius: number;
  baseColor: string;
  highlightColor: string;
}

const ShimmerPlaceholder = memo(function ShimmerPlaceholder({
  width,
  height,
  borderRadius,
  baseColor,
  highlightColor,
}: ShimmerPlaceholderProps) {
  const reducedMotion = useReducedMotion();
  const translateX = useSharedValue(-width);

  React.useEffect(() => {
    if (reducedMotion) return;
    translateX.value = withRepeat(
      withTiming(width, { ...TIMING.shimmer, easing: Easing.linear }),
      -1,
      false
    );
  }, [width, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (reducedMotion) {
    return (
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: baseColor,
          borderRadius,
        }}
      />
    );
  }

  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        backgroundColor: baseColor,
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFillObject, animatedStyle]}>
        <LinearGradient
          colors={[baseColor, highlightColor, baseColor]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: width * 2, height: '100%' }}
        />
      </Animated.View>
    </View>
  );
});

export function CoverImage({
  uri,
  size = 'md',
  width: customWidth,
  height: customHeight,
  fallbackText = 'No Cover',
  accessibilityLabel = 'Book cover',
}: CoverImageProps) {
  const { theme, themeName } = useTheme();
  const [isLoading, setIsLoading] = useState(!!uri);
  const isScholar = themeName === 'scholar';
  const dimensions = size === 'custom'
    ? { width: customWidth ?? 100, height: customHeight ?? 150 }
    : sizeMap[size];

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
  }, []);

  const borderRadius = isScholar ? theme.radii.sm : theme.radii.lg;

  const containerStyle = {
    width: dimensions.width,
    height: dimensions.height,
    borderRadius,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.surfaceAlt,
    ...(isScholar
      ? {
          borderWidth: 1,
          borderColor: theme.colors.border,
          ...theme.shadows.md,
        }
      : {
          ...theme.shadows.sm,
        }),
  };

  const vignetteStyle = isScholar
    ? {
        ...StyleSheet.absoluteFillObject,
        borderRadius,
        borderWidth: size === 'hero' ? 3 : 2,
        borderColor: theme.colors.overlayDark,
      }
    : null;

  const glowStyle =
    !isScholar && size === 'hero'
      ? {
          position: 'absolute' as const,
          top: -sharedSpacing.sm,
          left: -sharedSpacing.sm,
          right: -sharedSpacing.sm,
          bottom: -sharedSpacing.sm,
          borderRadius: borderRadius + sharedSpacing.sm,
          backgroundColor: theme.colors.tintAccent,
          opacity: 0.6,
        }
      : null;

  if (!uri) {
    return (
      <View
        style={{ position: 'relative' }}
        accessible={true}
        accessibilityLabel={`${accessibilityLabel} - ${fallbackText}`}
        accessibilityRole="image"
      >
        {glowStyle && <View style={glowStyle} />}
        <View
          style={[
            containerStyle,
            {
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text
            variant="caption"
            muted
            style={{ textAlign: 'center', paddingHorizontal: sharedSpacing.xs }}
          >
            {fallbackText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{ position: 'relative' }}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      {glowStyle && <View style={glowStyle} />}
      <View style={containerStyle}>
        {isLoading && (
          <ShimmerPlaceholder
            width={dimensions.width}
            height={dimensions.height}
            borderRadius={borderRadius}
            baseColor={theme.colors.surfaceAlt}
            highlightColor={theme.colors.surface}
          />
        )}
        <Image
          source={{ uri }}
          style={{
            width: '100%',
            height: '100%',
          }}
          contentFit="cover"
          transition={300}
          onLoad={handleLoad}
          onError={handleError}
          cachePolicy="memory-disk"
        />
        {vignetteStyle && <View style={vignetteStyle} />}
      </View>
    </View>
  );
}
