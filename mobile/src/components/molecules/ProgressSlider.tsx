import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, TextInput, TouchableOpacity } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { triggerHaptic } from '@/hooks/useHaptic';
import { Text } from '@/components/atoms';
import { useTheme } from '@/themes';
import { SPRINGS } from '@/animations/constants';

interface ProgressSliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  displayMode: 'pages' | 'percentage';
  startLabel?: string;
}

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 8;

export const ProgressSlider = memo(function ProgressSlider({
  min,
  max,
  value,
  onChange,
  displayMode,
  startLabel,
}: ProgressSliderProps) {
  const { theme, themeName } = useTheme();
  const isScholar = themeName === 'scholar';

  const trackWidth = useSharedValue(0);
  const thumbX = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const lastHapticThreshold = useSharedValue(-1);
  const startX = useSharedValue(0);

  const [displayValue, setDisplayValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const range = max - min;

  const valueToPosition = useCallback(
    (val: number, width: number) => {
      if (range === 0) return 0;
      return ((val - min) / range) * width;
    },
    [min, range]
  );

  const positionToValue = useCallback(
    (pos: number, width: number) => {
      if (width === 0) return min;
      const ratio = pos / width;
      return Math.round(min + ratio * range);
    },
    [min, range]
  );

  const valueToPercent = useCallback(
    (val: number) => {
      if (range === 0) return 0;
      return Math.round(((val - min) / range) * 100);
    },
    [min, range]
  );

  const updateDisplayValue = useCallback((newValue: number) => {
    setDisplayValue(newValue);
  }, []);

  useAnimatedReaction(
    () => thumbX.value,
    (currentX) => {
      if (trackWidth.value > 0) {
        const newVal = Math.round(min + (currentX / trackWidth.value) * range);
        const clampedVal = Math.max(min, Math.min(max, newVal));
        runOnJS(updateDisplayValue)(clampedVal);
      }
    },
    [min, max, range]
  );

  useEffect(() => {
    if (trackWidth.value > 0 && !isDragging.value) {
      const newPos = valueToPosition(value, trackWidth.value);
      thumbX.value = withSpring(newPos, SPRINGS.snap);
      setDisplayValue(value);
    }
  }, [value, valueToPosition]);

  const handleThresholdHaptic = useCallback((threshold: number) => {
    if (threshold === 50) {
      triggerHaptic('medium');
    } else {
      triggerHaptic('light');
    }
  }, []);

  const checkHapticThreshold = useCallback(
    (pos: number, width: number) => {
      if (width === 0 || range === 0) return;
      const ratio = pos / width;
      const percent = Math.round(ratio * 100);
      const thresholds = [0, 25, 50, 75, 100];

      for (const threshold of thresholds) {
        if (Math.abs(percent - threshold) <= 2) {
          if (lastHapticThreshold.value !== threshold) {
            lastHapticThreshold.value = threshold;
            handleThresholdHaptic(threshold);
          }
          return;
        }
      }
      lastHapticThreshold.value = -1;
    },
    [range, handleThresholdHaptic, lastHapticThreshold]
  );

  const handleValueChange = useCallback(
    (pos: number, width: number) => {
      const newValue = positionToValue(pos, width);
      onChange(newValue);
    },
    [positionToValue, onChange]
  );

  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      trackWidth.value = width;
      thumbX.value = valueToPosition(value, width);
    },
    [value, valueToPosition, trackWidth, thumbX]
  );

  const handleStartEdit = useCallback(() => {
    const currentVal = displayMode === 'percentage' ? valueToPercent(displayValue) : displayValue;
    setInputValue(currentVal.toString());
    setIsEditing(true);
    triggerHaptic('light');
  }, [displayMode, displayValue, valueToPercent]);

  const handleEndEdit = useCallback(() => {
    setIsEditing(false);
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed)) return;

    let newPage: number;
    if (displayMode === 'percentage') {
      const clampedPercent = Math.max(0, Math.min(100, parsed));
      newPage = Math.round(min + (clampedPercent / 100) * range);
    } else {
      newPage = Math.max(min, Math.min(max, parsed));
    }

    onChange(newPage);
    if (trackWidth.value > 0) {
      thumbX.value = withSpring(valueToPosition(newPage, trackWidth.value), SPRINGS.snap);
    }
  }, [inputValue, displayMode, min, max, range, onChange, valueToPosition, trackWidth, thumbX]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      startX.value = thumbX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const width = trackWidth.value;
      let newX = startX.value + event.translationX;
      newX = Math.max(0, Math.min(width, newX));
      thumbX.value = newX;
      runOnJS(checkHapticThreshold)(newX, width);
    })
    .onEnd(() => {
      'worklet';
      isDragging.value = false;
      const width = trackWidth.value;
      const pos = thumbX.value;
      runOnJS(handleValueChange)(pos, width);
    });

  const tapGesture = Gesture.Tap().onEnd((event) => {
    'worklet';
    const width = trackWidth.value;
    let newX = event.x - THUMB_SIZE / 2;
    newX = Math.max(0, Math.min(width, newX));
    thumbX.value = withSpring(newX, SPRINGS.snap);
    runOnJS(triggerHaptic)('light');
    runOnJS(handleValueChange)(newX, width);
  });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: thumbX.value - THUMB_SIZE / 2 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const formattedDisplay =
    displayMode === 'percentage'
      ? `${valueToPercent(displayValue)}%`
      : `${displayValue}`;

  const tickMarks =
    displayMode === 'percentage'
      ? ['0%', '25%', '50%', '75%', '100%']
      : [
          min.toString(),
          Math.round(min + range * 0.25).toString(),
          Math.round(min + range * 0.5).toString(),
          Math.round(min + range * 0.75).toString(),
          max.toString(),
        ];

  return (
    <View style={styles.container}>
      {/* Editable display value */}
      <TouchableOpacity
        onPress={handleStartEdit}
        activeOpacity={0.7}
        style={{ alignItems: 'center', marginBottom: theme.spacing.sm }}
        accessibilityRole="button"
        accessibilityLabel={`Current progress: ${formattedDisplay}. Tap to edit`}
        accessibilityHint="Opens number input to set exact value"
      >
        {isEditing ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderWidth: 2,
              borderColor: theme.colors.primary,
              borderRadius: isScholar ? theme.radii.sm : theme.radii.lg,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
            }}
          >
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              onBlur={handleEndEdit}
              onSubmitEditing={handleEndEdit}
              keyboardType="number-pad"
              autoFocus
              selectTextOnFocus
              style={{
                fontSize: 32,
                fontWeight: '700',
                color: theme.colors.foreground,
                fontFamily: theme.fonts.body,
                minWidth: 60,
                textAlign: 'center',
                padding: 0,
              }}
            />
            {displayMode === 'percentage' && (
              <Text
                variant="h2"
                style={{ color: theme.colors.foregroundMuted, marginLeft: 2 }}
              >
                %
              </Text>
            )}
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text
                variant="h1"
                style={{
                  fontSize: 42,
                  color: theme.colors.foreground,
                  fontWeight: '700',
                }}
              >
                {formattedDisplay}
              </Text>
            </View>
            {displayMode === 'pages' && (
              <Text
                variant="caption"
                style={{ color: theme.colors.foregroundMuted, marginTop: 2 }}
              >
                of {max} pages
              </Text>
            )}
            <Text
              variant="caption"
              style={{
                color: theme.colors.primary,
                marginTop: theme.spacing.xs,
                fontSize: 11,
              }}
            >
              Tap to edit
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {startLabel && (
        <Text
          variant="caption"
          muted
          style={{
            textAlign: 'center',
            marginBottom: theme.spacing.sm,
          }}
        >
          {startLabel}
        </Text>
      )}

      <GestureDetector gesture={composedGesture}>
        <View
          style={[
            styles.trackContainer,
            { paddingHorizontal: THUMB_SIZE / 2 },
          ]}
          accessible={true}
          accessibilityRole="adjustable"
          accessibilityLabel={displayMode === 'percentage' ? 'Progress percentage' : 'Current page'}
          accessibilityValue={{
            min,
            max,
            now: displayValue,
            text: formattedDisplay,
          }}
          accessibilityHint="Drag to adjust progress or tap to set position"
        >
          <View
            onLayout={handleLayout}
            style={[
              styles.track,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderRadius: isScholar ? theme.radii.sm : TRACK_HEIGHT / 2,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.fill,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: isScholar ? theme.radii.sm : TRACK_HEIGHT / 2,
                },
                fillStyle,
              ]}
            />

            <Animated.View
              style={[
                styles.thumb,
                {
                  backgroundColor: theme.colors.primary,
                  borderRadius: isScholar ? theme.radii.sm : THUMB_SIZE / 2,
                  borderWidth: 3,
                  borderColor: theme.colors.surface,
                  ...theme.shadows.md,
                },
                thumbStyle,
              ]}
            />
          </View>
        </View>
      </GestureDetector>

      <View style={[styles.tickContainer, { marginTop: theme.spacing.sm }]}>
        {tickMarks.map((label, index) => (
          <Text
            key={index}
            variant="caption"
            style={{
              color: theme.colors.foregroundMuted,
              fontSize: 10,
            }}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trackContainer: {
    width: '100%',
    height: THUMB_SIZE + 16,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TRACK_HEIGHT,
  },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    top: -(THUMB_SIZE - TRACK_HEIGHT) / 2,
  },
  tickContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
});
