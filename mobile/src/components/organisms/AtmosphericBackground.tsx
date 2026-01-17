import React, { useMemo } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/themes';
import { useCoverColor } from '@/hooks/useCoverColor';
import { hexToRgb } from '@/utils/colorUtils';

export interface AtmosphericBackgroundProps {
  bookId: number | string;
  coverUrl: string | null | undefined;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowOpacity?: number;
  isNightMode?: boolean;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function AtmosphericBackground({
  bookId,
  coverUrl,
  children,
  style,
  glowOpacity = 0.4,
  isNightMode = false,
}: AtmosphericBackgroundProps) {
  const { theme, themeName } = useTheme();
  const { color: extractedColor } = useCoverColor(bookId, coverUrl);

  const isDynamicTheme = themeName === 'dynamic';
  const effectiveOpacity = isNightMode ? glowOpacity * 0.6 : glowOpacity;

  const gradientColors = useMemo(() => {
    if (!extractedColor) {
      return isDynamicTheme
        ? ['transparent', 'transparent']
        : [theme.colors.canvas, theme.colors.canvas];
    }

    const rgb = hexToRgb(extractedColor);
    if (!rgb) {
      return isDynamicTheme
        ? ['transparent', 'transparent']
        : [theme.colors.canvas, theme.colors.canvas];
    }

    const [r, g, b] = rgb;
    const colorWithOpacity = `rgba(${r}, ${g}, ${b}, ${effectiveOpacity})`;

    return [colorWithOpacity, isDynamicTheme ? 'transparent' : theme.colors.canvas];
  }, [extractedColor, theme.colors.canvas, effectiveOpacity, isDynamicTheme]);

  const opacity = useSharedValue(extractedColor ? 1 : 0);

  React.useEffect(() => {
    opacity.value = withTiming(extractedColor ? 1 : 0, { duration: 300 });
  }, [extractedColor, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const containerBgColor = isDynamicTheme ? 'transparent' : theme.colors.canvas;

  return (
    <View style={[styles.container, { backgroundColor: containerBgColor }, style]}>
      {extractedColor && (
        <Animated.View style={[styles.gradientContainer, animatedStyle]}>
          <LinearGradient
            colors={gradientColors as [string, string]}
            locations={[0, 0.7]}
            style={styles.gradient}
          />
          <BlurView
            intensity={20}
            tint={theme.isDark ? 'dark' : 'light'}
            style={styles.blur}
          />
        </Animated.View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  gradientContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  gradient: {
    flex: 1,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
