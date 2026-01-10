import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/Text';
import { useTheme } from '@/themes';

interface InteractiveRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  readonly?: boolean;
  step?: number;
}

const sizeMap = {
  sm: { icon: 20, gap: 2 },
  md: { icon: 28, gap: 4 },
  lg: { icon: 36, gap: 6 },
};

// Star icon for Scholar theme
function StarIcon({
  size,
  fillPercent,
  fillColor,
  emptyColor,
}: {
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={emptyColor}
          stroke={emptyColor}
          strokeWidth={1.5}
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
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={fillColor}
              stroke={fillColor}
              strokeWidth={1.5}
            />
          </Svg>
        </View>
      )}
    </View>
  );
}

// Heart icon for Dreamer theme
function HeartIcon({
  size,
  fillPercent,
  fillColor,
  emptyColor,
}: {
  size: number;
  fillPercent: number;
  fillColor: string;
  emptyColor: string;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
          fill={emptyColor}
          stroke={emptyColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
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
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
              fill={fillColor}
              stroke={fillColor}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      )}
    </View>
  );
}

// Animated wrapper for pop effect
interface AnimatedRatingIconProps {
  index: number;
  value: number;
  previousValue: number;
  iconSize: number;
  fillColor: string;
  emptyColor: string;
  IconComponent: typeof StarIcon | typeof HeartIcon;
}

function AnimatedRatingIcon({
  index,
  value,
  previousValue,
  iconSize,
  fillColor,
  emptyColor,
  IconComponent,
}: AnimatedRatingIconProps) {
  const scale = useSharedValue(1);
  const fillPercent = Math.max(0, Math.min(1, value - index));
  const wasFilled = previousValue > index;
  const isFilled = value > index;

  useEffect(() => {
    // Pop animation when this icon becomes filled
    if (isFilled && !wasFilled) {
      const delay = index * 30; // Stagger effect
      scale.value = withDelay(
        delay,
        withSequence(
          withSpring(1.3, { damping: 8, stiffness: 400 }),
          withSpring(1, { damping: 12, stiffness: 300 })
        )
      );
    } else if (!isFilled && wasFilled) {
      // Shrink when unfilled
      scale.value = withSequence(
        withSpring(0.8, { damping: 15, stiffness: 400 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
    }
  }, [isFilled, wasFilled, index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent
        size={iconSize}
        fillPercent={fillPercent}
        fillColor={fillColor}
        emptyColor={emptyColor}
      />
    </Animated.View>
  );
}

export function InteractiveRating({
  value,
  onChange,
  max = 5,
  size = 'md',
  showValue = true,
  readonly = false,
  step = 0.25,
}: InteractiveRatingProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';
  const { icon: iconSize, gap } = sizeMap[size];
  const previousValueRef = useRef(value);
  const [currentRating, setCurrentRating] = useState(value);
  const containerWidthRef = useRef(0);
  const previousHapticRatingRef = useRef(value);
  const isDraggingRef = useRef(false);

  const ratingIcon = theme.icons.rating;
  const fillColor = ratingIcon === 'heart' ? theme.colors.accent : theme.colors.primary;
  const emptyColor = isScholar ? theme.colors.surfaceHover : theme.colors.border;

  const IconComponent = ratingIcon === 'heart' ? HeartIcon : StarIcon;

  // Sync internal state with prop changes (only when not dragging)
  useEffect(() => {
    if (!isDraggingRef.current) {
      setCurrentRating(value);
      previousHapticRatingRef.current = value;
    }
  }, [value]);

  // Handle gesture start/update - runs on JS thread
  const handleGestureUpdate = useCallback((x: number) => {
    const width = containerWidthRef.current;
    if (width === 0) return;

    const rating = (x / width) * max;
    const clamped = Math.max(0, Math.min(max, rating));
    const newRating = Math.round(clamped / step) * step;

    isDraggingRef.current = true;
    setCurrentRating(newRating);

    // Haptic only when crossing whole number thresholds (1, 2, 3, 4, 5)
    const prevWhole = Math.floor(previousHapticRatingRef.current);
    const newWhole = Math.floor(newRating);
    if (newWhole !== prevWhole && newRating > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    previousHapticRatingRef.current = newRating;
  }, [max, step]);

  // Handle gesture end - runs on JS thread
  const handleGestureEnd = useCallback((x: number) => {
    const width = containerWidthRef.current;
    if (width === 0) return;

    const rating = (x / width) * max;
    const clamped = Math.max(0, Math.min(max, rating));
    const finalRating = Math.round(clamped / step) * step;

    isDraggingRef.current = false;
    previousValueRef.current = finalRating;
    onChange(finalRating);
  }, [max, step, onChange]);

  // Handle gesture finalize (cleanup)
  const handleGestureFinalize = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Handle layout to get container width
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    containerWidthRef.current = event.nativeEvent.layout.width;
  }, []);

  // Combined pan + tap gesture using react-native-gesture-handler
  const gesture = useMemo(() => {
    if (readonly) return Gesture.Manual();

    return Gesture.Pan()
      .minDistance(0) // Respond to taps immediately
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

  // Update previous value ref for animations after state settles
  useEffect(() => {
    if (!isDraggingRef.current) {
      const timer = setTimeout(() => {
        previousValueRef.current = currentRating;
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [currentRating]);

  // Format rating for display
  const formatRating = (rating: number): string => {
    if (rating % 1 === 0) {
      return rating.toString();
    }
    return rating.toFixed(2).replace(/\.?0+$/, '');
  };

  const content = (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap }}
      onLayout={handleLayout}
    >
      {Array.from({ length: max }).map((_, index) => {
        const fillPercent = Math.max(0, Math.min(1, currentRating - index));

        if (readonly) {
          return (
            <IconComponent
              key={index}
              size={iconSize}
              fillPercent={fillPercent}
              fillColor={fillColor}
              emptyColor={emptyColor}
            />
          );
        }

        return (
          <View key={index} style={{ padding: 2 }}>
            <AnimatedRatingIcon
              index={index}
              value={currentRating}
              previousValue={previousValueRef.current}
              iconSize={iconSize}
              fillColor={fillColor}
              emptyColor={emptyColor}
              IconComponent={IconComponent}
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

  return (
    <GestureDetector gesture={gesture}>
      {content}
    </GestureDetector>
  );
}
