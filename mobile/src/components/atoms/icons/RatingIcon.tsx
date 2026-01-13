import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, ClipPath, Rect } from 'react-native-svg';
import Animated, { type SharedValue, useAnimatedProps } from 'react-native-reanimated';

export type RatingIconType = 'star' | 'heart' | 'compass' | 'moon';

interface RatingIconProps {
  type: RatingIconType;
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
  glintProgress?: SharedValue<number>;
  glowOpacity?: SharedValue<number>;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

const ICON_PATHS: Record<RatingIconType, { d: string; strokeWidth: number }> = {
  star: {
    d: 'M11.109 3.74829C11.48 3.02037 12.52 3.02037 12.891 3.74829L15.0785 8.0407C15.2237 8.32561 15.4964 8.5239 15.8122 8.5742L20.5671 9.33147C21.373 9.45983 21.6941 10.4474 21.1178 11.0252L17.7138 14.4383C17.4883 14.6644 17.3844 14.9846 17.4341 15.3001L18.1843 20.0635C18.3114 20.8702 17.4703 21.4808 16.7426 21.1102L12.4539 18.9254C12.1687 18.7801 11.8313 18.7801 11.5461 18.9254L7.25739 21.1102C6.52973 21.4808 5.68859 20.8702 5.81565 20.0635L6.56594 15.3001C6.61562 14.9846 6.51167 14.6644 6.28617 14.4383L2.88217 11.0252C2.3059 10.4474 2.62703 9.45983 3.43294 9.33147L8.18782 8.5742C8.50362 8.5239 8.77632 8.32561 8.92151 8.0407L11.109 3.74829Z',
    strokeWidth: 1.5,
  },
  heart: {
    d: 'M12 20.5C12 20.5 2 14.5 2 8.69444C2 5.82563 4.10526 3.5 7 3.5C8.5 3.5 10 4 12 6C14 4 15.5 3.5 17 3.5C19.8947 3.5 22 5.82563 22 8.69444C22 14.5 12 20.5 12 20.5Z',
    strokeWidth: 1.5,
  },
  compass: {
    d: 'M12 2L14 10L22 12L14 14L12 22L10 14L2 12L10 10L12 2Z',
    strokeWidth: 1.5,
  },
  moon: {
    d: 'M20.5 14.469C19.3635 15.0758 18.0654 15.4199 16.687 15.4199C12.2097 15.4199 8.58014 11.7903 8.58014 7.31302C8.58014 5.9346 8.92416 4.63654 9.53102 3.5C5.50093 4.44451 2.5 8.0617 2.5 12.3798C2.5 17.4167 6.58325 21.5 11.6202 21.5C15.9383 21.5 19.5555 18.4991 20.5 14.469Z',
    strokeWidth: 1.5,
  },
};

function GlintOverlay({
  type,
  size,
  glintProgress,
}: {
  type: RatingIconType;
  size: number;
  glintProgress: SharedValue<number>;
}) {
  const { d } = ICON_PATHS[type];

  const animatedRectProps = useAnimatedProps(() => {
    const x = (glintProgress.value * 28) - 4;
    return { x };
  });

  return (
    <View style={{ position: 'absolute', width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Defs>
          <LinearGradient id="glintGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="transparent" stopOpacity="0" />
            <Stop offset="0.5" stopColor="#FFD700" stopOpacity="0.9" />
            <Stop offset="1" stopColor="transparent" stopOpacity="0" />
          </LinearGradient>
          <ClipPath id="iconClip">
            <Path d={d} />
          </ClipPath>
        </Defs>
        <AnimatedRect
          animatedProps={animatedRectProps}
          y="-2"
          width="4"
          height="28"
          fill="url(#glintGradient)"
          clipPath="url(#iconClip)"
        />
      </Svg>
    </View>
  );
}

function GlowOverlay({
  type,
  size,
  fillColor,
  glowOpacity,
}: {
  type: RatingIconType;
  size: number;
  fillColor: string;
  glowOpacity: SharedValue<number>;
}) {
  const { d, strokeWidth } = ICON_PATHS[type];
  const useRoundedJoin = type !== 'compass';
  const useRoundedCap = type === 'moon';

  const animatedPathProps = useAnimatedProps(() => ({
    fillOpacity: glowOpacity.value,
    strokeOpacity: glowOpacity.value,
  }));

  return (
    <View style={{ position: 'absolute', width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <AnimatedPath
          d={d}
          fill={fillColor}
          stroke={fillColor}
          strokeWidth={strokeWidth + 2}
          strokeLinecap={useRoundedCap ? 'round' : undefined}
          strokeLinejoin={useRoundedJoin ? 'round' : undefined}
          animatedProps={animatedPathProps}
        />
      </Svg>
    </View>
  );
}

export function RatingIcon({
  type,
  size,
  fillPercent,
  fillColor,
  emptyColor,
  glintProgress,
  glowOpacity,
}: RatingIconProps) {
  const { d, strokeWidth } = ICON_PATHS[type];
  const useRoundedJoin = type !== 'compass';
  const useRoundedCap = type === 'moon';

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d={d}
          fill={emptyColor}
          stroke={emptyColor}
          strokeWidth={strokeWidth}
          strokeLinecap={useRoundedCap ? 'round' : undefined}
          strokeLinejoin={useRoundedJoin ? 'round' : undefined}
        />
      </Svg>
      {fillPercent > 0 && (
        <View
          style={{
            position: 'absolute',
            width: size * fillPercent,
            height: size,
            overflow: 'hidden',
          }}
        >
          <Svg width={size} height={size} viewBox="0 0 24 24">
            <Path
              d={d}
              fill={fillColor}
              stroke={fillColor}
              strokeWidth={strokeWidth}
              strokeLinecap={useRoundedCap ? 'round' : undefined}
              strokeLinejoin={useRoundedJoin ? 'round' : undefined}
            />
          </Svg>
        </View>
      )}
      {glintProgress && type === 'star' && (
        <GlintOverlay type={type} size={size} glintProgress={glintProgress} />
      )}
      {glowOpacity && type === 'moon' && (
        <GlowOverlay
          type={type}
          size={size}
          fillColor={fillColor}
          glowOpacity={glowOpacity}
        />
      )}
    </View>
  );
}
