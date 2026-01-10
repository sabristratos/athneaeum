import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';
import { coverSizes, sharedSpacing } from '@/themes/shared';
import { useGyroscopeParallax } from '@/hooks/useGyroscopeParallax';

type CoverSize = 'sm' | 'md' | 'lg' | 'hero' | 'stack' | 'custom';

interface CoverImageProps {
  uri?: string | null;
  size?: CoverSize;
  width?: number;
  height?: number;
  fallbackText?: string;
  parallax?: boolean;
  parallaxAngle?: number;
  sharedTransitionTag?: string;
}

const sizeMap = {
  sm: { width: coverSizes.sm.width, height: coverSizes.sm.height },
  md: { width: coverSizes.md.width, height: coverSizes.md.height },
  lg: { width: coverSizes.lg.width + sharedSpacing.md + sharedSpacing.xs, height: (coverSizes.lg.height) + 30 },
  hero: { width: coverSizes.xl.width + sharedSpacing.md + sharedSpacing.xs, height: coverSizes.xl.height + 30 },
  stack: { width: coverSizes.stack.width, height: coverSizes.stack.height },
};

export function CoverImage({
  uri,
  size = 'md',
  width: customWidth,
  height: customHeight,
  fallbackText = 'No Cover',
  parallax = false,
  parallaxAngle = 8,
  sharedTransitionTag,
}: CoverImageProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const dimensions = size === 'custom'
    ? { width: customWidth ?? 100, height: customHeight ?? 150 }
    : sizeMap[size];

  const shouldEnableParallax = parallax &&
    (size === 'lg' || size === 'hero' || size === 'stack') &&
    !sharedTransitionTag &&
    Platform.OS !== 'web';

  const needsAnimatedWrapper = shouldEnableParallax || !!sharedTransitionTag;

  const { animatedStyle } = useGyroscopeParallax({
    enabled: shouldEnableParallax,
    maxAngle: parallaxAngle,
    damping: 20,
    stiffness: 120,
  });

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

  const WrapperComponent = needsAnimatedWrapper ? Animated.View : View;
  const wrapperProps = needsAnimatedWrapper
    ? {
        style: [{ position: 'relative' as const }, shouldEnableParallax && animatedStyle],
        ...(sharedTransitionTag ? { sharedTransitionTag } : {}),
      }
    : { style: { position: 'relative' as const } };

  if (!uri) {
    return (
      <WrapperComponent {...wrapperProps}>
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
      </WrapperComponent>
    );
  }

  return (
    <WrapperComponent {...wrapperProps}>
      {glowStyle && <View style={glowStyle} />}
      <View style={containerStyle}>
        <Image
          source={{ uri }}
          style={{
            width: '100%',
            height: '100%',
          }}
          contentFit="cover"
          transition={200}
        />
        {vignetteStyle && <View style={vignetteStyle} />}
      </View>
    </WrapperComponent>
  );
}
