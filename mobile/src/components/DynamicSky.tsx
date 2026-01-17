import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  withDelay,
} from 'react-native-reanimated';
import { SPRINGS } from '@/animations';

interface DynamicSkyProps {
  progress: number;
  phase: 'night' | 'dawn' | 'day' | 'dusk';
  isDark: boolean;
  starOpacity: number;
}

interface CloudData {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  blur: number;
}

const SUN_SIZE = 56;
const MOON_SIZE = 48;

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export const DynamicSky = memo(function DynamicSky({
  progress,
  phase,
  isDark,
  starOpacity,
}: DynamicSkyProps) {
  const { width: screenWidth } = Dimensions.get('window');

  const xPosition = useMemo(() => {
    return (progress * 1.2 - 0.1) * screenWidth;
  }, [progress, screenWidth]);

  const yPosition = useMemo(() => {
    const normalizedProgress = progress * 2;
    const parabola = -4 * Math.pow(normalizedProgress - 0.5, 2) + 1;
    const maxHeight = 140;
    const minHeight = 50;
    return minHeight + (1 - parabola) * (maxHeight - minHeight);
  }, [progress]);

  const celestialStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withSpring(xPosition, SPRINGS.gentle) },
      { translateY: withSpring(yPosition, SPRINGS.gentle) },
    ],
  }));

  const isSun = phase === 'day' || phase === 'dawn';
  const showStars = starOpacity > 0;
  const showClouds = phase === 'day' || phase === 'dawn';

  return (
    <View style={styles.container} pointerEvents="none">
      {showStars && <StarsOverlay opacity={starOpacity} />}
      {showClouds && <CloudsOverlay phase={phase} />}

      <Animated.View style={[styles.celestialWrapper, celestialStyle]}>
        {isSun ? <Sun phase={phase} /> : <Moon phase={phase} />}
      </Animated.View>
    </View>
  );
});

interface SunProps {
  phase: 'dawn' | 'day' | 'dusk' | 'night';
}

const Sun = memo(function Sun({ phase }: SunProps) {
  const colors = useMemo(() => {
    switch (phase) {
      case 'dawn':
        return {
          core: '#fff5e6',
          inner: '#ffcc66',
          outer: '#ff9933',
          glow: '#ff6600',
        };
      case 'day':
        return {
          core: '#fffef0',
          inner: '#fff176',
          outer: '#ffeb3b',
          glow: '#ffc107',
        };
      default:
        return {
          core: '#fff5e6',
          inner: '#ffcc66',
          outer: '#ff9933',
          glow: '#ff6600',
        };
    }
  }, [phase]);

  return (
    <View style={styles.sunContainer}>
      <View style={[styles.sunGlowOuter, { backgroundColor: colors.glow }]} />
      <View style={[styles.sunGlowMiddle, { backgroundColor: colors.outer }]} />
      <View style={[styles.sunGlowInner, { backgroundColor: colors.inner }]} />
      <View style={[styles.sunCore, { backgroundColor: colors.core }]} />
    </View>
  );
});

interface MoonProps {
  phase: 'dawn' | 'day' | 'dusk' | 'night';
}

const Moon = memo(function Moon({ phase }: MoonProps) {
  const colors = useMemo(() => {
    if (phase === 'dusk') {
      return {
        surface: '#e8ddd4',
        glow: 'rgba(232, 121, 169, 0.4)',
        craterDark: 'rgba(180, 160, 150, 0.5)',
        craterLight: 'rgba(255, 255, 255, 0.15)',
      };
    }
    return {
      surface: '#e8e4e0',
      glow: 'rgba(200, 220, 255, 0.5)',
      craterDark: 'rgba(160, 170, 180, 0.4)',
      craterLight: 'rgba(255, 255, 255, 0.2)',
    };
  }, [phase]);

  return (
    <View style={styles.moonContainer}>
      <View style={[styles.moonGlow, { backgroundColor: colors.glow }]} />
      <View style={[styles.moonSurface, { backgroundColor: colors.surface }]}>
        <View style={[styles.moonCrater1, { backgroundColor: colors.craterDark }]} />
        <View style={[styles.moonCrater2, { backgroundColor: colors.craterDark }]} />
        <View style={[styles.moonCrater3, { backgroundColor: colors.craterDark }]} />
        <View style={[styles.moonCrater4, { backgroundColor: colors.craterDark }]} />
        <View style={[styles.moonHighlight, { backgroundColor: colors.craterLight }]} />
      </View>
    </View>
  );
});

interface StarsOverlayProps {
  opacity: number;
}

interface StarData {
  id: number;
  left: number;
  top: number;
  size: number;
  baseOpacity: number;
  type: 'small' | 'medium' | 'bright' | 'twinkle';
  color: string;
  delay: number;
}

