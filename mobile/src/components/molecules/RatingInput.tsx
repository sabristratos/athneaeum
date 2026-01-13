import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  Easing,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text, RatingIcon, type RatingIconType } from '@/components/atoms';
import { RatingCelebration, type RatingCelebrationRef } from './RatingCelebration';
import { useTheme } from '@/themes';
import { SPRINGS, CELEBRATION } from '@/animations';

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  readonly?: boolean;
  step?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const sizeMap = {
  sm: { icon: 20, gap: 2 },
  md: { icon: 28, gap: 4 },
  lg: { icon: 36, gap: 6 },
};

type CelebrationType = 'glint' | 'bloom' | 'spin' | 'glow';

const ICON_TO_CELEBRATION: Record<RatingIconType, CelebrationType> = {
  star: 'glint',
  heart: 'bloom',
  compass: 'spin',
  moon: 'glow',
};

interface AnimatedRatingIconProps {
  index: number;
  value: number;
  previousValue: number;
  iconSize: number;
  fillColor: string;
  emptyColor: string;
  iconType: RatingIconType;
  isCelebrating: boolean;
  glintProgress: SharedValue<number>;
  glowOpacity: SharedValue<number>;
  celebrationScale: SharedValue<number>;
  celebrationRotation: SharedValue<number>;
}

