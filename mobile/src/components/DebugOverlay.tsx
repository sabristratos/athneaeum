import React, { memo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFPSMonitor } from '@/hooks/useFPSMonitor';

interface DebugOverlayProps {
  enabled?: boolean;
}

/**
 * A floating debug overlay for development builds.
 * Shows FPS counter and can be toggled by tapping.
 *
 * Add to your root component:
 * ```tsx
 * {__DEV__ && <DebugOverlay />}
 * ```
 */
export const DebugOverlay = memo(function DebugOverlay({
  enabled = __DEV__,
}: DebugOverlayProps) {
  const [expanded, setExpanded] = useState(false);
  const { fps, avgFps, minFps, isLow } = useFPSMonitor(enabled);

  if (!enabled) return null;

  const fpsColor = isLow ? '#ff4444' : fps < 58 ? '#ffaa00' : '#44ff44';

  if (!expanded) {
    // Minimized view - just FPS badge
    return (
      <TouchableOpacity
        style={[styles.minimized, { backgroundColor: fpsColor + '33' }]}
        onPress={() => setExpanded(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.fpsText, { color: fpsColor }]}>{fps}</Text>
      </TouchableOpacity>
    );
  }

  // Expanded view
  return (
    <TouchableOpacity
      style={styles.expanded}
      onPress={() => setExpanded(false)}
      activeOpacity={0.9}
    >
      <View style={styles.row}>
        <Text style={styles.label}>FPS:</Text>
        <Text style={[styles.value, { color: fpsColor }]}>{fps}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Avg:</Text>
        <Text style={styles.value}>{avgFps}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Min:</Text>
        <Text style={[styles.value, minFps < 55 && styles.warning]}>
          {minFps}
        </Text>
      </View>
      {isLow && (
        <Text style={styles.warningText}>Performance Issue</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  minimized: {
    position: 'absolute',
    top: 50,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  expanded: {
    position: 'absolute',
    top: 50,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  value: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  fpsText: {
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  warning: {
    color: '#ff4444',
  },
  warningText: {
    color: '#ff4444',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
});