const STAR_DATA: StarData[] = (() => {
  const random = seededRandom(42);
  const starPositions: StarData[] = [];
  const starCount = 80;

  for (let i = 0; i < starCount; i++) {
    const typeRoll = random();
    let type: StarData['type'];
    let size: number;
    let baseOpacity: number;
    let color: string;

    if (typeRoll < 0.6) {
      type = 'small';
      size = random() * 1.5 + 0.5;
      baseOpacity = random() * 0.4 + 0.3;
      color = '#ffffff';
    } else if (typeRoll < 0.85) {
      type = 'medium';
      size = random() * 1.5 + 1.5;
      baseOpacity = random() * 0.3 + 0.5;
      color = '#ffffff';
    } else if (typeRoll < 0.95) {
      type = 'bright';
      size = random() * 1.5 + 2.5;
      baseOpacity = random() * 0.2 + 0.7;
      const colorRoll = random();
      color = colorRoll < 0.33 ? '#ffe4c4' : colorRoll < 0.66 ? '#e6e6ff' : '#ffffff';
    } else {
      type = 'twinkle';
      size = random() * 1 + 2;
      baseOpacity = 0.9;
      color = '#ffffff';
    }

    starPositions.push({
      id: i,
      left: random() * 100,
      top: random() * 50,
      size,
      baseOpacity,
      type,
      color,
      delay: random() * 2000,
    });
  }

  return starPositions;
})();

const StarsOverlay = memo(function StarsOverlay({ opacity }: StarsOverlayProps) {
  return (
    <View style={[styles.starsContainer, { opacity }]}>
      {STAR_DATA.map((star) =>
        star.type === 'twinkle' ? (
          <TwinklingStar key={star.id} star={star} />
        ) : (
          <View
            key={star.id}
            style={[
              styles.star,
              {
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                opacity: star.baseOpacity,
                backgroundColor: star.color,
                shadowColor: star.color,
                shadowOpacity: star.type === 'bright' ? 0.8 : 0,
                shadowRadius: star.type === 'bright' ? 4 : 0,
              },
            ]}
          />
        )
      )}
    </View>
  );
});

interface TwinklingStarProps {
  star: StarData;
}

const TwinklingStar = memo(function TwinklingStar({ star }: TwinklingStarProps) {
  const opacity = useSharedValue(star.baseOpacity);

  React.useEffect(() => {
    opacity.value = withDelay(
      star.delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000 }),
          withTiming(star.baseOpacity, { duration: 1000 })
        ),
        -1,
        true
      )
    );
  }, [opacity, star.delay, star.baseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.star,
        animatedStyle,
        {
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: star.size,
          height: star.size,
          backgroundColor: star.color,
          shadowColor: '#ffffff',
          shadowOpacity: 0.8,
          shadowRadius: 3,
        },
      ]}
    />
  );
});

interface CloudsOverlayProps {
  phase: 'dawn' | 'day' | 'dusk' | 'night';
}

const CloudsOverlay = memo(function CloudsOverlay({ phase }: CloudsOverlayProps) {
  const clouds = useMemo(() => {
    const random = seededRandom(123);
    const cloudPositions: CloudData[] = [];
    const cloudCount = 5;

    for (let i = 0; i < cloudCount; i++) {
      cloudPositions.push({
        id: i,
        left: random() * 80 + 10,
        top: random() * 25 + 5,
        width: random() * 60 + 40,
        height: random() * 15 + 10,
        opacity: random() * 0.03 + 0.02,
        blur: random() * 10 + 15,
      });
    }

    return cloudPositions;
  }, []);

  const baseOpacity = phase === 'day' ? 1 : 0.6;

  return (
    <View style={[styles.cloudsContainer, { opacity: baseOpacity }]}>
      {clouds.map((cloud) => (
        <View
          key={cloud.id}
          style={[
            styles.cloud,
            {
              left: `${cloud.left}%`,
              top: `${cloud.top}%`,
              width: cloud.width,
              height: cloud.height,
              opacity: cloud.opacity,
              borderRadius: cloud.height / 2,
            },
          ]}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    overflow: 'hidden',
  },
  celestialWrapper: {
    position: 'absolute',
  },
  sunContainer: {
    width: SUN_SIZE,
    height: SUN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunGlowOuter: {
    position: 'absolute',
    width: SUN_SIZE * 1.8,
    height: SUN_SIZE * 1.8,
    borderRadius: SUN_SIZE,
    opacity: 0.15,
  },
  sunGlowMiddle: {
    position: 'absolute',
    width: SUN_SIZE * 1.4,
    height: SUN_SIZE * 1.4,
    borderRadius: SUN_SIZE,
    opacity: 0.25,
  },
  sunGlowInner: {
    position: 'absolute',
    width: SUN_SIZE * 1.15,
    height: SUN_SIZE * 1.15,
    borderRadius: SUN_SIZE,
    opacity: 0.5,
  },
  sunCore: {
    width: SUN_SIZE * 0.85,
    height: SUN_SIZE * 0.85,
    borderRadius: SUN_SIZE,
  },
  moonContainer: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moonGlow: {
    position: 'absolute',
    width: MOON_SIZE * 1.6,
    height: MOON_SIZE * 1.6,
    borderRadius: MOON_SIZE,
    opacity: 0.6,
  },
  moonSurface: {
    width: MOON_SIZE,
    height: MOON_SIZE,
    borderRadius: MOON_SIZE / 2,
    overflow: 'hidden',
  },
  moonCrater1: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 8,
    left: 10,
  },
  moonCrater2: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 26,
    left: 6,
  },
  moonCrater3: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    top: 18,
    left: 28,
  },
  moonCrater4: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    top: 34,
    left: 22,
  },
  moonHighlight: {
    position: 'absolute',
    width: 20,
    height: 30,
    borderRadius: 15,
    top: 4,
    right: 4,
    transform: [{ rotate: '-30deg' }],
  },
  starsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  cloudsContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
});