function AnimatedRatingIconWrapper({
  index,
  value,
  previousValue,
  iconSize,
  fillColor,
  emptyColor,
  iconType,
  isCelebrating,
  glintProgress,
  glowOpacity,
  celebrationScale,
  celebrationRotation,
}: AnimatedRatingIconProps) {
  const scale = useSharedValue(1);
  const fillPercent = Math.max(0, Math.min(1, value - index));
  const wasFilled = previousValue > index;
  const isFilled = value > index;
  const isLastIcon = index === 4;
  const celebrationType = ICON_TO_CELEBRATION[iconType];

  useEffect(() => {
    if (isFilled && !wasFilled) {
      const delay = index * 30;
      scale.value = withDelay(
        delay,
        withSequence(
          withSpring(1.3, SPRINGS.bouncy),
          withSpring(1, SPRINGS.responsive)
        )
      );
    } else if (!isFilled && wasFilled) {
      scale.value = withSequence(
        withSpring(0.8, SPRINGS.snappy),
        withSpring(1, SPRINGS.responsive)
      );
    }
  }, [isFilled, wasFilled, index, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseScale = scale.value;
    const celebScale = isLastIcon && isCelebrating ? celebrationScale.value : 1;
    const rotation = isLastIcon && isCelebrating && celebrationType === 'spin'
      ? celebrationRotation.value
      : 0;

    return {
      transform: [
        { scale: baseScale * celebScale },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <RatingIcon
        type={iconType}
        size={iconSize}
        fillPercent={fillPercent}
        fillColor={fillColor}
        emptyColor={emptyColor}
        glintProgress={isLastIcon && celebrationType === 'glint' ? glintProgress : undefined}
        glowOpacity={isLastIcon && celebrationType === 'glow' ? glowOpacity : undefined}
      />
    </Animated.View>
  );
}

export function RatingInput({
  value,
  onChange,
  max = 5,
  size = 'md',
  showValue = true,
  readonly = false,
  step = 0.25,
  accessibilityLabel,
  accessibilityHint,
}: RatingInputProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const reducedMotion = useReducedMotion();
  const { icon: iconSize, gap } = sizeMap[size];
  const safeValue = typeof value === 'number' ? value : (typeof value === 'string' ? parseFloat(value) || 0 : 0);
  const previousValueRef = useRef(safeValue);
  const [currentRating, setCurrentRating] = useState(safeValue);
  const containerWidthRef = useRef(0);
  const previousHapticRatingRef = useRef(safeValue);
  const isDraggingRef = useRef(false);

  const ratingIcon = theme.icons.rating as RatingIconType;
  const fillColor = ratingIcon === 'heart' ? theme.colors.accent : theme.colors.primary;
  const emptyColor = isScholar ? theme.colors.surfaceHover : theme.colors.border;

  const confettiRef = useRef<RatingCelebrationRef>(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const celebrationCooldownRef = useRef(false);
  const previousMaxCheckRef = useRef(safeValue >= max);

  const celebrationScale = useSharedValue(1);
  const celebrationRotation = useSharedValue(0);
  const glintProgress = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  const celebrationType = ICON_TO_CELEBRATION[ratingIcon];

  const triggerCelebration = useCallback(() => {
    if (celebrationCooldownRef.current || readonly) return;

    celebrationCooldownRef.current = true;
    triggerHaptic('success');

    if (reducedMotion) {
      confettiRef.current?.trigger();
      setTimeout(() => {
        celebrationCooldownRef.current = false;
      }, CELEBRATION.cooldownMs);
      return;
    }

    setIsCelebrating(true);
    confettiRef.current?.trigger();

    const onComplete = () => {
      setIsCelebrating(false);
      setTimeout(() => {
        celebrationCooldownRef.current = false;
      }, CELEBRATION.cooldownMs);
    };

    switch (celebrationType) {
      case 'bloom':
        celebrationScale.value = withSequence(
          withSpring(CELEBRATION.bloomScale, SPRINGS.soft),
          withSpring(CELEBRATION.bloomSettleScale, SPRINGS.bouncy),
          withSpring(1, SPRINGS.gentle, () => runOnJS(onComplete)())
        );
        break;

      case 'spin':
        celebrationRotation.value = withSequence(
          withTiming(15, { duration: 50 }),
          withTiming(-10, { duration: 40 }),
          withTiming(CELEBRATION.spinDegrees, {
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
          }, () => runOnJS(onComplete)())
        );
        setTimeout(() => {
          celebrationRotation.value = 0;
        }, 400);
        break;

      case 'glow':
        celebrationScale.value = withSequence(
          withSpring(1.15, SPRINGS.soft),
          withSpring(1, SPRINGS.gentle)
        );
        glowOpacity.value = withSequence(
          withTiming(0.6, { duration: 100 }),
          withTiming(CELEBRATION.glowOpacity, { duration: 150 }),
          withTiming(0, { duration: 150 }, () => runOnJS(onComplete)())
        );
        break;

      case 'glint':
      default:
        glintProgress.value = 0;
        glintProgress.value = withTiming(1, {
          duration: CELEBRATION.glintDuration,
          easing: Easing.out(Easing.cubic),
        }, () => runOnJS(onComplete)());
        celebrationScale.value = withSequence(
          withDelay(100, withSpring(1.1, SPRINGS.snappy)),
          withSpring(1, SPRINGS.gentle)
        );
        break;
    }
  }, [celebrationType, celebrationScale, celebrationRotation, glintProgress, glowOpacity, readonly, reducedMotion]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setCurrentRating(safeValue);
      previousHapticRatingRef.current = safeValue;
    }
  }, [safeValue]);

  const handleGestureUpdate = useCallback((x: number) => {
    const width = containerWidthRef.current;
    if (width === 0) return;

    const rating = (x / width) * max;
    const clamped = Math.max(0, Math.min(max, rating));
    const newRating = Math.round(clamped / step) * step;

    isDraggingRef.current = true;
    setCurrentRating(newRating);

    const prevWhole = Math.floor(previousHapticRatingRef.current);
    const newWhole = Math.floor(newRating);
    if (newWhole !== prevWhole && newRating > 0) {
      triggerHaptic('light');
    }
    previousHapticRatingRef.current = newRating;
  }, [max, step]);

  const handleGestureEnd = useCallback((x: number) => {
    const width = containerWidthRef.current;
    if (width === 0) return;

    const rating = (x / width) * max;
    const clamped = Math.max(0, Math.min(max, rating));
    const finalRating = Math.round(clamped / step) * step;

    const wasAtMax = previousMaxCheckRef.current;
    const isNowAtMax = finalRating >= max;

    isDraggingRef.current = false;
    previousValueRef.current = finalRating;
    previousMaxCheckRef.current = isNowAtMax;
    onChange(finalRating);

    if (isNowAtMax && !wasAtMax) {
      triggerCelebration();
    }
  }, [max, step, onChange, triggerCelebration]);

  const handleGestureFinalize = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    containerWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  const gesture = useMemo(() => {
    if (readonly) return Gesture.Manual();

    return Gesture.Pan()
      .minDistance(0)
      .onBegin((e) => {
        runOnJS(handleGestureUpdate)(e.x);
      })
      .onUpdate((e) => {
        runOnJS(handleGestureUpdate)(e.x);
      })
      .onEnd((e) => {
        runOnJS(handleGestureEnd)(e.x);
      })
      .onFinalize(() => {
        runOnJS(handleGestureFinalize)();
      });
  }, [readonly, handleGestureUpdate, handleGestureEnd, handleGestureFinalize]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      const timer = setTimeout(() => {
        previousValueRef.current = currentRating;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentRating]);

  const formatRating = (rating: number): string => {
    if (rating % 1 === 0) {
      return rating.toString();
    }
    return rating.toFixed(2).replace(/\.?0+$/, '');
  };

  const defaultLabel = readonly
    ? `Rating: ${currentRating.toFixed(1)} out of ${max}`
    : accessibilityLabel ?? 'Rating input';
  const defaultHint = readonly
    ? undefined
    : accessibilityHint ?? 'Drag left or right to set rating';

  const content = (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap }}
      onLayout={handleLayout}
      accessible={true}
      accessibilityRole={readonly ? 'text' : 'adjustable'}
      accessibilityLabel={defaultLabel}
      accessibilityHint={defaultHint}
      accessibilityValue={{
        min: 0,
        max,
        now: currentRating,
        text: `${currentRating.toFixed(1)} out of ${max}`,
      }}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fillPercent = Math.max(0, Math.min(1, currentRating - index));

        if (readonly) {
          return (
            <RatingIcon
              key={index}
              type={ratingIcon}
              size={iconSize}
              fillPercent={fillPercent}
              fillColor={fillColor}
              emptyColor={emptyColor}
            />
          );
        }

        return (
          <View key={index} style={{ padding: 2 }}>
            <AnimatedRatingIconWrapper
              index={index}
              value={currentRating}
              previousValue={previousValueRef.current}
              iconSize={iconSize}
              fillColor={fillColor}
              emptyColor={emptyColor}
              iconType={ratingIcon}
              isCelebrating={isCelebrating}
              glintProgress={glintProgress}
              glowOpacity={glowOpacity}
              celebrationScale={celebrationScale}
              celebrationRotation={celebrationRotation}
            />
          </View>
        );
      })}

      {showValue && currentRating > 0 && (
        <Text
          variant="body"
          style={{
            marginLeft: 8,
            color: theme.colors.foregroundMuted,
            fontFamily: theme.fonts.body,
            minWidth: 32,
          }}
        >
          {formatRating(currentRating)}
        </Text>
      )}
    </View>
  );

  if (readonly) {
    return content;
  }

  const estimatedWidth = max * (iconSize + gap + 4);

  return (
    <View style={{ position: 'relative' }}>
      <GestureDetector gesture={gesture}>
        {content}
      </GestureDetector>
      <RatingCelebration ref={confettiRef} containerWidth={estimatedWidth} />
    </View>
  );
}
