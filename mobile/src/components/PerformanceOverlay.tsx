import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { Text } from '@/components/atoms';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';
import { useMemoryMonitor } from '@/hooks/usePerformanceMonitor';

interface PerformanceOverlayProps {
  enabled?: boolean;
}

const COLLAPSED_SIZE = 44;
const EXPANDED_WIDTH = 160;
const EXPANDED_HEIGHT = 140;

export function PerformanceOverlay({ enabled = false }: PerformanceOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 100 });
  const pan = useRef(new Animated.ValueXY(position)).current;

  const { fps, avgFps, minFps, isLow } = useFPSMonitor(enabled);
  const { memoryMB, isLowMemory } = useMemoryMonitor(enabled);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        const newX = position.x + gesture.dx;
        const newY = position.y + gesture.dy;
        setPosition({ x: newX, y: newY });
        pan.setOffset({ x: newX, y: newY });
        pan.setValue({ x: 0, y: 0 });
      },
    })
  ).current;

  useEffect(() => {
    pan.setOffset(position);
    pan.setValue({ x: 0, y: 0 });
  }, []);

  if (!enabled) return null;

  const fpsColor = isLow ? '#ef4444' : avgFps < 58 ? '#f59e0b' : '#22c55e';
  const memoryColor = isLowMemory ? '#ef4444' : '#22c55e';

  if (!isExpanded) {
    return (
      <Animated.View
        style={[
          styles.container,
          styles.collapsed,
          { transform: pan.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={[styles.collapsedButton, { borderColor: fpsColor }]}
          onPress={() => setIsExpanded(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.collapsedText, { color: fpsColor }]}>
            {avgFps}
          </Text>
          <Text style={styles.collapsedLabel}>FPS</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        styles.expanded,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Performance</Text>
        <TouchableOpacity onPress={() => setIsExpanded(false)}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>FPS</Text>
          <Text style={[styles.metricValue, { color: fpsColor }]}>
            {fps}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Avg FPS</Text>
          <Text style={[styles.metricValue, { color: fpsColor }]}>
            {avgFps}
          </Text>
        </View>

        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Min FPS</Text>
          <Text style={[styles.metricValue, { color: minFps < 30 ? '#ef4444' : fpsColor }]}>
            {minFps}
          </Text>
        </View>

        {memoryMB !== null && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Memory</Text>
            <Text style={[styles.metricValue, { color: memoryColor }]}>
              {memoryMB}MB
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: fpsColor }]} />
        <Text style={styles.statusText}>
          {isLow ? 'Low FPS' : 'Smooth'}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 9999,
  },
  collapsed: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
  },
  collapsedButton: {
    width: COLLAPSED_SIZE,
    height: COLLAPSED_SIZE,
    borderRadius: COLLAPSED_SIZE / 2,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapsedText: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  collapsedLabel: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: -2,
  },
  expanded: {
    width: EXPANDED_WIDTH,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  closeButton: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 20,
  },
  metrics: {
    gap: 6,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
});
